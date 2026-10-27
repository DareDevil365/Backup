"""
deep_extractor.py — Deep price extraction via actual page scraping + multi-source discovery
Research methodology (in order):
  1. Tier 2 consultancy blogs (richest in compiled pricing data)
  2. Tier 1 official company websites
  3. Tier 3 sector reports / Scribd documents
  4. DuckDuckGo search discovery for additional sources
  5. Gemini Flash Google Search grounding (parallel AI research)

Output: 4 core data points per company:
  - Base price (per weight slab)
  - Zone/pincode-based pricing
  - COD charges
  - Volume/scale discounts
"""
import asyncio
import json
import re
import time
import requests
from engine.scraper import fetch_page, close_browser
from engine.sources_db import get_all_source_urls_for_company, get_tiered_urls, COMPARISON_TOOLS
from engine import extractor

PERPLEXITY_API_KEY = ""
PERPLEXITY_MODEL = "sonar"

def configure_perplexity(api_key: str, model: str = "sonar"):
    """Configure Perplexity API key and model at runtime."""
    global PERPLEXITY_API_KEY, PERPLEXITY_MODEL
    PERPLEXITY_API_KEY = api_key
    if model:
        PERPLEXITY_MODEL = model

# ── Focused extraction prompt for the 4 data points ──────────────────────

EXTRACTION_PROMPT = """Extract ALL numerical pricing/rate data for {company} from the page content below.

I need EXACTLY these 4 categories of data. Extract ONLY actual numbers, NOT vague descriptions.

1. BASE PRICE / RATE CARD:
   - Per weight slab: 0-500g, 500g-1kg, 1-5kg, 5-10kg, 10kg+
   - Minimum charge per shipment
   - Additional weight charge per kg (or per 500g)
   - Surface vs Air rates if available

2. ZONE / PINCODE PRICING:
   - Within city / local delivery rate
   - Within state / intra-state rate
   - Metro to metro rate
   - Rest of India / national rate
   - Any zone classification system (Zone A/B/C/D or similar)

3. COD (CASH ON DELIVERY) CHARGES:
   - COD fee as percentage of order value
   - COD minimum flat fee
   - COD remittance cycle (T+X days)
   - Prepaid vs COD price difference

4. VOLUME / SCALE DISCOUNTS:
   - Discount tiers by monthly shipment volume
   - Enterprise/bulk pricing if mentioned
   - Minimum commitment for discounts
   - Any negotiable rate information

RULES:
- Extract ACTUAL NUMBERS in INR (₹) — NOT "varies", "depends on weight", "contact us"
- For rate slabs, extract each slab: e.g. "0-500g: ₹35, 500g-1kg: ₹50"
- For percentages, extract exact %: e.g. "COD: 2.5%" or "COD: ₹50 flat"
- If a range is given (₹30-₹80), include both min and max
- If NO pricing data found, return: {{"no_data": true, "reason": "explanation"}}

Return ONLY valid JSON with descriptive field names. No markdown fences.

PAGE CONTENT:
{content}"""


MERGE_PROMPT = """Merge the following pricing data for {company} from multiple research sources into ONE clean JSON object.

The final object MUST have these sections:
1. "base_price" — rate slabs by weight
2. "zone_pricing" — rates by delivery zone/distance
3. "cod_charges" — COD fees and terms
4. "volume_discounts" — scale discount tiers
5. "other_charges" — fuel surcharge, handling, insurance, etc.
6. "service_type" — courier/aggregator/premium/regional
7. "eta_days" — estimated delivery time

RULES:
- Keep ALL specific numbers — don't average or discard
- When sources conflict, prefer the most specific/detailed data
- Include "data_confidence" field: "high" if multiple sources agree, "medium" if single source, "low" if uncertain
- The "company" field must be set to "{company}"

Source data:
{sources_data}

Return ONLY valid JSON. No markdown fences."""


# ── Discovery functions ──────────────────────────────────────────────

def discover_sources_perplexity(company: str, data_points: list[str]) -> list[dict]:
    """Use Perplexity API to find pages with actual pricing data."""
    if not PERPLEXITY_API_KEY:
        return []

    dp_text = ", ".join(data_points) if data_points else "base shipping rates, COD charges, zone pricing, volume discounts"

    prompt = f"""Find URLs of web pages that contain ACTUAL NUMERICAL pricing data for {company} courier/logistics company in India.

I need pages showing specific prices in INR for: {dp_text}

Good sources:
- Blog articles on clickpost.ai, shiprocket.in, wareiq.com that list rate slabs
- Rate calculators and shipping cost estimators
- Scribd documents with rate cards
- Official pricing/rate pages

DO NOT include: generic homepages, news articles, job pages, social media.

Return as JSON array: [{{"url": "...", "title": "...", "data_available": "..."}}]
Return ONLY the JSON array."""

    try:
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": PERPLEXITY_MODEL,
            "messages": [
                {"role": "system", "content": "You find web pages with specific numerical pricing data. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
        }

        resp = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers, json=payload, timeout=30
        )

        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = extractor._parse_json_response(content)
            if isinstance(parsed, list):
                return [s for s in parsed if isinstance(s, dict) and s.get("url")]
            citations = resp.json().get("citations", [])
            if citations:
                return [{"url": c, "title": c, "data_available": "Perplexity citation"} for c in citations]
        else:
            print(f"    Perplexity API error: {resp.status_code} - {resp.text[:200]}")
    except Exception as e:
        print(f"    Perplexity discovery failed: {e}")

    return []


def discover_sources_duckduckgo(company: str, data_points: list[str]) -> list[dict]:
    """Fallback: use DuckDuckGo to find pricing pages when Perplexity is unavailable."""
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        return []

    dp_text = " ".join(data_points[:3]) if data_points else "shipping rates charges pricing"
    queries = [
        f"{company} courier charges rates India 2024 2025",
        f"{company} shipping rate card COD charges",
        f"{company} logistics pricing per kg India",
    ]

    results = []
    seen_urls = set()

    with DDGS() as ddgs:
        for q in queries:
            try:
                hits = list(ddgs.text(q, max_results=5))
                for hit in hits:
                    url = hit.get("href", "")
                    if url and url not in seen_urls:
                        # Filter out irrelevant pages
                        url_lower = url.lower()
                        skip = any(x in url_lower for x in [
                            "linkedin.", "facebook.", "twitter.", "youtube.",
                            "glassdoor.", "ambitionbox.", "naukri.", "indeed.",
                        ])
                        if not skip:
                            seen_urls.add(url)
                            results.append({
                                "url": url,
                                "title": hit.get("title", ""),
                                "data_available": hit.get("body", "")[:200],
                            })
            except Exception as e:
                print(f"    DuckDuckGo search failed for '{q}': {e}")
                continue

    return results[:8]  # Max 8 discovered URLs


# ── Main research function ──────────────────────────────────────────

def deep_research_company(
    company: str,
    data_points: list[str],
    instruction: str = "",
    origin_city: str = None,
    dest_city: str = None,
    max_scrape: int = 8,
    progress_cb=None
) -> dict:
    """
    Deep research a company using tiered methodology:
    1. Scrape curated sources (blogs first — richest data)
    2. Discover new sources via Perplexity or DuckDuckGo
    3. AI research via Gemini Google Search grounding
    4. Extract pricing from all scraped pages
    5. Merge into standardized format

    Returns: {company, data, sources, sources_scraped, sources_tried, success, error}
    """
    dp_text = ", ".join(data_points)
    all_urls = []
    discovered_sources = []
    sources_tried = []  # Track every URL we attempted

    # ── Step 1: Collect curated sources (tiered order) ──
    tiered = get_tiered_urls(company)
    # Consultancy blogs first (they have the best compiled data)
    all_urls.extend(tiered.get("tier_2", []))
    all_urls.extend(tiered.get("tier_1", []))
    all_urls.extend(tiered.get("tier_3", []))
    all_urls.extend(tiered.get("tier_4", []))

    if progress_cb:
        progress_cb(f"Found {len(all_urls)} curated sources for {company}")

    # ── Step 2: Discover new sources via Perplexity or DuckDuckGo ──
    perp_sources = []
    if PERPLEXITY_API_KEY:
        if progress_cb:
            progress_cb(f"🔍 Discovering sources via Perplexity for {company}...")
        perp_sources = discover_sources_perplexity(company, data_points)
        discovered_sources.extend(perp_sources)

    if not perp_sources:
        if progress_cb:
            progress_cb(f"🔍 Discovering sources via DuckDuckGo for {company}...")
        ddg_sources = discover_sources_duckduckgo(company, data_points)
        discovered_sources.extend(ddg_sources)

    for s in discovered_sources:
        url = s.get("url", "")
        if url and url not in all_urls:
            all_urls.append(url)

    if progress_cb:
        progress_cb(f"Total {len(all_urls)} source URLs for {company} (+ {len(discovered_sources)} discovered)")

    # ── Step 3: Gemini AI research (parallel — uses Google Search) ──
    if progress_cb:
        progress_cb(f"🌐 AI-searching for {company} pricing data...")

    gemini_result = _gemini_grounded_research(company, dp_text, instruction)
    gemini_data = gemini_result.get("data")
    gemini_sources = gemini_result.get("grounding_sources", [])

    # Add Gemini-discovered URLs
    for s in gemini_sources:
        url = s.get("url", s.get("uri", ""))
        if url and url not in all_urls:
            all_urls.append(url)

    # ── Step 4: Scrape pages (up to max_scrape) ──
    scrape_urls = _prioritize_urls(all_urls, max_scrape)

    if progress_cb:
        progress_cb(f"📄 Scraping {len(scrape_urls)} pages for {company}...")

    page_extractions = []
    scrape_results = []

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for url in scrape_urls:
        source_record = {"url": url, "success": False, "error": None, "had_pricing_data": False}
        try:
            if progress_cb:
                progress_cb(f"📄 Reading: {_shorten_url(url)}...")

            page = loop.run_until_complete(fetch_page(url, timeout=20000))

            if page["success"] and page["markdown"] and len(page["markdown"]) > 100:
                source_record["success"] = True
                source_record["title"] = page.get("title", "")
                source_record["content_length"] = len(page["markdown"])

                # Extract prices from this page
                extraction = _extract_prices_from_page(
                    page["markdown"], company, dp_text, instruction
                )
                if extraction and not extraction.get("no_data"):
                    extraction["_source_url"] = url
                    page_extractions.append(extraction)
                    source_record["had_pricing_data"] = True
            else:
                source_record["error"] = page.get("error", "No content")
        except Exception as e:
            source_record["error"] = str(e)

        sources_tried.append(source_record)
        scrape_results.append(source_record)

    try:
        from .scraper import close_browser
        loop.run_until_complete(close_browser())
    except Exception:
        pass
    loop.close()

    # ── Step 5: Merge all extracted data ──
    if progress_cb:
        progress_cb(f"🧠 Compiling {company} pricing from {len(page_extractions)} pages + AI research...")

    final_data = _merge_company_data(company, gemini_data, page_extractions, dp_text, instruction)

    # ── Step 6: Enrich with route calculations ──
    if origin_city and dest_city and final_data:
        final_data = enrich_prices_with_route(final_data, origin_city, dest_city)

    # Build comprehensive source list
    all_source_info = []
    for s in gemini_sources:
        all_source_info.append(s)
    for s in discovered_sources:
        if s.get("url") not in [x.get("url") for x in all_source_info]:
            all_source_info.append(s)
    for sr in scrape_results:
        if sr.get("success") and sr.get("url") not in [x.get("url") for x in all_source_info]:
            all_source_info.append({"url": sr["url"], "title": sr.get("title", sr["url"])})

    return {
        "company": company,
        "data": final_data,
        "sources": all_source_info,
        "sources_tried": sources_tried,
        "pages_scraped": len([s for s in scrape_results if s.get("success")]),
        "pages_with_data": len(page_extractions),
        "perplexity_sources": len([s for s in discovered_sources if "perplexity" not in s.get("data_available", "").lower()]),
        "success": final_data is not None and not (isinstance(final_data, dict) and final_data.get("no_data")),
        "error": None if final_data else "No pricing data could be extracted from any source"
    }


# ── Internal helpers ──────────────────────────────────────────────────

def _gemini_grounded_research(company: str, dp_text: str, instruction: str) -> dict:
    """Use Gemini with Google Search grounding for initial research."""
    query = f"""Find SPECIFIC NUMERICAL pricing data for {company} (Indian logistics/courier company).

I need these 4 categories:
1. BASE PRICE — rate slabs by weight (0-500g, 500g-1kg, 1-5kg etc.) in INR
2. ZONE PRICING — within city, within state, metro-to-metro, national rates
3. COD CHARGES — exact percentage and/or flat fee
4. VOLUME DISCOUNTS — discount tiers by monthly shipment volume

{instruction}

CRITICAL: I need ACTUAL NUMBERS in INR, not "varies" or "contact for quote".
Examples of good data: "Base rate: ₹35/500g within city", "COD: 2% or ₹40 min", "15% off for 1000+ shipments/month"

Look at 4PL blogs (clickpost.ai, shiprocket.in, wareiq.com) — they compile this data.

Return JSON with ALL extracted data. Include source_urls.
Return ONLY valid JSON, no markdown fences."""

    try:
        return extractor.research(query)
    except Exception as e:
        print(f"    Gemini research failed for {company}: {e}")
        return {"data": None, "grounding_sources": []}


def _extract_prices_from_page(content: str, company: str, dp_text: str, instruction: str) -> dict:
    """Extract specific pricing data from scraped page content."""
    # Truncate very long pages
    if len(content) > 50000:
        content = content[:50000]

    prompt = EXTRACTION_PROMPT.format(company=company, content=content)

    try:
        result = extractor._call_gemini(
            contents=prompt,
            config=extractor.types.GenerateContentConfig(temperature=0.1)
        )
        parsed = extractor._parse_json_response(result.text)
        if parsed and not (isinstance(parsed, dict) and parsed.get("no_data")):
            return parsed
    except Exception as e:
        print(f"    Price extraction failed for {company}: {e}")

    return None


def _merge_company_data(company: str, gemini_data, page_extractions: list, dp_text: str, instruction: str) -> dict:
    """Merge data from Gemini research and scraped page extractions into standardized format."""
    if not gemini_data and not page_extractions:
        return None

    # If we only have Gemini data
    if not page_extractions:
        if isinstance(gemini_data, list) and len(gemini_data) > 0:
            data = gemini_data[0] if isinstance(gemini_data[0], dict) else {"raw": gemini_data}
        elif isinstance(gemini_data, dict):
            data = gemini_data
        else:
            data = {"raw_data": str(gemini_data)}
        data["company"] = company
        return data

    # If we only have one page extraction and no Gemini data
    if not gemini_data and len(page_extractions) == 1:
        data = page_extractions[0]
        data.pop("_source_url", None)
        data["company"] = company
        return data

    # Merge everything with AI
    sources_data = ""
    if gemini_data:
        sources_data += f"\n--- AI Research (Google Search grounding) ---\n{json.dumps(gemini_data, indent=2, default=str)}\n"

    for i, ext in enumerate(page_extractions):
        source = ext.pop("_source_url", f"Page {i+1}")
        sources_data += f"\n--- Scraped from: {source} ---\n{json.dumps(ext, indent=2, default=str)}\n"

    prompt = MERGE_PROMPT.format(company=company, sources_data=sources_data)

    try:
        result = extractor._call_gemini(
            contents=prompt,
            config=extractor.types.GenerateContentConfig(temperature=0.1)
        )
        parsed = extractor._parse_json_response(result.text)
        if parsed:
            if isinstance(parsed, dict):
                parsed["company"] = company
            return parsed
    except Exception as e:
        print(f"    Merge failed for {company}: {e}")

    # Fallback: return first extraction with all data combined
    if page_extractions:
        combined = {"company": company}
        for ext in page_extractions:
            ext.pop("_source_url", None)
            combined.update(ext)
        return combined
    if gemini_data:
        if isinstance(gemini_data, dict):
            gemini_data["company"] = company
            return gemini_data
        return {"company": company, "raw_data": gemini_data}
    return None


def _prioritize_urls(urls: list[str], max_count: int) -> list[str]:
    """Prioritize URLs for scraping — blogs first (most data), then calculators, then official."""
    blogs = []
    calculators = []
    scribd = []
    official = []
    other = []

    for url in urls:
        url_lower = url.lower()
        if any(d in url_lower for d in [
            "clickpost.ai/blog", "shiprocket.in/blog", "wareiq.com",
            "ithinklogistics.com/blog", "tirupaticouriertracking",
            "/blog/", "blog."
        ]):
            blogs.append(url)
        elif any(d in url_lower for d in ["calculator", "rate-calculator", "price-finder", "calculate"]):
            calculators.append(url)
        elif "scribd.com" in url_lower:
            scribd.append(url)
        elif any(d in url_lower for d in ["pricing", "rate-card", "charges", "services"]):
            official.append(url)
        else:
            other.append(url)

    # Blogs are richest in pricing data, prioritize them
    prioritized = blogs + scribd + calculators + official + other

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for url in prioritized:
        if url not in seen:
            seen.add(url)
            deduped.append(url)

    return deduped[:max_count]


def _shorten_url(url: str, max_len: int = 60) -> str:
    """Shorten URL for display."""
    url = url.replace("https://", "").replace("http://", "").replace("www.", "")
    return url[:max_len] + "..." if len(url) > max_len else url
