"""
discoverer.py — Auto-discover relevant data sources from the web
Uses DuckDuckGo search + Gemini AI to find and rank the best sources
"""
from duckduckgo_search import DDGS
from engine import extractor


def search_sources(query: str, max_results: int = 15) -> list[dict]:
    """
    Search the web for relevant data sources.
    
    Args:
        query: Natural language query (e.g. "Delhivery shipping rates India 2025")
        max_results: Maximum number of search results to return
    
    Returns:
        List of dicts with: title, url, snippet, relevance_score, reasoning
    """
    # Enhance the query for better data-finding
    enhanced_queries = _generate_search_queries(query)
    
    all_results = []
    seen_urls = set()
    
    with DDGS() as ddgs:
        for q in enhanced_queries:
            try:
                results = list(ddgs.text(q, max_results=max_results // len(enhanced_queries) + 2))
                for r in results:
                    url = r.get("href", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        all_results.append({
                            "title": r.get("title", ""),
                            "url": url,
                            "snippet": r.get("body", ""),
                            "search_query": q
                        })
            except Exception as e:
                print(f"Search failed for '{q}': {e}")
                continue
    
    # Use AI to rank results by relevance
    if all_results:
        all_results = extractor.analyze_sources(query, all_results[:max_results])
    
    return all_results[:max_results]


def discover_for_companies(companies: list[str], data_points: list[str], industry: str = "logistics") -> dict:
    """
    Find data sources for specific companies and data points.
    
    Args:
        companies: List of company names (e.g. ["Delhivery", "Blue Dart"])
        data_points: List of data points needed (e.g. ["base rates", "COD fees", "discounts"])
        industry: Industry context
    
    Returns:
        dict mapping company names to lists of discovered source URLs
    """
    discoveries = {}
    
    for company in companies:
        company_sources = []
        
        for dp in data_points:
            query = f"{company} {dp} {industry} India pricing"
            sources = search_sources(query, max_results=5)
            
            for source in sources:
                source["data_point"] = dp
                source["company"] = company
                company_sources.append(source)
        
        # Deduplicate by URL within the company
        seen = set()
        unique_sources = []
        for s in company_sources:
            if s["url"] not in seen:
                seen.add(s["url"])
                unique_sources.append(s)
        
        discoveries[company] = unique_sources
    
    return discoveries


def _generate_search_queries(base_query: str) -> list[str]:
    """Generate multiple search query variations for better coverage."""
    queries = [base_query]
    
    # Add data-focused variations
    suffixes = [
        "pricing rates calculator",
        "rate card official",
        "charges fees comparison",
    ]
    
    for suffix in suffixes:
        queries.append(f"{base_query} {suffix}")
    
    return queries[:4]  # Max 4 queries to avoid excessive searching
