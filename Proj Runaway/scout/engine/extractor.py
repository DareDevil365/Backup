"""
extractor.py — Gemini AI-powered data extraction and research
Uses Gemini Flash with Google Search grounding for research.
Supports multiple API keys for rotation to avoid rate limits.
"""
from google import genai
from google.genai import types
import json
import re
import time


# Multi-key rotation: list of (api_key, client) pairs
_clients = []
_current_client_idx = 0


def configure(api_key: str):
    """Initialize with one or more Gemini API keys (comma-separated)."""
    global _clients, _current_client_idx
    _clients = []
    keys = [k.strip() for k in api_key.split(",") if k.strip()]
    for key in keys:
        _clients.append({
            "key": key,
            "client": genai.Client(api_key=key, http_options=types.HttpOptions(timeout=30000)),
            "last_error_time": 0,
        })
    _current_client_idx = 0
    if len(_clients) > 1:
        print(f"    Configured {len(_clients)} API keys for rotation")


def _get_client():
    """Get the current active client, rotating on rate limits."""
    if not _clients:
        return None
    return _clients[_current_client_idx]["client"]


def _rotate_client():
    """Switch to the next API key."""
    global _current_client_idx
    if len(_clients) <= 1:
        return False
    old = _current_client_idx
    _current_client_idx = (_current_client_idx + 1) % len(_clients)
    _clients[old]["last_error_time"] = time.time()
    print(f"    Rotated to API key #{_current_client_idx + 1}")
    return True


# Model — Flash is fast and sufficient for extraction tasks
_MODEL = "gemini-2.0-flash"


def _call_gemini(contents: str, config=None, max_retries: int = 2):
    """
    Call Gemini Flash with automatic model fallback, retry, and API key rotation.
    Returns the response object.
    """
    models = [_MODEL, "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"]
    last_error = None
    keys_tried = 0
    max_key_tries = len(_clients)  # Try each key once

    while keys_tried < max_key_tries:
        client = _get_client()
        if not client:
            raise RuntimeError("No Gemini API keys configured")

        for model_name in models:
            for attempt in range(max_retries):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config
                    )
                    return response
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()

                    if any(x in error_str for x in ["429", "resource_exhausted", "quota", "503", "unavailable"]):
                        # If it is a daily quota or limit 0, don't retry this model, switch to fallback model immediately
                        if "limit: 0" in error_str:
                            print(f"    ⚠ Hard quota limit hit for {model_name}. Trying fallback model...")
                            break  # Break retry loop, try next model/key
                        
                        # Otherwise, wait and retry
                        wait_time = 15 * (attempt + 1)
                        print(f"    Rate limited on {model_name}, waiting {wait_time}s (attempt {attempt+1}/{max_retries})...")
                        time.sleep(wait_time)
                    else:
                        print(f"    Gemini error: {e}")
                        break  # Non-rate-limit error, don't retry
            else:
                # If we exhausted attempts for this model, continue to the next model
                continue
            
            # If we broke out of the attempt loop, continue to the next model
            continue

        # If all models failed for this key, rotate key
        if not _rotate_client():
            break
        keys_tried += 1

    raise last_error


def research(query: str, instruction: str = "") -> dict:
    """
    Use Gemini with Google Search grounding to research a topic — Perplexity-style.
    This searches the web via Google and synthesizes answers with sources.
    
    Args:
        query: The research question / what to look for
        instruction: Additional extraction instructions
    
    Returns:
        dict with: data, summary, sources, raw_response, success, error
    """
    if not _clients:
        return {"data": None, "success": False, "error": "Gemini not configured."}
    
    full_prompt = f"""{query}

{instruction}

IMPORTANT: Return your findings as valid JSON with this structure:
{{
    "summary": "brief text summary of findings",
    "data": [array of objects with the extracted data points],
    "sources": ["list of source URLs you found the data from"],
    "confidence": "high/medium/low",
    "notes": "any caveats or limitations"
}}

Be thorough. Include ALL data points you can find. Use consistent units (INR for Indian prices, kg for weights, percentages for rates).
Return ONLY the JSON, no other text or markdown fences."""

    try:
        response = _call_gemini(
            contents=full_prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            )
        )
        
        raw_text = response.text
        
        # Extract grounding sources from the response metadata
        grounding_sources = []
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                gm = candidate.grounding_metadata
                if hasattr(gm, 'grounding_chunks') and gm.grounding_chunks:
                    for chunk in gm.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            grounding_sources.append({
                                "title": getattr(chunk.web, 'title', ''),
                                "url": getattr(chunk.web, 'uri', ''),
                            })
        
        # Parse the JSON response
        parsed = _parse_json_response(raw_text)
        
        if parsed:
            # Add grounding sources if the model didn't include them
            if grounding_sources and (not parsed.get("sources") or len(parsed.get("sources", [])) == 0):
                parsed["sources"] = [s["url"] for s in grounding_sources if s.get("url")]
            
            return {
                "data": parsed.get("data", parsed),
                "summary": parsed.get("summary", ""),
                "sources": parsed.get("sources", [s["url"] for s in grounding_sources]),
                "grounding_sources": grounding_sources,
                "confidence": parsed.get("confidence", "medium"),
                "notes": parsed.get("notes", ""),
                "raw_response": raw_text,
                "success": True,
                "error": None
            }
        else:
            # Even if JSON parsing failed, return the raw text as useful info
            return {
                "data": None,
                "summary": raw_text[:2000],
                "sources": [s["url"] for s in grounding_sources],
                "grounding_sources": grounding_sources,
                "raw_response": raw_text,
                "success": True,  # The AI responded, just not in JSON
                "error": "Response was not structured JSON, but raw text is available"
            }
        
    except Exception as e:
        return {
            "data": None,
            "raw_response": "",
            "success": False,
            "error": str(e)
        }


def extract(content: str, instruction: str, schema_hint: str = None) -> dict:
    """
    Use Gemini to extract structured data from page content (no search grounding).
    
    Args:
        content: Markdown text from a scraped page
        instruction: What the user wants extracted
        schema_hint: Optional JSON schema hint for output format
    
    Returns:
        dict with keys: data, raw_response, success, error
    """
    if not _clients:
        return {"data": None, "raw_response": "", "success": False, "error": "Gemini not configured."}
    
    max_chars = 80000
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[... content truncated ...]"
    
    prompt = _build_prompt(instruction, content, schema_hint)
    
    try:
        response = _call_gemini(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        raw_text = response.text
        parsed = _parse_json_response(raw_text)
        
        return {
            "data": parsed,
            "raw_response": raw_text,
            "success": parsed is not None,
            "error": None if parsed is not None else "Could not parse JSON from AI response"
        }
        
    except Exception as e:
        return {"data": None, "raw_response": "", "success": False, "error": str(e)}


def analyze_sources(query: str, search_results: list[dict]) -> list[dict]:
    """Use Gemini to rank and evaluate search results for relevance."""
    if not _clients:
        return search_results
    
    results_text = "\n".join([
        f"{i+1}. Title: {r.get('title', 'N/A')}\n   URL: {r.get('url', 'N/A')}\n   Snippet: {r.get('snippet', 'N/A')}"
        for i, r in enumerate(search_results)
    ])
    
    prompt = f"""You are a research analyst. The user needs: "{query}"

Score each result from 0-100 on how likely it contains actual DATA. 
Prefer: pricing pages, rate calculators, comparison tools, official docs.
Deprioritize: news articles, blogs without data, forums.

Search Results:
{results_text}

Return ONLY a JSON array: [{{"index": 1, "score": 85, "reasoning": "..."}}]"""
    
    try:
        response = _call_gemini(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        scores = _parse_json_response(response.text)
        
        if scores and isinstance(scores, list):
            for score_item in scores:
                idx = score_item.get("index", 0) - 1
                if 0 <= idx < len(search_results):
                    search_results[idx]["relevance_score"] = score_item.get("score", 50)
                    search_results[idx]["reasoning"] = score_item.get("reasoning", "")
            search_results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    except Exception:
        pass
    
    return search_results


def merge_extractions(extractions: list[dict], instruction: str) -> dict:
    """Use Gemini to merge data extracted from multiple sources into a unified table."""
    if not _clients:
        return {"data": None, "summary": "AI not configured", "conflicts": []}
    
    sources_text = ""
    for i, ext in enumerate(extractions):
        sources_text += f"\n--- Source {i+1}: {ext.get('source_url', 'Unknown')} ---\n"
        sources_text += json.dumps(ext.get("data", {}), indent=2, default=str)
        sources_text += "\n"
    
    prompt = f"""Merge the following data from multiple sources into one unified dataset.

Goal: {instruction}

Data:
{sources_text}

Return JSON: {{"merged_data": [...], "summary": "...", "conflicts": [...], "sources_used": N}}
Return ONLY valid JSON."""
    
    try:
        response = _call_gemini(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        result = _parse_json_response(response.text)
        if result:
            return result
    except Exception as e:
        return {"data": None, "summary": f"Merge failed: {e}", "conflicts": []}
    
    return {"data": None, "summary": "Could not merge data", "conflicts": []}


def _build_prompt(instruction: str, content: str, schema_hint: str = None) -> str:
    schema_part = f"\n\nDesired output schema:\n{schema_hint}" if schema_hint else ""
    
    return f"""You are a precise data extraction AI. Extract structured data from the following web page content.

TASK: {instruction}
{schema_part}

RULES:
1. Return ONLY valid JSON, no explanations, no markdown code fences
2. If data is not found, return: {{"found": false, "reason": "explanation"}}
3. Include ALL relevant data points
4. Use consistent units (INR for prices, kg for weights, % for percentages)

PAGE CONTENT:
{content}"""


def _parse_json_response(text: str):
    """Extract and parse JSON from an AI response."""
    if not text:
        return None
    
    # Try direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Try to find JSON in code fences or embedded in text
    patterns = [
        r'```json\s*(.*?)\s*```',
        r'```\s*(.*?)\s*```',
        r'(\{[\s\S]*\})',
        r'(\[[\s\S]*\])',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except (json.JSONDecodeError, TypeError):
                continue
    
    return None
