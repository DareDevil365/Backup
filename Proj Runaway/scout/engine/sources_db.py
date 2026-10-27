"""
sources_db.py — Curated reference sources for Indian logistics companies
Organized by research tier:
  Tier 1: Official company websites (rate pages, calculators, FAQs)
  Tier 2: Consultancy / 4PL blogs (ClickPost, Shiprocket, WareIQ, iThink)
  Tier 3: Sector reports / Scribd docs / industry research
  Tier 4: Rate aggregators / calculator tools / comparison platforms
"""

COMPANY_SOURCES = {
    # ─────────────────────────── 1. Delhivery ───────────────────────────
    "delhivery": {
        "name": "Delhivery",
        "tier_1_official": [
            "https://help.delhivery.com/docs/rate-calculator",
            "https://www.delhivery.com/pricing",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/delhivery-courier-charges",
            "https://www.shiprocket.in/blog/delhivery-courier-charges/",
            "https://wareiq.com/resources/blogs/delhivery-courier-charges/",
            "https://www.ithinklogistics.com/blog/delhivery-shipping-charges/",
        ],
        "tier_3_sector": [
            "https://www.scribd.com/document/528851231/Delhivery-Rate-Card",
        ],
        "tier_4_library": [],
    },
    # ─────────────────────────── 2. Xpressbees ───────────────────────────
    "xpressbees": {
        "name": "Xpressbees",
        "tier_1_official": [
            "https://www.xpressbees.com/services/b2c-logistics-services/cod-digital-payment-options",
            "https://www.xpressbees.com/pricing",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/xpressbees-courier-charges",
            "https://www.shiprocket.in/blog/xpressbees-courier-charges/",
            "https://wareiq.com/resources/blogs/xpressbees-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 3. Shiprocket ───────────────────────────
    "shiprocket": {
        "name": "Shiprocket",
        "tier_1_official": [
            "https://www.shiprocket.in/shipping-rate-calculator/",
            "https://www.shiprocket.in/features/cod-cash-on-delivery-courier-services/",
            "https://www.shiprocket.in/pricing/",
        ],
        "tier_2_consultancy": [
            "https://support.shiprocket.in/support/solutions/articles/152000000970-instant-cod-faqs",
            "https://www.clickpost.ai/blog/shiprocket-shipping-charges",
        ],
        "tier_3_sector": [
            "https://www.scribd.com/document/824691772/Shiprocket-Pricing-Proposal-1-1",
        ],
        "tier_4_library": [
            "https://numbercalculator.calculator.city/shiprocket-rate-calculator/",
        ],
    },
    # ─────────────────────────── 4. Shadowfax ───────────────────────────
    "shadowfax": {
        "name": "Shadowfax",
        "tier_1_official": [
            "https://www.shadowfax.in/pricing",
            "https://www.shadowfax.in/services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/shadowfax-courier-charges",
            "https://www.shiprocket.in/blog/shadowfax-courier-charges/",
            "https://wareiq.com/resources/blogs/shadowfax-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 5. Blue Dart (DHL) ───────────────────────────
    "blue dart": {
        "name": "Blue Dart (DHL)",
        "tier_1_official": [
            "https://www.bluedart.com/price-finder",
            "https://www.bluedart.com/domestic-services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/blue-dart-courier-charges",
            "https://www.shiprocket.in/blog/bluedart-courier-charges/",
            "https://wareiq.com/resources/blogs/blue-dart-courier-charges/",
            "https://tirupaticouriertracking.com/blue-dart-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 6. DTDC Express ───────────────────────────
    "dtdc": {
        "name": "DTDC Express",
        "tier_1_official": [
            "https://www.dtdc.in/rate-calculator",
            "https://www.dtdc.in/services/domestic-courier-services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/dtdc-courier-charges",
            "https://www.shiprocket.in/blog/dtdc-courier-charges/",
            "https://www.ithinklogistics.com/blog/dtdc-courier-charges/",
            "https://wareiq.com/resources/blogs/dtdc-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 7. Ekart Logistics ───────────────────────────
    "ekart": {
        "name": "Ekart Logistics",
        "tier_1_official": [
            "https://www.ekartlogistics.in/faq",
            "https://www.ekartlogistics.in/pricing",
        ],
        "tier_2_consultancy": [
            "https://www.shiprocket.in/ekart-courier-rate-calculator/",
            "https://www.clickpost.ai/blog/ekart-logistics-courier-charges",
        ],
        "tier_3_sector": [
            "https://www.scribd.com/document/826229446/Delivery-Partner-Ratecard",
        ],
        "tier_4_library": [],
    },
    # ─────────────────────────── 8. NimbusPost ───────────────────────────
    "nimbuspost": {
        "name": "NimbusPost",
        "tier_1_official": [
            "https://www.nimbuspost.com/pricing",
            "https://www.nimbuspost.com/shipping-rate-calculator",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/nimbuspost-courier-charges",
            "https://www.shiprocket.in/blog/nimbuspost-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 9. WareIQ ───────────────────────────
    "wareiq": {
        "name": "WareIQ",
        "tier_1_official": [
            "https://wareiq.com/pricing/",
            "https://wareiq.com/shipping-rate-calculator/",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/wareiq-shipping-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 10. Trackon Couriers ───────────────────────────
    "trackon": {
        "name": "Trackon Couriers",
        "tier_1_official": [
            "https://www.trackon.in/domestic-courier-services",
            "https://www.trackon.in/rate-card",
        ],
        "tier_2_consultancy": [
            "https://www.shiprocket.in/blog/trackon-courier-charges/",
            "https://wareiq.com/resources/blogs/trackon-courier-charges/",
        ],
        "tier_3_sector": [
            "https://www.scribd.com/document/402535891/Trackon-Courier-Quotation-1",
        ],
        "tier_4_library": [],
    },
    # ─────────────────────────── 11. Safexpress ───────────────────────────
    "safexpress": {
        "name": "Safexpress",
        "tier_1_official": [
            "https://www.safexpress.com/rate-calculator",
            "https://www.safexpress.com/services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/safexpress-courier-charges",
            "https://www.shiprocket.in/blog/safexpress-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 12. Shyplite ───────────────────────────
    "shyplite": {
        "name": "Shyplite",
        "tier_1_official": [
            "https://www.shyplite.com/pricing",
            "https://www.shyplite.com/shipping-rate-calculator",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/shyplite-shipping-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 13. Borzo (WeFast) ───────────────────────────
    "borzo": {
        "name": "Borzo (WeFast)",
        "tier_1_official": [
            "https://borzo.com/in/pricing",
            "https://borzo.com/in/services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/borzo-courier-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 14. Shree Maruti Courier ───────────────────────────
    "shree maruti": {
        "name": "Shree Maruti Courier",
        "tier_1_official": [
            "https://www.shreemaruticourier.com/rate-calculator",
            "https://www.shreemaruticourier.com/services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/shree-maruti-courier-charges",
            "https://www.shiprocket.in/blog/shree-maruti-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 15. Gati (Allcargo Gati) ───────────────────────────
    "gati": {
        "name": "Gati (Allcargo Gati)",
        "tier_1_official": [
            "https://www.gati.com/calculate_cost2.jsp",
            "https://www.gati.com/services/express-distribution",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/gati-courier-charges",
            "https://www.shiprocket.in/blog/gati-courier-charges/",
            "https://wareiq.com/resources/blogs/gati-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 16. Mahindra Logistics ───────────────────────────
    "mahindra logistics": {
        "name": "Mahindra Logistics",
        "tier_1_official": [
            "https://www.mahindralogistics.com/services",
            "https://www.mahindralogistics.com/express-logistics",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 17. iThink Logistics ───────────────────────────
    "ithink logistics": {
        "name": "iThink Logistics",
        "tier_1_official": [
            "https://www.ithinklogistics.com/pricing",
            "https://www.ithinklogistics.com/shipping-rate-calculator",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/ithink-logistics-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 18. Pickrr (Shipdroid) ───────────────────────────
    "pickrr": {
        "name": "Pickrr (Shipdroid)",
        "tier_1_official": [
            "https://www.pickrr.com/pricing",
            "https://www.pickrr.com/shipping-rate-calculator",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/pickrr-shipping-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 19. ClickPost ───────────────────────────
    "clickpost": {
        "name": "ClickPost",
        "tier_1_official": [
            "https://www.clickpost.ai/pricing",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 20. Aramex India ───────────────────────────
    "aramex": {
        "name": "Aramex India",
        "tier_1_official": [
            "https://www.aramex.com/us/en/ship/calculate-shipping-rates",
            "https://www.aramex.com/in/en/solutions/domestic-express",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/aramex-courier-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 21. FedEx India ───────────────────────────
    "fedex": {
        "name": "FedEx India",
        "tier_1_official": [
            "https://www.fedex.com/en-in/shipping/rates.html",
            "https://www.fedex.com/content/dam/fedex/meisa-middle-east/tariffs/in/EN-IN_VASS_Domestic_Rates.pdf",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/fedex-courier-charges",
            "https://www.shiprocket.in/blog/fedex-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 22. Pidge ───────────────────────────
    "pidge": {
        "name": "Pidge",
        "tier_1_official": [
            "https://www.pidge.in/pricing",
            "https://www.pidge.in/services",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 23. Smartr Logistics ───────────────────────────
    "smartr": {
        "name": "Smartr Logistics",
        "tier_1_official": [
            "https://www.smartr.in/pricing",
            "https://www.smartr.in/services",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 24. Jaipur Golden Transport ───────────────────────────
    "jaipur golden": {
        "name": "Jaipur Golden Transport",
        "tier_1_official": [
            "https://www.jaipurgoldentransport.com/rate-card",
            "https://www.jaipurgoldentransport.com/services",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 25. Professional Couriers ───────────────────────────
    "professional couriers": {
        "name": "Professional Couriers",
        "tier_1_official": [
            "https://www.tpcindia.com/rate-calculator",
            "https://www.tpcindia.com/services",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/professional-courier-charges",
            "https://www.shiprocket.in/blog/professional-courier-charges/",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 26. Movin (Air India Cargo) ───────────────────────────
    "movin": {
        "name": "Movin (Air India Cargo)",
        "tier_1_official": [
            "https://www.movin.in/pricing",
            "https://www.movin.in/services",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 27. Leopards Courier ───────────────────────────
    "leopards": {
        "name": "Leopards Courier",
        "tier_1_official": [
            "https://www.leopardscourier.com/rate-calculator",
            "https://www.leopardscourier.com/services",
        ],
        "tier_2_consultancy": [],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 28. Porter ───────────────────────────
    "porter": {
        "name": "Porter",
        "tier_1_official": [
            "https://porter.in/two-wheelers",
            "https://porter.in/pricing",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/porter-delivery-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 29. Ecom Express ───────────────────────────
    "ecom express": {
        "name": "Ecom Express",
        "tier_1_official": [
            "https://www.ecomexpress.in/services",
        ],
        "tier_2_consultancy": [
            "https://wareiq.com/resources/blogs/ecom-express-courier-charges/",
            "https://www.clickpost.ai/blog/ecom-express-courier-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
    # ─────────────────────────── 30. India Post ───────────────────────────
    "india post": {
        "name": "India Post",
        "tier_1_official": [
            "https://www.indiapost.gov.in/VAS/Pages/CalculatePostage.aspx",
        ],
        "tier_2_consultancy": [
            "https://www.clickpost.ai/blog/india-post-courier-charges",
        ],
        "tier_3_sector": [],
        "tier_4_library": [],
    },
}

# General comparison and calculator tools (Tier 4 — used as fallback for all companies)
COMPARISON_TOOLS = [
    {"name": "Edesy Shipping Calculator", "url": "https://edesy.in/tools/shipping-rate-calculator"},
    {"name": "ShipPrime Calculator", "url": "https://shipprime.live/tools/shipping-rate-calculator"},
    {"name": "StitchMagic Calculator", "url": "https://stitchmagic.in/tools/shipping-cost-calculator"},
    {"name": "Shiprocket Rate Calculator", "url": "https://www.shiprocket.in/shipping-rate-calculator/"},
    {"name": "Tata Nexarc Shipping Rates", "url": "https://www.tatanexarc.com/l/shipping-rates-from-jaipur-to-delhi/"},
    {"name": "TruckGuru Freight Calculator", "url": "https://truckguru.co.in/freight-calculator"},
]

# Volumetric weight calculators
VOLUMETRIC_TOOLS = [
    {"name": "Shiprocket Volumetric", "url": "https://www.shiprocket.in/volumetric-weight-calculator/"},
    {"name": "Daakia Volumetric", "url": "https://www.daakia.com/volumetric-weight-calculator"},
    {"name": "Movery Volumetric Guide", "url": "https://movery.in/guide/courier-volumetric-weight-calculator"},
    {"name": "Allcargo Volumetric", "url": "https://www.allcargologistics.com/volumetric-weight-calculator"},
]

ALL_CARRIERS = [
    "delhivery", "xpressbees", "shiprocket", "shadowfax", "blue dart",
    "dtdc", "ekart", "nimbuspost", "wareiq", "trackon",
    "safexpress", "shyplite", "borzo", "shree maruti", "gati",
    "mahindra logistics", "ithink logistics", "pickrr", "clickpost",
    "aramex", "fedex", "pidge", "smartr", "jaipur golden",
    "professional couriers", "movin", "leopards", "porter",
    "ecom express", "india post",
]


def get_sources_for_company(company_name: str) -> dict:
    """Look up known reference sources for a company."""
    key = company_name.lower().strip()
    # Try exact match first, then partial
    for db_key, data in COMPANY_SOURCES.items():
        if key == db_key or key in db_key or db_key in key:
            return data
        if data["name"].lower() in key or key in data["name"].lower():
            return data
    return {"name": company_name, "tier_1_official": [], "tier_2_consultancy": [], "tier_3_sector": [], "tier_4_library": []}


def get_all_source_urls_for_company(company_name: str) -> list[str]:
    """Get all known URLs across all tiers for a company, in priority order."""
    data = get_sources_for_company(company_name)
    urls = []
    for tier in ["tier_2_consultancy", "tier_1_official", "tier_3_sector", "tier_4_library"]:
        urls.extend(data.get(tier, []))
    return urls


def get_tiered_urls(company_name: str) -> dict:
    """Get URLs organized by tier."""
    data = get_sources_for_company(company_name)
    return {
        "tier_1": data.get("tier_1_official", []),
        "tier_2": data.get("tier_2_consultancy", []),
        "tier_3": data.get("tier_3_sector", []),
        "tier_4": data.get("tier_4_library", []),
    }


def build_source_context(company_name: str) -> str:
    """Build a text block of known sources to include in the AI prompt."""
    data = get_sources_for_company(company_name)
    urls = get_all_source_urls_for_company(company_name)

    if not urls:
        return ""

    lines = [f"\nKnown reference sources for {data['name']}:"]
    for url in urls:
        lines.append(f"  - {url}")
    lines.append("Use these as primary references when searching for data.")
    return "\n".join(lines)
