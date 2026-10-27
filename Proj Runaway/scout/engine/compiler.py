"""
compiler.py — Multi-source data compilation
Orchestrates scraper + extractor across multiple sources and merges results
"""
import asyncio
import json
import os
import pandas as pd
from datetime import datetime
from engine import scraper, extractor, discoverer


async def compile_from_urls(urls: list[str], instruction: str, progress_callback=None) -> dict:
    """
    Scrape multiple URLs and compile extracted data.
    
    Args:
        urls: List of URLs to scrape
        instruction: What data to extract
        progress_callback: Optional async callback(step, total_steps, message)
    
    Returns:
        dict with: merged_data, individual_results, export_path, summary
    """
    total = len(urls) + 1  # +1 for merge step
    individual_results = []
    
    for i, url in enumerate(urls):
        if progress_callback:
            await progress_callback(i + 1, total, f"Scraping {url}...")
        
        # Scrape the page
        page_data = await scraper.fetch_page(url)
        
        if not page_data["success"]:
            individual_results.append({
                "source_url": url,
                "data": None,
                "error": page_data.get("error", "Failed to fetch page")
            })
            continue
        
        # Extract data with AI
        extraction = extractor.extract(page_data["markdown"], instruction)
        
        individual_results.append({
            "source_url": url,
            "page_title": page_data.get("title", ""),
            "data": extraction.get("data"),
            "success": extraction.get("success", False),
            "error": extraction.get("error")
        })
    
    # Merge all extracted data
    if progress_callback:
        await progress_callback(total, total, "Merging data from all sources...")
    
    successful_extractions = [r for r in individual_results if r.get("success")]
    
    if not successful_extractions:
        return {
            "merged_data": None,
            "individual_results": individual_results,
            "export_path": None,
            "summary": "No data could be extracted from any source."
        }
    
    if len(successful_extractions) == 1:
        merged = {
            "merged_data": successful_extractions[0]["data"],
            "summary": f"Data extracted from 1 source: {successful_extractions[0]['source_url']}",
            "conflicts": [],
            "sources_used": 1
        }
    else:
        merged = extractor.merge_extractions(successful_extractions, instruction)
    
    # Export to CSV
    export_path = _export_to_csv(merged.get("merged_data"), instruction)
    
    return {
        "merged_data": merged.get("merged_data"),
        "individual_results": individual_results,
        "export_path": export_path,
        "summary": merged.get("summary", ""),
        "conflicts": merged.get("conflicts", []),
        "sources_used": merged.get("sources_used", len(successful_extractions))
    }


async def compile_for_companies(
    companies: list[str],
    data_points: list[str],
    instruction: str,
    progress_callback=None
) -> dict:
    """
    Auto-discover sources and compile data for a list of companies.
    
    Args:
        companies: List of company names
        data_points: List of data points to extract
        instruction: Overall extraction instruction
        progress_callback: Optional async callback
    
    Returns:
        Compiled results dict
    """
    total_steps = len(companies) * 3 + 1  # discover + scrape + extract per company, + merge
    current_step = 0
    
    all_extractions = []
    
    for company in companies:
        # Step 1: Discover sources
        current_step += 1
        if progress_callback:
            await progress_callback(current_step, total_steps, f"🔍 Discovering sources for {company}...")
        
        query = f"{company} {' '.join(data_points)}"
        sources = discoverer.search_sources(query, max_results=5)
        
        if not sources:
            current_step += 2
            continue
        
        # Step 2: Scrape top sources (max 3 per company)
        current_step += 1
        if progress_callback:
            await progress_callback(current_step, total_steps, f"🌐 Scraping {company} sources...")
        
        top_urls = [s["url"] for s in sources[:3]]
        pages = await scraper.fetch_multiple(top_urls)
        
        # Step 3: Extract data
        current_step += 1
        if progress_callback:
            await progress_callback(current_step, total_steps, f"🤖 Extracting {company} data...")
        
        company_instruction = f"Extract the following data for {company}: {', '.join(data_points)}. {instruction}"
        
        for page in pages:
            if page["success"]:
                extraction = extractor.extract(page["markdown"], company_instruction)
                if extraction["success"]:
                    all_extractions.append({
                        "source_url": page["url"],
                        "company": company,
                        "data": extraction["data"]
                    })
    
    # Merge all company data
    current_step += 1
    if progress_callback:
        await progress_callback(current_step, total_steps, "📊 Compiling final report...")
    
    if not all_extractions:
        return {
            "merged_data": None,
            "summary": "Could not extract data from any sources.",
            "export_path": None
        }
    
    merged = extractor.merge_extractions(all_extractions, instruction)
    export_path = _export_to_csv(merged.get("merged_data"), instruction)
    
    return {
        "merged_data": merged.get("merged_data"),
        "summary": merged.get("summary", ""),
        "conflicts": merged.get("conflicts", []),
        "sources_used": merged.get("sources_used", 0),
        "export_path": export_path,
        "extractions_count": len(all_extractions)
    }


def _export_to_csv(data, instruction: str) -> str:
    """Export data to CSV file and return the file path."""
    if not data:
        return None
    
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"scout_result_{timestamp}.csv"
    filepath = os.path.join(output_dir, filename)
    
    try:
        # Handle different data structures
        if isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, dict):
            # Check if it has a nested array we should use
            for key in ["merged_data", "companies", "results", "data", "rates", "pricing"]:
                if key in data and isinstance(data[key], list):
                    df = pd.DataFrame(data[key])
                    break
            else:
                df = pd.DataFrame([data])
        else:
            return None
        
        df.to_csv(filepath, index=False, encoding="utf-8-sig")
        
        # Also save as Excel
        excel_path = filepath.replace(".csv", ".xlsx")
        try:
            df.to_excel(excel_path, index=False)
        except Exception:
            pass
        
        return filepath
    
    except Exception as e:
        print(f"Export error: {e}")
        return None


def compile_from_urls_sync(urls: list[str], instruction: str) -> dict:
    """Synchronous wrapper."""
    return asyncio.run(compile_from_urls(urls, instruction))
