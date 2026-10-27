"""
scraper.py — Playwright-based page fetcher
Handles: navigation, dynamic content, cookie popups, HTML → Markdown conversion
Optimized: browser reuse, retry logic, timeout handling
"""
import asyncio
from playwright.async_api import async_playwright
from markdownify import markdownify as md
import re

# Shared browser instance for reuse across multiple scrapes
_browser = None
_playwright_instance = None


async def _get_browser():
    """Get or create a shared browser instance to avoid repeated Chromium launches."""
    global _browser, _playwright_instance
    if _browser is None or not _browser.is_connected():
        _playwright_instance = await async_playwright().start()
        _browser = await _playwright_instance.chromium.launch(
            headless=True,
            args=["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"]
        )
    return _browser


async def close_browser():
    """Close the shared browser when done."""
    global _browser, _playwright_instance
    if _browser:
        try:
            await _browser.close()
        except Exception:
            pass
        _browser = None
    if _playwright_instance:
        try:
            await _playwright_instance.stop()
        except Exception:
            pass
        _playwright_instance = None


async def fetch_page(url: str, wait_for: str = None, timeout: int = 30000, retries: int = 2) -> dict:
    """
    Fetch a page using Playwright and return clean markdown content.
    Uses shared browser instance and retries on failure.

    Args:
        url: The URL to scrape
        wait_for: Optional CSS selector to wait for before extracting
        timeout: Max time to wait in ms
        retries: Number of retry attempts

    Returns:
        dict with keys: url, title, markdown, raw_html, success, error
    """
    result = {
        "url": url,
        "title": "",
        "markdown": "",
        "raw_html": "",
        "success": False,
        "error": None
    }

    for attempt in range(retries + 1):
        try:
            browser = await _get_browser()
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080}
            )
            # Block heavy resources to speed up loading
            await context.route("**/*.{png,jpg,jpeg,gif,svg,mp4,webm,woff,woff2}", lambda route: route.abort())

            page = await context.new_page()

            # Navigate
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            # Try to dismiss common cookie/consent popups
            await _dismiss_popups(page)

            # Wait for network to settle
            try:
                await page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass  # Some pages never reach networkidle, that's OK

            # Wait for specific selector if provided
            if wait_for:
                try:
                    await page.wait_for_selector(wait_for, timeout=8000)
                except Exception:
                    pass

            # Scroll down to trigger lazy-loaded content
            await _auto_scroll(page)

            # Extract content
            result["title"] = await page.title()

            # Try to get main content area first, fall back to body
            main_html = await _extract_main_content(page)
            result["raw_html"] = main_html

            # Convert to clean markdown
            markdown = md(main_html, heading_style="ATX", strip=["script", "style", "nav", "footer", "header"])
            result["markdown"] = _clean_markdown(markdown)
            result["success"] = len(result["markdown"]) > 50  # Must have real content

            await context.close()
            break  # Success, no retry

        except Exception as e:
            result["error"] = str(e)
            if attempt < retries:
                await asyncio.sleep(2 * (attempt + 1))  # Backoff: 2s, 4s
                # Force browser restart on connection errors
                if "target closed" in str(e).lower() or "browser" in str(e).lower():
                    global _browser
                    _browser = None
            else:
                break  # All retries exhausted

    return result


async def fetch_multiple(urls: list[str], callback=None) -> list[dict]:
    """
    Fetch multiple pages sequentially using shared browser.

    Args:
        urls: List of URLs to scrape
        callback: Optional async function called with (index, total, result) after each page

    Returns:
        List of result dicts
    """
    results = []
    for i, url in enumerate(urls):
        result = await fetch_page(url)
        if callback:
            await callback(i, len(urls), result)
        results.append(result)
    return results


async def _dismiss_popups(page):
    """Try to click common cookie/consent dismiss buttons."""
    selectors = [
        "button:has-text('Accept')",
        "button:has-text('Accept All')",
        "button:has-text('Got it')",
        "button:has-text('I agree')",
        "button:has-text('OK')",
        "button:has-text('Close')",
        "[class*='cookie'] button",
        "[id*='cookie'] button",
        "[class*='consent'] button",
    ]
    for selector in selectors:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible(timeout=500):
                await btn.click(timeout=1000)
                await asyncio.sleep(0.3)
                break
        except Exception:
            continue


async def _auto_scroll(page, max_scrolls: int = 3):
    """Scroll down to trigger lazy-loaded content."""
    for _ in range(max_scrolls):
        try:
            await page.evaluate("window.scrollBy(0, window.innerHeight)")
            await asyncio.sleep(0.3)
        except Exception:
            break


async def _extract_main_content(page) -> str:
    """Extract the most relevant content area from the page."""
    # Try common main content selectors
    for selector in ["main", "article", "[role='main']", "#content", ".content", "#main", ".main-content"]:
        try:
            el = page.locator(selector).first
            if await el.is_visible(timeout=500):
                html = await el.inner_html()
                if len(html) > 200:  # Only use if it has substantial content
                    return html
        except Exception:
            continue

    # Fall back to full body
    return await page.locator("body").inner_html()


def _clean_markdown(text: str) -> str:
    """Clean up markdown output — remove excessive whitespace, empty links, etc."""
    # Remove excessive newlines
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    # Remove empty links
    text = re.sub(r'\[[\s]*\]\(.*?\)', '', text)
    # Remove image references (they won't be useful for extraction)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    # Collapse whitespace lines
    text = re.sub(r'[ \t]+\n', '\n', text)
    return text.strip()


def scrape_sync(url: str, wait_for: str = None) -> dict:
    """Synchronous wrapper for fetch_page."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(fetch_page(url, wait_for))
    finally:
        loop.close()
