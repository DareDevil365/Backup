"""
run_research.py — Batch logistics pricing research for all 28 carriers

CRASH-RESILIENT: After each company completes, results are immediately:
  1. Written to Excel file (logistics_research.xlsx)
  2. Saved to SQLite database (scout_results.db)
  3. Printed to console

If the program crashes mid-run, you keep all research done up to that point.
Re-running will skip already-completed companies (reads from Excel).

Usage:
    python run_research.py                    # Research all companies
    python run_research.py --company Delhivery  # Research one company
    python run_research.py --resume            # Resume from where it left off
"""
import argparse
import asyncio
import json
import os
import sys
import time
import traceback
from datetime import datetime

# Fix Windows console encoding (cp1252 can't handle unicode)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import pandas as pd
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side

# Add parent dir to path so we can import engine modules
sys.path.insert(0, os.path.dirname(__file__))

from engine import extractor
from engine.deep_extractor import deep_research_company
from engine.scraper import close_browser
from engine.sources_db import ALL_CARRIERS, COMPANY_SOURCES
from engine.persistence import save_result

# ── Configuration ───────────────────────────────────────────────────────
# Multiple API keys (comma-separated) for rotation to avoid rate limits
# Each free-tier key gets 15 RPM — 3 keys = 45 RPM total
API_KEYS = os.environ.get("GEMINI_API_KEYS", "AIzaSyDlU0jWxjl7-IohXLMhmT5jBb2ZRPLc-bg")

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
EXCEL_PATH = os.path.join(OUTPUT_DIR, "logistics_research.xlsx")
SOURCES_LOG_PATH = os.path.join(OUTPUT_DIR, "sources_log.xlsx")

RENAME_MAP = {
    "company": "Company",
    "research_status": "Research Status",
    "pricing_rate_card": "Pricing / Rate Card",
    "cod_charges": "COD Charges",
    "volume_discounts": "Volume Discounts",
    "other_charges": "Other Charges",
    "eta_delivery_time": "ETA / Delivery Time",
    "sources": "Sources",
    "pages_scraped": "Pages Scraped",
    "pages_with_data": "Pages With Data",
    "source_count": "Source Count",
    "timestamp": "Timestamp"
}


# The 4 core data points we're researching
DATA_POINTS = [
    "base shipping rate per weight slab (0-500g, 500g-1kg, 1-5kg, 5-10kg)",
    "zone-based pricing (within city, within state, metro to metro, rest of India)",
    "COD charges (percentage and minimum flat fee)",
    "volume/scale discounts (discount tiers by monthly shipment volume)",
]

INSTRUCTION = """Focus on Indian domestic shipping rates. 
Extract ACTUAL NUMBERS in INR — not vague descriptions.
Include fuel surcharge percentage if available.
Include estimated delivery time (ETA in days).
Note if rates are for B2C ecommerce shipments vs B2B/bulk."""


def main():
    parser = argparse.ArgumentParser(description="Batch logistics pricing research")
    parser.add_argument("--company", type=str, help="Research a single company")
    parser.add_argument("--resume", action="store_true", help="Skip already-researched companies")
    parser.add_argument("--max-scrape", type=int, default=6, help="Max pages to scrape per company")
    parser.add_argument("--keys", type=str, help="Comma-separated Gemini API keys for rotation")
    args = parser.parse_args()

    # ── Setup ──
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    keys = args.keys if args.keys else API_KEYS
    extractor.configure(keys)
    key_count = len([k for k in keys.split(",") if k.strip()])
    print(f"  [OK] {key_count} API key(s) configured (Gemini 2.0 Flash)")

    # Determine which companies to research
    if args.company:
        companies = [args.company.lower().strip()]
        # Match to known carrier key
        matched = []
        for key in ALL_CARRIERS:
            name = COMPANY_SOURCES.get(key, {}).get("name", key)
            if args.company.lower() in key or args.company.lower() in name.lower():
                matched.append(key)
        companies = matched if matched else [args.company.lower()]
    else:
        companies = ALL_CARRIERS.copy()

    # Check for already-completed companies (resume mode)
    completed = set()
    if args.resume and os.path.exists(EXCEL_PATH):
        try:
            existing_df = pd.read_excel(EXCEL_PATH, sheet_name="Pricing Data")
            reverse_rename_map = {v: k for k, v in RENAME_MAP.items()}
            existing_df = existing_df.rename(columns=reverse_rename_map)
            completed = set(existing_df["company"].str.lower().tolist())
            print(f"  ℹ Resuming — {len(completed)} companies already done: {', '.join(completed)}")
        except Exception as e:
            print(f"  ⚠ Resume loading failed: {e}")

    remaining = []
    for c in companies:
        name = COMPANY_SOURCES.get(c, {}).get("name", c).lower().strip()
        if c.lower().strip() in completed or name in completed:
            continue
        remaining.append(c)

    print(f"\n{'='*70}")
    print(f"  RUNAWAY SCOUT — Logistics Pricing Research")
    print(f"  Companies: {len(remaining)} to research ({len(completed)} already done)")
    print(f"  Data points: {len(DATA_POINTS)}")
    print(f"  Max pages per company: {args.max_scrape}")
    print(f"  Output: {EXCEL_PATH}")
    print(f"{'='*70}\n")

    # ── Research Loop ──
    all_results = []
    all_sources_log = []
    start_time = time.time()

    for i, company_key in enumerate(remaining):
        company_name = COMPANY_SOURCES.get(company_key, {}).get("name", company_key.title())

        print(f"\n{'─'*60}")
        print(f"  [{i+1}/{len(remaining)}] Researching: {company_name}")
        print(f"{'─'*60}")

        # Check if company is not operational or not applicable
        non_operational_reasons = {
            "leopards": "NOT OPERATIONAL IN INDIA - Pakistan-based carrier, does not operate in India.",
            "fedex": "NOT OPERATIONAL IN INDIA - Discontinued domestic shipping in India (transferred to Delhivery); international only.",
            "aramex": "NOT OPERATIONAL IN INDIA - International shipping only; no domestic courier operations in India.",
            "clickpost": "NOT APPLICABLE - SaaS logistics software provider, not a physical courier/logistics carrier.",
            "pickrr": "NOT APPLICABLE - Acquired by Shiprocket and fully integrated; no longer operates independently.",
            "jaipur golden": "NOT APPLICABLE - B2B bulk freight transport; does not offer standard parcel/e-commerce courier services."
        }

        key_clean = company_key.lower().strip()
        if key_clean in non_operational_reasons:
            reason = non_operational_reasons[key_clean]
            print(f"    ℹ Skipping research: {reason}")
            result = {
                "company": company_name,
                "research_status": "NOT APPLICABLE",
                "pricing_rate_card": reason,
                "cod_charges": "N/A",
                "volume_discounts": "N/A",
                "other_charges": "N/A",
                "eta_delivery_time": "N/A",
                "sources": "N/A",
                "pages_scraped": 0,
                "pages_with_data": 0,
                "sources_tried": []
            }
            row = _flatten_for_excel(result)
            all_results.append(row)
            _save_incremental(all_results, all_sources_log, completed)
            continue

        try:
            result = deep_research_company(
                company=company_name,
                data_points=DATA_POINTS,
                instruction=INSTRUCTION,
                max_scrape=args.max_scrape,
                progress_cb=lambda msg: print(f"    {msg}")
            )

            # ── Flatten data for Excel row ──
            row = _flatten_for_excel(result)
            all_results.append(row)

            # ── Track sources ──
            for src in result.get("sources_tried", []):
                all_sources_log.append({
                    "company": company_name,
                    "url": src.get("url", ""),
                    "title": src.get("title", ""),
                    "scrape_success": src.get("success", False),
                    "had_pricing_data": src.get("had_pricing_data", False),
                    "error": src.get("error", ""),
                    "timestamp": datetime.now().isoformat(),
                })

            # ── Save immediately (crash resilience) ──
            _save_incremental(all_results, all_sources_log, completed)

            # ── Also save to SQLite ──
            try:
                import uuid
                result_id = str(uuid.uuid4())[:8]
                save_result(result_id, {
                    "id": result_id,
                    "mode": "batch_research",
                    "companies": [company_name],
                    "data_points": DATA_POINTS,
                    "instruction": INSTRUCTION,
                    "data": result.get("data"),
                    "merged_data": result.get("data"),
                    "sources": result.get("sources", []),
                    "summary": f"Batch research for {company_name}: {result.get('pages_scraped', 0)} pages scraped, {result.get('pages_with_data', 0)} with data",
                    "timestamp": datetime.now().isoformat(),
                })
            except Exception as e:
                print(f"    ⚠ SQLite save failed: {e}")

            # ── Print summary ──
            status = "✓ SUCCESS" if result.get("success") else "✗ NO DATA"
            print(f"\n    {status}")
            print(f"    Pages scraped: {result.get('pages_scraped', 0)}")
            print(f"    Pages with pricing: {result.get('pages_with_data', 0)}")
            print(f"    Sources found: {len(result.get('sources', []))}")

            # Rate limit cooldown (Gemini free tier: 15 RPM)
            if i < len(remaining) - 1:
                cooldown = 10
                print(f"\n    ⏳ Cooling down {cooldown}s (API rate limits)...")
                time.sleep(cooldown)

        except KeyboardInterrupt:
            print(f"\n\n  ⚠ Interrupted! Saving {len(all_results)} completed results...")
            _save_incremental(all_results, all_sources_log, completed)
            break
        except Exception as e:
            print(f"\n    ✗ FATAL ERROR for {company_name}: {e}")
            traceback.print_exc()
            # Save what we have and continue
            all_results.append({
                "company": company_name,
                "research_status": "FAILED",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            })
            _save_incremental(all_results, all_sources_log, completed)
            time.sleep(5)
            continue

    # ── Cleanup ──
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(close_browser())
        loop.close()
    except Exception:
        pass

    # ── Final save ──
    _save_incremental(all_results, all_sources_log, completed)

    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print(f"  COMPLETE — {len(all_results)} companies researched in {elapsed/60:.1f} minutes")
    print(f"  Excel saved: {EXCEL_PATH}")
    print(f"  Sources log: {SOURCES_LOG_PATH}")
    print(f"{'='*70}\n")


def format_pricing(pricing_data):
    if not pricing_data:
        return "No pricing data found."
    
    if isinstance(pricing_data, dict):
        if pricing_data.get("no_data") or pricing_data.get("no_data") == True:
            reason = pricing_data.get("reason", "")
            dist = pricing_data.get("distance_based_rates")
            if dist:
                lines = ["Distance-based Local Rates:"]
                for k, v in dist.items():
                    k_clean = k.replace("_", " ").title()
                    lines.append(f"  • {k_clean}: {v}")
                return "\n".join(lines)
            return f"No weight slabs found: {reason}"
        
        lines = []
        
        # Slabs
        slabs = pricing_data.get("per_weight_slab", pricing_data.get("weight_slabs"))
        if slabs:
            lines.append("Weight Slabs:")
            if isinstance(slabs, dict):
                if slabs.get("no_data") == True:
                    lines.append(f"  • No weight slabs: {slabs.get('reason', '')}")
                else:
                    for k, v in slabs.items():
                        lines.append(f"  • {k}: {v}")
            elif isinstance(slabs, list):
                for s in slabs:
                    if isinstance(s, dict):
                        slab_name = s.get("weight_slab", s.get("slab", "Slab"))
                        rate = s.get("rate_range_inr", s.get("rate_inr", s.get("rate", "")))
                        notes = s.get("notes", "")
                        note_str = f" ({notes})" if notes else ""
                        lines.append(f"  • {slab_name}: {rate}{note_str}")
                    else:
                        lines.append(f"  • {s}")
            else:
                lines.append(f"  • {slabs}")
                
        # Courier partner rates
        for k, v in pricing_data.items():
            if k.lower() in ["courier_partner_rates", "courier_specific", "partners", "courier_specific_rates"]:
                lines.append("Courier Partner Rates:")
                if isinstance(v, list):
                    for item in v:
                        if isinstance(item, dict):
                            partner = item.get("courier_partner", item.get("partner", ""))
                            service = item.get("service_type", "")
                            zones = item.get("zones", [])
                            zone_strs = []
                            for z in zones:
                                if isinstance(z, dict):
                                    zn = z.get("zone_name", "")
                                    r = z.get("rate_per_500g_inr", z.get("rate_per_1kg_inr", z.get("0-500g_inr", z.get("per_500g_slab_inr", ""))))
                                    zone_strs.append(f"{zn}: ₹{r}")
                            lines.append(f"  • {partner} ({service}): {', '.join(zone_strs)}")
        
        # General fields
        for key in ["minimum_charge_per_shipment", "additional_weight_charge_per_kg_or_500g", "surface_vs_air_rates", "distance_based_rates"]:
            if key in pricing_data:
                val = pricing_data[key]
                if val and not (isinstance(val, dict) and val.get("no_data")):
                    key_clean = key.replace("_", " ").title()
                    if isinstance(val, dict):
                        val_str = ", ".join(f"{k.replace('_', ' ').title()}: {v}" for k, v in val.items())
                    else:
                        val_str = str(val)
                    lines.append(f"{key_clean}: {val_str}")
                    
        if lines:
            return "\n".join(lines)
        
        # Fallback
        fallback_lines = []
        for k, v in pricing_data.items():
            k_clean = k.replace("_", " ").title()
            if isinstance(v, dict):
                if v.get("no_data") == True:
                    fallback_lines.append(f"{k_clean}: No data — {v.get('reason', '')}")
                else:
                    v_str = ", ".join(f"{sk.replace('_', ' ').title()}: {sv}" for sk, sv in v.items())
                    fallback_lines.append(f"{k_clean}: {v_str}")
            elif isinstance(v, list):
                fallback_lines.append(f"{k_clean}: {', '.join(str(x) for x in v)}")
            else:
                fallback_lines.append(f"{k_clean}: {v}")
        return "\n".join(fallback_lines)
        
    elif isinstance(pricing_data, list):
        lines = []
        for item in pricing_data:
            if isinstance(item, dict):
                # Check if it is a weight slab item directly
                if "weight_slab" in item or "slab" in item:
                    slab_name = item.get("weight_slab", item.get("slab", "Slab"))
                    rate = item.get("rate_range_inr", item.get("rate_inr", item.get("rate", "")))
                    notes = item.get("notes", "")
                    note_str = f" ({notes})" if notes else ""
                    lines.append(f"• {slab_name}: {rate}{note_str}")
                else:
                    partner = item.get("courier_partner", "")
                    service = item.get("service_type", "")
                    zones = item.get("zones", [])
                    zone_strs = []
                    for z in zones:
                        if isinstance(z, dict):
                            zn = z.get("zone_name", "")
                            r = None
                            for rate_key in ["rate_per_500g_inr", "rate_per_1kg_inr", "0-500g_inr", "per_500g_slab_inr", "rate_range_inr", "rate_per_kg_inr"]:
                                if rate_key in z:
                                    r = z[rate_key]
                                    break
                            if r is not None:
                                zone_strs.append(f"{zn}: ₹{r}")
                            else:
                                notes = z.get("notes", "")
                                if notes:
                                    zone_strs.append(f"{zn}: {notes}")
                    partner_str = f"{partner} " if partner else ""
                    service_str = f"({service}) " if service else ""
                    lines.append(f"• {partner_str}{service_str}: {', '.join(zone_strs)}")
            else:
                lines.append(f"• {item}")
        return "\n".join(lines)
        
    return str(pricing_data)

def format_cod(cod_data):
    if not cod_data:
        return "No COD charges found."
        
    if isinstance(cod_data, dict):
        if cod_data.get("no_data") == True:
            return f"No COD details: {cod_data.get('reason', '')}"
            
        lines = []
        
        gen = cod_data.get("general_cod_fee", cod_data.get("standard_cod_fee"))
        if gen:
            if isinstance(gen, dict):
                fee = gen.get("fee_details", gen.get("value", ""))
                notes = gen.get("notes", "")
                note_str = f" ({notes})" if notes else ""
                lines.append(f"Standard COD Fee: {fee}{note_str}")
            else:
                lines.append(f"Standard COD Fee: {gen}")
                
        early = cod_data.get("early_cod_remittance", cod_data.get("remittance_cycle"))
        if early:
            lines.append("Remittance Options:")
            if isinstance(early, list):
                for item in early:
                    if isinstance(item, dict):
                        rem_type = item.get("type", "")
                        fee = item.get("fee_details", item.get("fee_percentage", ""))
                        fee_str = f" (Fee: {fee}%)" if isinstance(fee, (int, float)) else f" ({fee})"
                        lines.append(f"  • {rem_type}{fee_str}")
                    else:
                        lines.append(f"  • {item}")
            else:
                lines.append(f"  • {early}")
                
        courier_fees = cod_data.get("courier_specific_cod_fees")
        if courier_fees and isinstance(courier_fees, list):
            lines.append("Courier Specific COD:")
            for item in courier_fees:
                if isinstance(item, dict):
                    partner = item.get("courier_partner", "")
                    pct = item.get("cod_fee_percentage_of_order_value", "")
                    flat = item.get("cod_minimum_flat_fee_inr", "")
                    lines.append(f"  • {partner}: {pct}% or ₹{flat} minimum")
                    
        # Other text fields
        for k, v in cod_data.items():
            if k not in ["general_cod_fee", "standard_cod_fee", "early_cod_remittance", "remittance_cycle", "courier_specific_cod_fees", "no_data", "reason"]:
                k_clean = k.replace("_", " ").title()
                if k == "fedex_cod_price_difference" and isinstance(v, dict):
                    lines.append("FedEx COD Price Difference:")
                    notes = v.get("notes", "")
                    if notes:
                        lines.append(f"  • Note: {notes}")
                    zones = v.get("zones", [])
                    for z in zones:
                        if isinstance(z, dict):
                            lines.append(f"  • {z.get('zone_name')}: +₹{z.get('difference_inr')}")
                elif isinstance(v, dict):
                    v_str = ", ".join(f"{sk.replace('_', ' ').title()}: {sv}" for sk, sv in v.items())
                    lines.append(f"{k_clean}: {v_str}")
                elif isinstance(v, list):
                    lines.append(f"{k_clean}: {', '.join(str(x) for x in v)}")
                else:
                    lines.append(f"{k_clean}: {v}")
                    
        if lines:
            return "\n".join(lines)
            
    return str(cod_data)

def format_discounts(discount_data):
    if not discount_data:
        return "No volume discount plans found."
        
    if isinstance(discount_data, dict):
        if discount_data.get("no_data") == True:
            return f"No volume discounts: {discount_data.get('reason', '')}"
            
        lines = []
        plans = discount_data.get("plans")
        if plans and isinstance(plans, list):
            lines.append("Volume Discount Tiers:")
            for p in plans:
                if isinstance(p, dict):
                    name = p.get("plan_name", "")
                    vol = p.get("monthly_shipment_volume_range", "")
                    cost = p.get("avg_shipment_cost_inr", "")
                    fee = p.get("monthly_plan_fee_inr", "")
                    lines.append(f"  • {name} Plan ({vol} shipments/mo): Avg cost ₹{cost}, Fee: ₹{fee}")
                    
        notes = discount_data.get("general_notes")
        if notes and isinstance(notes, list):
            lines.append("Notes & Conditions:")
            for n in notes:
                if isinstance(n, dict):
                    lines.append(f"  • {n.get('note', '')}")
                else:
                    lines.append(f"  • {n}")
                    
        for k, v in discount_data.items():
            if k not in ["plans", "general_notes", "no_data", "reason"]:
                k_clean = k.replace("_", " ").title()
                if isinstance(v, (dict, list)):
                    lines.append(f"{k_clean}: {json.dumps(v)}")
                else:
                    lines.append(f"{k_clean}: {v}")
                    
        if lines:
            return "\n".join(lines)
            
    return str(discount_data)

def format_other_charges(other_data):
    if not other_data:
        return "No other charges specified."
    if isinstance(other_data, list):
        lines = []
        for item in other_data:
            if isinstance(item, dict):
                t = item.get("type", "")
                val = item.get("percentage_of_base_freight", item.get("percentage", item.get("fee_inr", item.get("fee_range_inr", item.get("fee_details", "")))))
                note = item.get("notes", "")
                note_str = f" — {note}" if note else ""
                lines.append(f"• {t}: {val}{note_str}")
            else:
                lines.append(f"• {item}")
        return "\n".join(lines)
    elif isinstance(other_data, dict):
        lines = []
        for k, v in other_data.items():
            k_clean = k.replace("_", " ").title()
            if isinstance(v, (dict, list)):
                lines.append(f"{k_clean}: {json.dumps(v)}")
            else:
                lines.append(f"{k_clean}: {v}")
        return "\n".join(lines)
    return str(other_data)

def format_eta(eta_data):
    if not eta_data:
        return "No ETA details specified."
    if isinstance(eta_data, list):
        lines = []
        for item in eta_data:
            if isinstance(item, dict):
                srv = item.get("service", "")
                t = item.get("time_in_business_days", "")
                note = item.get("notes", "")
                note_str = f" ({note})" if note else ""
                lines.append(f"• {srv}: {t} days{note_str}")
            else:
                lines.append(f"• {item}")
        return "\n".join(lines)
    return str(eta_data)

def _flatten_for_excel(result: dict) -> dict:
    """Flatten the nested research result into a flat dict suitable for an Excel row."""
    company_name = result.get("company", "")
    
    # Allow pre-flattened fields
    status_str = result.get("research_status")
    if status_str is None:
        is_success = result.get("success", False)
        status_str = "SUCCESS" if is_success else "PARTIAL/FAILED"

    pricing_text = result.get("pricing_rate_card")
    cod_text = result.get("cod_charges")
    discount_text = result.get("volume_discounts")
    other_text = result.get("other_charges")
    eta_text = result.get("eta_delivery_time")
    sources_text = result.get("sources")

    data = result.get("data", {})
    if not isinstance(data, dict):
        data = {}

    if pricing_text is None:
        base_pricing = data.get("base_price", data.get("BASE_PRICE_RATE_CARD"))
        zone_pricing = data.get("zone_pricing", data.get("ZONE_PINCODE_PRICING"))
        pricing_text = "--- BASE RATES ---\n" + format_pricing(base_pricing)
        if zone_pricing:
            pricing_text += "\n\n--- ZONE RATES ---\n" + format_pricing(zone_pricing)

    if cod_text is None:
        cod_charges = data.get("cod_charges", data.get("COD_CASH_ON_DELIVERY_CHARGES"))
        cod_text = format_cod(cod_charges)

    if discount_text is None:
        volume_discounts = data.get("volume_discounts", data.get("VOLUME_SCALE_DISCOUNTS"))
        discount_text = format_discounts(volume_discounts)

    if other_text is None:
        other_charges = data.get("other_charges")
        other_text = format_other_charges(other_charges)

    if eta_text is None:
        eta_days = data.get("eta_days")
        eta_text = format_eta(eta_days)

    # Read sources list
    source_urls = []
    if sources_text is None or isinstance(sources_text, list):
        sources = sources_text if sources_text is not None else result.get("sources", [])
        for s in sources:
            if isinstance(s, dict):
                source_urls.append(s.get("url", s.get("uri", "")))
            elif isinstance(s, str):
                source_urls.append(s)
        sources_text = "\n".join(source_urls[:15]) if source_urls else "DuckDuckGo discovery / Official Site"
    else:
        source_urls = sources_text.split("\n") if sources_text else []

    row = {
        "company": company_name,
        "research_status": status_str,
        "pricing_rate_card": pricing_text.strip(),
        "cod_charges": cod_text.strip(),
        "volume_discounts": discount_text.strip(),
        "other_charges": other_text.strip(),
        "eta_delivery_time": eta_text.strip(),
        "sources": sources_text.strip(),
        "pages_scraped": result.get("pages_scraped", 0),
        "pages_with_data": result.get("pages_with_data", 0),
        "source_count": len(source_urls),
        "timestamp": datetime.now().isoformat(),
    }
    return row



def _save_incremental(results: list, sources_log: list, previously_completed: set):
    """Save current results to Excel — called after every company for crash resilience."""
    try:
        # Load any previously saved data
        existing_rows = []
        if os.path.exists(EXCEL_PATH):
            try:
                existing_df = pd.read_excel(EXCEL_PATH, sheet_name="Pricing Data")
                # Map headers back to lowercase keys for deduplication
                reverse_rename_map = {v: k for k, v in RENAME_MAP.items()}
                existing_df = existing_df.rename(columns=reverse_rename_map)
                existing_rows = existing_df.to_dict("records")
            except Exception:
                pass

        # Combine existing + new results
        all_rows = existing_rows + results

        # Deduplicate by company name (keep latest)
        seen = {}
        for row in all_rows:
            company = row.get("company", "").lower()
            if company:
                seen[company] = row
        deduped = list(seen.values())

        # Create DataFrames
        pricing_df = pd.DataFrame(deduped)

        # Reorder columns — most important first
        priority_cols = [
            "company", "research_status", "pricing_rate_card", "cod_charges",
            "volume_discounts", "other_charges", "eta_delivery_time", "sources",
            "pages_scraped", "pages_with_data", "source_count", "timestamp"
        ]
        existing_cols = [c for c in priority_cols if c in pricing_df.columns]
        remaining_cols = [c for c in pricing_df.columns if c not in priority_cols]
        pricing_df = pricing_df[existing_cols + remaining_cols]

        # Rename to clean human-readable headers
        pricing_df_export = pricing_df.rename(columns=RENAME_MAP)

        # Write to Excel with multiple sheets
        with pd.ExcelWriter(EXCEL_PATH, engine="openpyxl") as writer:
            pricing_df_export.to_excel(writer, sheet_name="Pricing Data", index=False)

            if sources_log:
                sources_df = pd.DataFrame(sources_log)
                sources_df.to_excel(writer, sheet_name="Sources Log", index=False)

            # Summary sheet
            summary_data = {
                "Metric": [
                    "Total Companies",
                    "Successfully Researched",
                    "Failed / No Data",
                    "Total Pages Scraped",
                    "Pages with Pricing Data",
                    "Last Updated",
                ],
                "Value": [
                    len(deduped),
                    len([r for r in deduped if r.get("research_status") == "SUCCESS"]),
                    len([r for r in deduped if r.get("research_status") != "SUCCESS"]),
                    sum(r.get("pages_scraped", 0) for r in deduped),
                    sum(r.get("pages_with_data", 0) for r in deduped),
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ],
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name="Summary", index=False)

        # Style with openpyxl
        try:
            import openpyxl
            wb = openpyxl.load_workbook(EXCEL_PATH)
            ws = wb["Pricing Data"]
            
            font_family = "Segoe UI"
            header_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")
            data_font = Font(name=font_family, size=10)
            header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
            thin_border = Border(
                left=Side(style='thin', color='D9D9D9'),
                right=Side(style='thin', color='D9D9D9'),
                top=Side(style='thin', color='D9D9D9'),
                bottom=Side(style='thin', color='D9D9D9')
            )
            
            for row in range(1, ws.max_row + 1):
                for col in range(1, ws.max_column + 1):
                    cell = ws.cell(row=row, column=col)
                    cell.border = thin_border
                    if row == 1:
                        cell.font = header_font
                        cell.fill = header_fill
                        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                    else:
                        cell.font = data_font
                        cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
                        
            ws.column_dimensions['A'].width = 18  # Company name
            ws.column_dimensions['B'].width = 18  # Research Status
            ws.column_dimensions['C'].width = 65  # Pricing
            ws.column_dimensions['D'].width = 50  # COD
            ws.column_dimensions['E'].width = 50  # Volume Discounts
            ws.column_dimensions['F'].width = 40  # Other Charges
            ws.column_dimensions['G'].width = 25  # ETA
            ws.column_dimensions['H'].width = 40  # Sources
            
            ws.row_dimensions[1].height = 25
            
            for r in range(2, ws.max_row + 1):
                max_lines = 1
                for col in range(1, ws.max_column + 1):
                    val = str(ws.cell(row=r, column=col).value or "")
                    lines = len(val.split("\n"))
                    if lines > max_lines:
                        max_lines = lines
                ws.row_dimensions[r].height = max(60, min(max_lines * 15 + 10, 350))
                
            wb.save(EXCEL_PATH)
        except Exception as style_err:
            print(f"    ⚠ Styling Excel failed: {style_err}")

        # Also save sources log separately
        if sources_log:
            try:
                sources_df = pd.DataFrame(sources_log)
                sources_df.to_excel(SOURCES_LOG_PATH, index=False)
            except Exception:
                pass

    except Exception as e:
        print(f"    ⚠ Excel save failed: {e}")
        # Emergency CSV fallback
        try:
            import csv
            csv_path = EXCEL_PATH.replace(".xlsx", "_emergency.csv")
            if results:
                # Map keys to match rename_map for emergency CSV
                csv_results = []
                for r in results:
                    csv_row = {}
                    for k, v in r.items():
                        csv_row[RENAME_MAP.get(k, k)] = v
                    csv_results.append(csv_row)
                
                keys = set()
                for r in csv_results:
                    keys.update(r.keys())
                with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
                    writer = csv.DictWriter(f, fieldnames=sorted(keys))
                    writer.writeheader()
                    writer.writerows(csv_results)
                print(f"    ✓ Emergency CSV saved: {csv_path}")
        except Exception as e2:
            print(f"    ✗ Emergency CSV also failed: {e2}")


if __name__ == "__main__":
    main()
