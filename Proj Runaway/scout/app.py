"""
RunawayScout — AI-Powered Web Scraping & Data Intelligence Tool
Main Flask application with SSE streaming, deep scraping, Perplexity discovery, and SQLite persistence
"""
import asyncio
import json
import os
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, Response, send_file
from engine import extractor
from engine.scraper import fetch_page
from engine.compiler import compile_from_urls
from engine.sources_db import (
    get_sources_for_company, build_source_context,
    get_all_source_urls_for_company, COMPARISON_TOOLS
)
from engine.deep_extractor import deep_research_company, configure_perplexity
from engine.distances import extract_cities_from_text, enrich_prices_with_route
from engine.persistence import (
    save_result, save_partial, get_result, get_all_results,
    delete_result, cleanup_partials, get_partials
)


# --- Configuration ---
API_KEY = "AIzaSyDlU0jWxjl7-IohXLMhmT5jBb2ZRPLc-bg"
PERPLEXITY_KEY = ""  # User can set via /api/config or env var

app = Flask(__name__)
# Track which companies should be skipped (keyed by stream_id)
skip_requests = {}

# Initialize Gemini
extractor.configure(API_KEY)

# Initialize Perplexity (from env var if available)
_perp_key = os.environ.get("PERPLEXITY_API_KEY", PERPLEXITY_KEY)
if _perp_key:
    configure_perplexity(_perp_key)

# Load past results into memory cache for quick access
_results_cache = {}
try:
    for r in get_all_results():
        _results_cache[r["id"]] = r
except Exception:
    pass


def _store_result(result_id: str, result: dict):
    """Save result to both memory cache and SQLite."""
    _results_cache[result_id] = result
    try:
        save_result(result_id, result)
    except Exception as e:
        print(f"  [!] Persistence save failed: {e}")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config", methods=["POST"])
def api_config():
    """Set API keys at runtime."""
    data = request.json
    if data.get("perplexity_key"):
        configure_perplexity(data["perplexity_key"])
        return jsonify({"ok": True, "message": "Perplexity API key set"})
    return jsonify({"ok": False, "error": "No key provided"}), 400


@app.route("/api/scrape", methods=["POST"])
def api_scrape():
    """Direct scrape mode."""
    data = request.json
    url = data.get("url", "").strip()
    instruction = data.get("instruction", "Extract all relevant data").strip()
    
    if not url:
        return jsonify({"success": False, "error": "URL is required"}), 400
    if not url.startswith("http"):
        url = "https://" + url
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        page_data = loop.run_until_complete(fetch_page(url))
        loop.close()
        
        if not page_data["success"]:
            return jsonify({"success": False, "error": f"Failed to fetch: {page_data.get('error')}"})
        
        extraction = extractor.extract(page_data["markdown"], instruction)
        
        result_id = str(uuid.uuid4())[:8]
        result = {
            "id": result_id, "mode": "scrape", "url": url,
            "data": extraction.get("data"),
            "raw_response": extraction.get("raw_response", ""),
            "success": extraction.get("success", False),
            "error": extraction.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        _store_result(result_id, result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/discover", methods=["POST"])
def api_discover():
    """Auto-discover mode with Google Search grounding."""
    data = request.json
    query = data.get("query", "").strip()
    instruction = data.get("instruction", "").strip()
    
    if not query:
        return jsonify({"success": False, "error": "Query is required"}), 400
    
    try:
        full_query = query
        if instruction:
            full_query += f"\n\nAdditional instructions: {instruction}"
        
        result = extractor.research(full_query, instruction)
        
        result_id = str(uuid.uuid4())[:8]
        response_data = {
            "id": result_id, "mode": "discover", "query": query,
            "success": result.get("success", False),
            "data": result.get("data"),
            "summary": result.get("summary", ""),
            "sources": result.get("grounding_sources", []),
            "source_urls": result.get("sources", []),
            "confidence": result.get("confidence", ""),
            "notes": result.get("notes", ""),
            "raw_response": result.get("raw_response", ""),
            "error": result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        _store_result(result_id, response_data)
        return jsonify(response_data)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/skip/<stream_id>/<company>", methods=["POST"])
def api_skip(stream_id, company):
    """Signal to skip a company during streaming research."""
    if stream_id not in skip_requests:
        skip_requests[stream_id] = set()
    skip_requests[stream_id].add(company.lower().strip())
    return jsonify({"ok": True, "skipped": company})


@app.route("/api/compile/stream", methods=["POST"])
def api_compile_stream():
    """
    Multi-source compile with SSE streaming.
    Uses deep scraping + Perplexity discovery for real price extraction.
    """
    data = request.json
    companies = data.get("companies", [])
    data_points = data.get("data_points", [])
    instruction = data.get("instruction", "").strip()
    origin_city = data.get("origin_city", "").strip()
    dest_city = data.get("dest_city", "").strip()
    
    if not companies or not data_points:
        return jsonify({"success": False, "error": "Companies and data points required"}), 400
    
    result_id = str(uuid.uuid4())[:8]
    stream_id = str(uuid.uuid4())[:8]
    skip_requests[stream_id] = set()
    
    # Try to detect cities from instruction if not provided
    if not origin_city or not dest_city:
        detected_origin, detected_dest = extract_cities_from_text(instruction)
        if detected_origin and not origin_city:
            origin_city = detected_origin
        if detected_dest and not dest_city:
            dest_city = detected_dest
    
    def generate():
        all_company_data = []
        all_sources = []
        
        route_info = ""
        if origin_city and dest_city:
            from engine.distances import get_distance
            dist = get_distance(origin_city, dest_city)
            if dist:
                route_info = f" (Route: {origin_city}→{dest_city}, {dist}km)"
        
        yield _sse_event("status", {
            "message": f"Starting deep research for {len(companies)} companies...{route_info}",
            "step": 0, "total": len(companies) + 1,
            "stream_id": stream_id,
            "route": {"origin": origin_city, "destination": dest_city} if origin_city else None
        })
        
        for i, company in enumerate(companies):
            # Check if this company should be skipped
            if company.lower().strip() in skip_requests.get(stream_id, set()):
                yield _sse_event("company_done", {
                    "company": company, "step": i + 1, "total": len(companies) + 1,
                    "result": {"company": company, "success": False, "error": "Skipped by user"},
                    "skipped": True,
                    "table_so_far": all_company_data
                })
                continue
            
            yield _sse_event("progress", {
                "message": f"Deep-researching {company}...",
                "step": i + 1, "total": len(companies) + 1,
                "company": company
            })
            
            # Use deep extractor instead of simple Gemini research
            def progress_update(msg):
                pass  # We can't yield from a callback, but it logs to console
            
            try:
                result = deep_research_company(
                    company=company,
                    data_points=data_points,
                    instruction=instruction,
                    origin_city=origin_city if origin_city else None,
                    dest_city=dest_city if dest_city else None,
                    max_scrape=4,
                    progress_cb=lambda msg: print(f"    [{company}] {msg}")
                )
                
                company_result = {
                    "company": company,
                    "success": result.get("success", False),
                    "data": result.get("data"),
                    "sources": result.get("sources", []),
                    "pages_scraped": result.get("pages_scraped", 0),
                    "pages_extracted": result.get("pages_extracted", 0),
                    "perplexity_sources": result.get("perplexity_sources", 0),
                    "error": result.get("error")
                }
                
                if result.get("success") and result.get("data"):
                    extracted = result["data"]
                    if isinstance(extracted, list) and len(extracted) > 0:
                        extracted = extracted[0]
                    if isinstance(extracted, dict):
                        extracted["company"] = company
                        all_company_data.append(extracted)
                    else:
                        all_company_data.append({"company": company, "raw_data": extracted})
                
                for s in result.get("sources", []):
                    if s not in all_sources:
                        all_sources.append(s)
                
                # Save partial result
                save_partial(stream_id, company, company_result)
                
            except Exception as e:
                company_result = {
                    "company": company, "success": False,
                    "data": None, "sources": [], "error": str(e)
                }
                save_partial(stream_id, company, company_result)
            
            yield _sse_event("company_done", {
                "company": company, "step": i + 1, "total": len(companies) + 1,
                "result": company_result,
                "table_so_far": all_company_data
            })
        
        # Final
        yield _sse_event("progress", {
            "message": "Compiling final results...",
            "step": len(companies) + 1, "total": len(companies) + 1
        })
        
        final_result = {
            "id": result_id, "mode": "compile",
            "success": len(all_company_data) > 0,
            "data": all_company_data, "merged_data": all_company_data,
            "sources": all_sources,
            "companies": companies,
            "data_points": data_points,
            "instruction": instruction,
            "summary": f"Deep-researched {len(all_company_data)}/{len(companies)} companies. "
                       f"Route: {origin_city}→{dest_city}" if origin_city else 
                       f"Deep-researched {len(all_company_data)}/{len(companies)} companies.",
            "timestamp": datetime.now().isoformat()
        }
        _store_result(result_id, final_result)
        
        # Cleanup
        skip_requests.pop(stream_id, None)
        cleanup_partials(stream_id)
        
        yield _sse_event("done", final_result)
    
    return Response(generate(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive"
    })


@app.route("/api/compile", methods=["POST"])
def api_compile():
    """Non-streaming compile fallback."""
    data = request.json
    companies = data.get("companies", [])
    data_points = data.get("data_points", [])
    instruction = data.get("instruction", "").strip()
    
    try:
        if companies and data_points:
            dp_text = ", ".join(data_points)
            company_text = ", ".join(companies)
            
            research_query = f"""Find detailed pricing data for these Indian logistics companies: {company_text}

For EACH company, find: {dp_text}

{instruction}

IMPORTANT: Use secondary sources like ClickPost blogs, Shiprocket blogs, WareIQ articles, 
and rate comparison tools. Companies rarely publish rates on their own sites.

Return JSON: {{"data": [one object per company], "summary": "...", "sources": [...]}}"""
            
            result = extractor.research(research_query)
            
            result_id = str(uuid.uuid4())[:8]
            response_data = {
                "id": result_id, "mode": "compile",
                "success": result.get("success", False),
                "data": result.get("data"), "merged_data": result.get("data"),
                "summary": result.get("summary", ""),
                "sources": result.get("grounding_sources", []),
                "raw_response": result.get("raw_response", ""),
                "error": result.get("error"),
                "timestamp": datetime.now().isoformat()
            }
            _store_result(result_id, response_data)
            return jsonify(response_data)
        
        return jsonify({"success": False, "error": "Provide companies + data_points"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/sources/<company>")
def api_company_sources(company):
    """Get curated reference sources for a company."""
    data = get_sources_for_company(company)
    data["comparison_tools"] = COMPARISON_TOOLS
    return jsonify(data)


@app.route("/api/export/<result_id>")
def api_export(result_id):
    """Download CSV export."""
    result = _results_cache.get(result_id) or get_result(result_id)
    if not result:
        return jsonify({"error": "Result not found"}), 404
    
    from engine.compiler import _export_to_csv
    data = result.get("merged_data") or result.get("data")
    if data:
        export_path = _export_to_csv(data, "export")
        if export_path and os.path.exists(export_path):
            return send_file(export_path, as_attachment=True)
    
    return jsonify({"error": "No exportable data"}), 404


@app.route("/api/results")
def api_results():
    """Get all results (from cache + SQLite)."""
    # Merge cache and DB
    all_results = {}
    try:
        for r in get_all_results():
            all_results[r["id"]] = r
    except Exception:
        pass
    for rid, r in _results_cache.items():
        all_results[rid] = r
    return jsonify(list(all_results.values()))


@app.route("/api/history")
def api_history():
    """Get research history from SQLite — survives restarts."""
    try:
        results = get_all_results()
        # Return summary info for each
        history = []
        for r in results:
            history.append({
                "id": r.get("id"),
                "mode": r.get("mode"),
                "query": r.get("query", ""),
                "companies": r.get("companies", []),
                "summary": r.get("summary", ""),
                "status": r.get("status", "complete"),
                "timestamp": r.get("timestamp", r.get("created_at", "")),
                "has_data": r.get("data") is not None,
            })
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history/<result_id>")
def api_history_detail(result_id):
    """Get full details of a past research result."""
    result = _results_cache.get(result_id) or get_result(result_id)
    if not result:
        return jsonify({"error": "Not found"}), 404
    return jsonify(result)


@app.route("/api/history/<result_id>", methods=["DELETE"])
def api_history_delete(result_id):
    """Delete a past result."""
    _results_cache.pop(result_id, None)
    deleted = delete_result(result_id)
    return jsonify({"ok": deleted})


def _sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"


if __name__ == "__main__":
    print("\n[*] RunawayScout is starting...")
    print("    Open http://localhost:5000 in your browser")
    print(f"    Perplexity: {'Yes, configured' if _perp_key else 'No, not set (set PERPLEXITY_API_KEY env var)'}")
    print(f"    Database: scout_results.db")
    print()
    app.run(debug=True, port=5000, use_reloader=False, threaded=True)
