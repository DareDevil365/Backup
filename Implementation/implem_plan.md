# Nivesh — Final Implementation Plan (v2)
### From Broken Prototype → Production-Grade Indian Equity Research Platform
**Role:** Principal Software Architect & Lead Quantitative Engineer  
**Target:** Antigravity (Gemini 3.6 Flash agent)  
**Budget:** ₹0 — Free-tier everything  
**Date:** 26 July 2026  
**Status:** Awaiting user approval to begin execution

---

## Executive Summary

After auditing all 37 source files (16 backend + 21 frontend), testing every feature live, and analyzing SimplyWall.St / Screener.in / Tijori Finance — this is the **final, approved blueprint** to transform the current broken prototype into a production-grade Indian equity research platform.

**Current State:** 42+ flaws including fabricated financial data (fake ROCE, fake Sharpe ratios, hardcoded promoter holdings), only 6-15 stocks work, NL parser is a crude keyword matcher, CSV upload is fake, DCF calculator is meaningless, entire app broken on mobile.

**Target State:** A platform that genuinely rivals SimplyWall.St's visual analysis, Screener.in's data depth, and adds natural-language backtesting + trading psychology analysis — all on free infrastructure with smart Gemini API rotation across 7 keys.

---

## Resolved Decisions (from your feedback)

| Question | Decision |
|----------|----------|
| Stock Universe | **Nifty 500** (~covers 95%+ of NSE market cap). Expand later. |
| Broker CSV Formats | Build parsers from **publicly documented formats** (Zerodha Console, Groww, Upstox) |
| Gemini API | **7-key rotation** with credit monitoring, model-tier-aware task routing, automatic cooldown |
| Supabase/Upstash | You have accounts — setup guide included below (§1.1) |
| Deployment | Vercel (frontend) — setup guide included below (§1.2). Backend URL via `.env` |
| AI vs Code | **Code-first always.** AI used only where it genuinely adds value (NL parsing, narration). Every AI feature has a full non-AI fallback. |

---

## §0 — Infrastructure Setup Guide

> [!IMPORTANT]
> Before any code changes, you need to provide credentials from your existing accounts. Here's exactly what to get from each service.

### 0.1 Supabase — What to Give Me

1. Go to [app.supabase.com](https://app.supabase.com) → your project
2. Click **Settings** (gear icon) → **API** section
3. I need these 3 values:

| Setting | Where to find it | Example format |
|---------|-------------------|----------------|
| **Project URL** | Settings → API → "Project URL" | `https://xyzabc123.supabase.co` |
| **Anon (public) Key** | Settings → API → "Project API keys" → `anon` `public` | `eyJhbGciOiJIUzI1NiIs...` (long JWT) |
| **Service Role Key** | Settings → API → "Project API keys" → `service_role` `secret` | `eyJhbGciOiJIUzI1NiIs...` (long JWT) |

> [!WARNING]
> The **service_role key** has full database access. Never expose it in frontend code or commit it to git. It goes in the backend `.env` only.

### 0.2 Upstash Redis — What to Give Me

1. Go to [console.upstash.com](https://console.upstash.com) → your Redis database
2. Click on the database → **REST API** section
3. I need these 2 values:

| Setting | Where to find it | Example format |
|---------|-------------------|----------------|
| **UPSTASH_REDIS_REST_URL** | REST API → "UPSTASH_REDIS_REST_URL" | `https://xyz-abc-12345.upstash.io` |
| **UPSTASH_REDIS_REST_TOKEN** | REST API → "UPSTASH_REDIS_REST_TOKEN" | `AXyz123...` (long string) |

### 0.3 Vercel — Deployment Steps (I'll guide you)

For now, the frontend runs locally. When we're ready to deploy:

1. Install Vercel CLI: `npm i -g vercel`
2. From `/frontend`: `vercel` → follow prompts → link to your Vercel account
3. Set environment variable in Vercel dashboard: `NEXT_PUBLIC_API_URL` = your Render backend URL
4. Every `git push` auto-deploys

### 0.4 Environment File Template

I will create this `.env` file in the backend (already `.gitignore`'d):

```env
# === SUPABASE ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# === UPSTASH REDIS ===
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token

# === GEMINI API (7-key rotation) ===
GEMINI_API_KEYS=key1,key2,key3,key4,key5,key6,key7

# === APP CONFIG ===
FRONTEND_URL=http://localhost:3000
ENV=development
```

And for the frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## §1 — Gemini API Rotation Framework

> [!IMPORTANT]
> This is a custom framework designed for your specific situation: 7 free-tier API keys, each with limited credits that degrade to lesser models when exhausted. The framework maximizes value from every key.

### 1.1 Architecture: `GeminiKeyRotator`

```
┌──────────────────────────────────────────────────────────────┐
│                    GeminiKeyRotator                           │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     ┌─────────┐      │
│  │  Key 1  │ │  Key 2  │ │  Key 3  │ ... │  Key 7  │      │
│  │ credits:│ │ credits:│ │ credits:│     │ credits:│      │
│  │  ██░░░  │ │  █████  │ │  ███░░  │     │  ████░  │      │
│  │  tier:  │ │  tier:  │ │  tier:  │     │  tier:  │      │
│  │  flash  │ │  flash  │ │  lite   │     │  flash  │      │
│  │ cooldown│ │  ready  │ │  ready  │     │  ready  │      │
│  └─────────┘ └─────────┘ └─────────┘     └─────────┘      │
│                                                              │
│  Task Router:                                                │
│  ├─ HEAVY tasks (NL parsing, doc synthesis) → Flash keys     │
│  ├─ LIGHT tasks (tagging, classification) → Flash-Lite keys  │
│  └─ If all Flash exhausted → degrade to Flash-Lite           │
│                                                              │
│  Rules:                                                      │
│  ├─ Round-robin within tier                                  │
│  ├─ 429/quota error → mark key as cooldown (60s)             │
│  ├─ Model degraded → move key to LITE tier                   │
│  ├─ All keys exhausted → return non-AI fallback              │
│  └─ Per-key call counter + daily reset                       │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Task Classification & Budget

| Task | Tier Required | Tokens (~) | Frequency | Cache? |
|------|---------------|-----------|-----------|--------|
| **NL Strategy → JSON** | Flash (Heavy) | ~500 in + ~200 out | Per new strategy text | ✅ Forever by text hash |
| **Backtest result narration** | Flash-Lite OK | ~300 in + ~150 out | Per unique strategy+range | ✅ Forever by hash |
| **Behavior report narration** | Flash-Lite OK | ~400 in + ~200 out | Per trade-set hash | ✅ Forever by hash |
| **Document filing summary** | Flash (Heavy) | ~1000 in + ~200 out | Per new document | ✅ Forever by doc hash |
| **Filing triage/tagging** | Flash-Lite OK | ~200 in + ~50 out | Per new filing | ✅ Forever |
| **"What we found" narration** | ❌ NOT NEEDED | 0 | — | Template-based, no AI |
| **Pros/Cons generation** | ❌ NOT NEEDED | 0 | — | Rule-based, no AI |
| **Snowflake scoring** | ❌ NOT NEEDED | 0 | — | Pure math, no AI |
| **All indicator calculations** | ❌ NOT NEEDED | 0 | — | Pure pandas, no AI |
| **All backtest execution** | ❌ NOT NEEDED | 0 | — | Pure numpy, no AI |
| **All behavior metrics** | ❌ NOT NEEDED | 0 | — | Pure statistics, no AI |

**Key insight:** The vast majority of the product is pure code. AI is used for exactly 5 task types, all cached forever, so each unique input costs exactly 1 API call — ever.

### 1.3 Credit Monitoring Dashboard

The backend will expose a `/api/admin/gemini-status` endpoint (protected, dev-only) showing:
```json
{
  "keys": [
    {"id": "key_1", "tier": "flash", "calls_today": 42, "errors_today": 1, "status": "active", "cooldown_until": null},
    {"id": "key_2", "tier": "flash", "calls_today": 38, "errors_today": 0, "status": "active", "cooldown_until": null},
    {"id": "key_3", "tier": "flash_lite", "calls_today": 95, "errors_today": 5, "status": "degraded", "cooldown_until": null},
    ...
  ],
  "total_calls_today": 280,
  "cache_hit_rate": "94.2%",
  "estimated_remaining": "~1,400 calls across all keys"
}
```

---

## §2 — Complete Flaw Registry (What's Broken Today)

### 🔴 CRITICAL — 14 Ship-Blockers

| # | File | Flaw | Why It Matters |
|---|------|------|----------------|
| C1 | [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py) | ROCE computed as `ebit / total_assets` instead of `ebit / capital_employed` | Wrong financial ratio shown to users |
| C2 | [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py) | `pledged_shares_pct` hardcoded to `0.0` for every stock | Hides real pledge risk |
| C3 | [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py) | ROE/D-E heuristic boundaries wrong — ROE of 1.2 (120%) gets multiplied to 12000% | Garbage numbers displayed |
| C4 | [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py) | `data_source` always returns `"live"` even when using heuristic fallbacks | Users can't tell if data is real |
| C5 | [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py) | In-memory cache has no max size — memory leak if thousands of tickers queried | Server crashes over time |
| C6 | [backtest_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/backtest_engine.py) | Equity curve `cash` variable never updated on trade exit — curve resets after every trade | Backtest results are wrong |
| C7 | [backtest_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/backtest_engine.py) | P&L calculated as `(price - entry) / entry * initial_capital` — ignores compounding | Returns are wrong |
| C8 | [backtest_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/backtest_engine.py) | Sharpe ratio capped between [-3, 5] with fallback of 1.0 — arbitrary clipping | Misleading risk metric |
| C9 | [nse_stock_master.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/nse_stock_master.py) | Docstring claims "~500+" stocks but only ~160 entries. 7 duplicate keys silently overwritten | Missing stocks, data integrity |
| C10 | [indicators.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/indicators.py) | RSI warm-up with `adjust=False` + `min_periods=1` → wrong early values, collapsed Bollinger Bands | Charts show wrong indicators |
| C11 | [snowflake_calculator.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/snowflake_calculator.py) | Value score checks `rev_growth > 10` (a growth metric), Future score checks `roe > 15` (a past metric) — axes are cross-contaminated | Snowflake scores are misleading |
| C12 | [snowflake_calculator.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/snowflake_calculator.py) | Dividend score uses `roe > 15` as proxy — non-dividend stocks can score 3/6 on Dividend axis | Fundamentally wrong scoring |
| C13 | All frontend files (7+) | Hardcoded `http://localhost:8000` in every API call | Will break in production |
| C14 | [behavior_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/behavior_engine.py) | Disposition Effect uses holding-time ratio instead of standard PGR-PLR formula | Wrong psychological metric |

### 🟠 HIGH — 12 Broken/Fake Features

| # | File | Flaw |
|---|------|------|
| H1 | [backtest.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/backtest.py) | NL parser is regex-only, never uses Gemini API key from config. Silently ignores unrecognized strategies. |
| H2 | [backtest.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/backtest.py) | Regex `r'\b\d+\.?\d*\b'` matches ANY number in text — catches dates, capital amounts, not just thresholds |
| H3 | [research.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/research.py) | Leaderboard, insider trades, documents — ALL return hardcoded static mock data |
| H4 | [pseudo_brain.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/pseudo_brain.py) | `get_company_research_notes()` returns same mock data for every ticker. `classify_filing_by_triage_rules()` exists but is never called. |
| H5 | [watchlist.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/watchlist.py) | In-memory dicts — all data lost on restart. Alert ID collision on delete. Shared across ALL users. |
| H6 | [behavior.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/behavior.py) | Upload endpoint expects JSON not file upload. Falls back to `SAMPLE_TRADES` silently. |
| H7 | [page.tsx (home)](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/page.tsx) | `FEATURED_STOCKS` has static hardcoded prices — never fetches live data |
| H8 | [DCFCalculator.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/components/DCFCalculator.tsx) | FCF hardcoded as `currentPrice * 0.04` (4% yield assumption). When WACC ≈ terminal growth, fair value explodes to infinity. |
| H9 | [page.tsx (screener)](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/screener/page.tsx) | Custom query builder form exists but the backend caps screening universe to 60 stocks max |
| H10 | [screener_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/screener_engine.py) | `ThreadPoolExecutor(10)` fires 60 parallel yfinance requests — triggers rate limiting/429s |
| H11 | [companies.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/companies.py) | `df.where(pd.notnull(df), None)` doesn't consistently serialize NaN to JSON null | 
| H12 | [test_backend.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/test_backend.py) | Claims "100% ENDPOINTS OPERATING PERFECTLY" — only tests GETs, uses `print()` not `assert`, no schema validation |

### 🟡 MEDIUM — 10 UX/Polish Issues

| # | Issue |
|---|-------|
| M1 | No footer component anywhere in the app |
| M2 | `GlossaryTooltip` — hover-only (broken on mobile touch), clips at screen edges, no keyboard focus |
| M3 | `StockChart` — fixed 380px height, no timeframe buttons (1D/1W/1M/1Y/5Y/Max), no crosshair tooltips |
| M4 | `SnowflakeChart` — axis labels clip on screens < 360px, no hover showing individual pass/fail checks |
| M5 | `backtester/page.tsx` — 710-line monolithic component, should be decomposed |
| M6 | `behavior/page.tsx` — CSV parser uses naive `split(",")` — fails on quoted strings |
| M7 | `leaderboard/page.tsx` — "Clone & Backtest" button navigates to `/backtester` but doesn't pass strategy params |
| M8 | All external links lack `rel="noopener noreferrer"` and accessible "opens in new tab" text |
| M9 | No ARIA attributes — combobox roles, tab roles, alert roles missing throughout |
| M10 | `screener/page.tsx` — no pagination, no sticky table headers, CSV filename always uses preset name |

### 🟣 MISSING — 22 Spec Features Not Built

| # | Feature | Spec § |
|---|---------|--------|
| G1 | Financial Statements tab (5yr P&L / BS / CF with YoY sparklines) | §3.1.7 |
| G2 | Shareholding pattern over time (stacked bar: Promoter/FII/DII/Public) | §3.1.8 |
| G3 | Insider & Bulk/Block Deal activity feed (live from SEBI/NSE) | §3.1.11 |
| G4 | Documents & Filings tab (corporate announcements, annual reports) | §3.1.12 |
| G5 | Business segment revenue breakdown (Tijori-style donut) | §3.1.10 |
| G6 | Peer comparison with auto-detected sector peers | §3.1.6 |
| G7 | Chart timeframe buttons (1D/1W/1M/1Y/5Y/Max) | §3.2 |
| G8 | Chart drawing tools (trendline, horizontal ray) | §3.2 |
| G9 | Lazy-fetch-and-cache-forever historical data | §2.4 |
| G10 | Missing behavior metrics: Overtrading, Time-of-Day patterns, Sector Concentration (HHI) | §3.4 |
| G11 | Broker CSV parsers (Zerodha Console, Groww, Upstox) | §3.4 |
| G12 | AI Research Digest pipeline (live announcement → triage → Gemini synthesis) | §3.8 |
| G13 | Corporate announcement polling (every 15-30 min via `nse`/`pnsea` packages) | §3.8 |
| G14 | Proper treemap heatmap (sized by market cap, not uniform grid) | §3.7 |
| G15 | Investor Score gamification | §3.7 |
| G16 | Shareable report card (canvas → PNG export) | §3.7 |
| G17 | Strategy Leaderboard with real published strategies | §3.7 |
| G18 | Email alert delivery (Resend free tier) | §3.6 |
| G19 | GitHub Actions cron jobs (EOD refresh, keep-alive, announcement poll) | §2.2, §9 |
| G20 | Supabase Auth (email + Google OAuth) | §7 |
| G21 | Row-Level Security on user-owned tables | §7 |
| G22 | Database actually connected and used (currently everything is in-memory) | §4 |

---

## §3 — Phased Build Plan

---

### Phase 1: Foundation & Critical Data Integrity
**Goal:** Fix every fake/wrong value. Wire up real infrastructure. Make any Nifty 500 stock searchable and show correct data.  
**Estimated effort:** 3-4 days  
**Dependencies:** Supabase & Upstash credentials from you

---

#### 1.1 Infrastructure Wiring

##### [NEW] [backend/services/gemini_client.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/gemini_client.py)
The `GeminiKeyRotator` class:
- Reads `GEMINI_API_KEYS` from env (comma-separated list of 7 keys).
- Maintains per-key state: `{calls_today, errors_today, tier, cooldown_until, last_used}`.
- **Task-aware routing:**
  - `call(task_type="heavy", prompt=..., schema=...)` → picks a Flash-tier key
  - `call(task_type="light", prompt=..., schema=...)` → picks any available key (prefers Flash-Lite to conserve Flash quota)
- **Error handling:**
  - HTTP 429 (rate limit) → mark key as cooldown for 60 seconds, rotate to next
  - HTTP 400 (model degraded/quota) → mark key tier as `flash_lite`, continue
  - All keys exhausted → return `None` (caller uses non-AI fallback)
- **Structured output only:** Every call uses Gemini's JSON-schema response mode — never freeform text.
- **Credit monitoring:** Exposes `get_status() → dict` for the admin endpoint.
- **Daily reset:** Call counter resets at midnight IST.

##### [NEW] [backend/services/cache_manager.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/cache_manager.py)
Unified cache layer abstracting Redis + in-memory fallback:
- `get(key) → value | None` — tries Redis first, falls back to in-memory LRU
- `set(key, value, ttl=None)` — writes to both Redis and in-memory
- `set_permanent(key, value)` — for historical data (TTL = ∞)
- If Upstash connection fails → degrades silently to in-memory-only (product still works)

##### [NEW] [backend/services/db_client.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/db_client.py)
Supabase client wrapper:
- Initializes Supabase client from env vars
- Provides typed helpers: `upsert_company()`, `get_price_cache()`, `save_watchlist()`, etc.
- If Supabase connection fails → degrades to in-memory storage with a logged warning

##### [MODIFY] [backend/config.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/config.py)
- Add `GEMINI_API_KEYS` (comma-separated), `SUPABASE_SERVICE_KEY`, `FRONTEND_URL`, `ENV`
- Add validation: warn on startup if critical vars are empty (don't crash — degrade gracefully)

##### [MODIFY] [backend/main.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/main.py)
- CORS: restrict to `FRONTEND_URL` from env (default `http://localhost:3000` for dev)
- Add rate limiting middleware (simple token bucket, 100 req/min per IP)
- Add global exception handler — never expose raw stack traces

##### [NEW] [frontend/src/lib/api.ts](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/lib/api.ts)
Centralized API helper:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const api = {
  get: (path: string) => fetch(`${API_BASE}${path}`).then(handleResponse),
  post: (path: string, body: any) => fetch(`${API_BASE}${path}`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body) }).then(handleResponse),
};
```
- Replace ALL hardcoded `http://localhost:8000` across 9+ files with `api.get()` / `api.post()`

---

#### 1.2 Backend Data Integrity Fixes

##### [MODIFY] [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py) — 6 fixes
1. **Fix ROCE:** `ROCE = EBIT / (Total Assets - Current Liabilities)`. Fallback: labeled "estimated" not silent fake.
2. **Fix ROE heuristic:** Replace boundary-based guess with explicit `* 100 if raw < 1.0 else raw` (handles actual decimal vs percentage).
3. **Fix D/E heuristic:** Same approach — detect format explicitly.
4. **Fix `data_source` flag:** Return `"estimated"` when using proxy calculations, `"unavailable"` when data truly missing.
5. **Add `pledged_shares_pct: null`** (not 0.0) when data unavailable. Frontend shows "N/A".
6. **Add LRU cache with TTL:** `maxsize=500`, `ttl=900` (15 min). Prevents memory leak.

##### [MODIFY] [backtest_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/backtest_engine.py) — 4 fixes
1. **Fix equity curve:** Track `cash` as running total. On trade exit: `cash += (exit_price - entry_price) * shares`. During position: `portfolio_value = cash_not_in_position + shares * current_price`.
2. **Fix P&L compounding:** Position size based on current cash, not always `initial_capital`.
3. **Fix Sharpe ratio:** `(mean(daily_returns) / std(daily_returns)) * sqrt(252)`. No arbitrary capping. Return `0.0` if std = 0.
4. **Fix CAGR:** `((end_value / start_value) ** (252 / trading_days) - 1) * 100`.

##### [MODIFY] [indicators.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/indicators.py) — 3 fixes
1. **Fix RSI:** Use `min_periods=14` (not 1) on EWM to avoid polluted warm-up values.
2. **Fix Bollinger Bands:** Use `min_periods=20` on rolling std.
3. **Fix ADX:** Log actual error instead of silently returning constant 25.0.

##### [MODIFY] [snowflake_calculator.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/snowflake_calculator.py) — Full rewrite
Implement the **SimplyWall.St 30-check binary scoring engine** (6 checks per axis, each pass=1 / fail=0):

```
VALUE AXIS (0-6):
  ✓ P/E < sector median P/E
  ✓ P/B < sector median P/B
  ✓ PEG ratio < 1.0 (P/E ÷ EPS growth rate)
  ✓ Price < estimated DCF intrinsic value
  ✓ Dividend yield > sector median (if paying)
  ✓ Price below 52-week midpoint

FUTURE AXIS (0-6):
  ✓ Revenue CAGR (3yr) > market median
  ✓ EPS CAGR (3yr) > market median
  ✓ Revenue CAGR > 20% (high growth)
  ✓ EPS CAGR > 20% (high growth)
  ✓ ROE > 20% (forward-looking capital efficiency)
  ✓ No earnings decline in 3 of last 5 years

PAST AXIS (0-6):
  ✓ Positive EPS CAGR over 5 years
  ✓ 1yr EPS growth > 5yr average (accelerating)
  ✓ 1yr EPS growth > industry average
  ✓ ROE > 15% (trailing)
  ✓ ROCE > 15% (trailing)
  ✓ Operating Cash Flow > Net Income (earnings quality)

HEALTH AXIS (0-6):
  ✓ Current Ratio > 1.0 (short-term liquidity)
  ✓ D/E ratio < 1.0
  ✓ D/E decreased over 3 years (improving)
  ✓ Net Debt < Equity (acceptable leverage)
  ✓ Operating CF covers > 20% of total debt
  ✓ Interest Coverage (EBIT/Interest) > 3x

DIVIDEND AXIS (0-6):
  ✓ Pays a dividend (yield > 0)
  ✓ Yield > market median
  ✓ Yield in top 25% of dividend payers
  ✓ No dividend cut in last 5 years
  ✓ Payout ratio < 80% (sustainable)
  ✓ Dividend per share has grown over 3 years
```

Each check that passes = +1. Non-dividend stocks score 0/6 on Dividend (correct behavior, not inflated). Each axis clearly separate — no cross-contamination.

##### [MODIFY] [behavior_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/behavior_engine.py) — 2 fixes
1. **Fix Disposition Effect:** Use standard PGR-PLR formula: `PGR = realized_gains / (realized_gains + paper_gains)`, `PLR = realized_losses / (realized_losses + paper_losses)`. Score = `PGR - PLR` (positive = sells winners too fast).
2. **Fix Revenge Trading:** Require time gap AND increased position size (not just ≥90% of previous).

##### [MODIFY] [nse_stock_master.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/nse_stock_master.py) — 2 fixes
1. **Remove 7 duplicate keys** (SUZLON, ZOMATO, JIOFIN, PAYTM, POLICYBZR, NYKAA, DELHIVERY).
2. **Expand to ~500 stocks** covering full Nifty 500 index constituents.

---

#### 1.3 Frontend Critical Fixes

##### [MODIFY] All 9 files with hardcoded URLs
Replace every `http://localhost:8000` with `api.get()`/`api.post()` from `@/lib/api.ts`.

**Files to modify:**
- `StockSearchInput.tsx`, `SectorHeatmap.tsx`, `ResearchDigestCard.tsx`
- `stock/[ticker]/page.tsx`, `screener/page.tsx`, `watchlist/page.tsx`
- `backtester/page.tsx`, `behavior/page.tsx`, `leaderboard/page.tsx`

##### [MODIFY] [page.tsx (home)](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/page.tsx)
- Fetch featured stock data from backend on mount (replace static `FEATURED_STOCKS`).
- Add index ticker bar: NIFTY 50, SENSEX, BANK NIFTY live values.

##### [MODIFY] [page.tsx (stock)](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/stock/%5Bticker%5D/page.tsx)
- Show clear warning banner when `data_source !== "live"`: "⚠ Some data is estimated — live data unavailable for this metric"
- Fix Snowflake score colors: 0-2 = `text-negative`, 3-4 = `text-secondary`, 5-6 = `text-positive`
- Replace `alert()` in Share button with clipboard copy + toast notification

---

### Phase 2: Mobile Responsiveness & Navigation
**Goal:** Make the entire app usable on mobile (375px+).  
**Estimated effort:** 1-2 days

---

##### [MODIFY] [Header.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/components/Header.tsx)
- Fix "Research" link — goes to `/stock/RELIANCE.NS` instead of a dashboard. Rename to "Featured" or create a real `/dashboard` page.
- Add active link highlighting with `usePathname()`.
- Fix mobile menu ARIA attributes.

##### [NEW] [Footer.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/components/Footer.tsx)
- Simple footer: "Built with 🇮🇳 | Data delayed ~15 min | Free & Open Source"
- Links: GitHub, About, API Docs

##### [MODIFY] All pages — responsive pass
- Tables: add `min-w-[700px]` on `<table>` for horizontal scroll on mobile.
- Grids: ensure `grid-cols-1` on mobile for all card grids.
- Stock page: stack Snowflake + chart vertically on `< md` breakpoints.
- Chart: reduce height to `280px` on mobile, `380px` on desktop.
- Touch targets: minimum `44px` on all buttons and interactive elements.
- Ratio cards on stock page: `grid-cols-2` on mobile (not 7).

##### [MODIFY] [layout.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/layout.tsx)
- Add favicon (generate branded "N" icon).
- Add per-page SEO: `<title>`, `<meta description>`.

---

### Phase 3: Backtester — From Broken to Production
**Goal:** Make the strategy backtester genuinely work with correct math, any stock, proper NL parsing via Gemini, and a beautiful equity curve.  
**Estimated effort:** 3-4 days

---

#### 3.1 NL Parser — Real Implementation

##### [MODIFY] [backtest.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/routers/backtest.py)
Complete rewrite of the parse endpoint:

**Layer 1 — Expanded Rule-Based Parser (always runs first):**
- Regex patterns for ALL supported indicators: RSI, SMA, EMA, MACD, Bollinger, ADX, Volume, Price Change
- Regex for ALL conditions: crosses above/below, greater/less than, breakout, touch
- Regex for stop-loss/take-profit: "3% stop loss", "trailing stop 5%", "target 15%"
- Regex for date ranges: "from Jan 2020 to Aug 2020", "last 2 years", "during COVID"
- Regex for scenario names: "Harshad Mehta", "GFC", "demonetization", "COVID", "Adani"
- Returns: `{parsed_fields: {...}, confidence: 0-1, unparsed_text: "..."}`

**Layer 2 — Gemini Flash (runs only if rule-based confidence < 0.8):**
- Uses `GeminiKeyRotator.call(task_type="heavy", ...)`
- Structured JSON output mode with exact Strategy schema
- Validates response against schema (types, enums, ranges)
- If Gemini fails → returns rule-based result with "some fields may need manual entry" flag

**Both layers** land the result back in the Guided Builder UI. Nothing auto-executes.

#### 3.2 Backtester Frontend Overhaul

##### [MODIFY] [backtester/page.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/backtester/page.tsx)
Decompose 710-line monolith into components:

- `StrategyBuilder.tsx` — Guided Builder form (indicator dropdowns, conditions, values)
- `NLPromptInput.tsx` — Free-text input with "Parse to Form" button + feedback
- `ScenarioPresets.tsx` — Historical scenario cards with one-click date ranges
- `BacktestResults.tsx` — Stats cards + equity curve + trade log
- `EquityCurveChart.tsx` — Recharts line chart: strategy vs buy-and-hold benchmark

**Equity Curve Chart spec:**
- Green line: Strategy portfolio value over time
- Grey dashed line: Buy & Hold benchmark
- Red shaded areas: Drawdown periods
- Hover tooltip: Date, Portfolio Value, Benchmark Value, Drawdown %
- Toggle: Linear vs Log scale

**Trade Log Table:**
- Columns: #, Entry Date, Exit Date, Entry Price, Exit Price, P&L ₹, P&L %, Holding Days, Type (Win/Loss)
- Color-coded rows: green for wins, red for losses
- Sortable by any column

#### 3.3 Lazy-Fetch Historical Data (§2.4)

##### [MODIFY] [data_fetcher.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/data_fetcher.py)
Add `get_historical_data(ticker, start_date, end_date)`:
1. Check cache (Redis/Postgres) for requested range
2. Identify gaps (date ranges not yet cached)
3. Fetch only missing dates from yfinance
4. Store permanently (historical data is immutable)
5. Return complete series

Frontend shows: "Fetching historical data — first request only, a few seconds..." on cache miss.

---

### Phase 4: Company Dashboard — Full SimplyWall.St Parity
**Goal:** Transform the stock detail page into a comprehensive visual analysis dashboard.  
**Estimated effort:** 4-5 days

---

#### 4.1 New Backend Endpoints

##### [NEW] `GET /api/companies/{ticker}/financials`
- 5-year Income Statement: Revenue, EBITDA, Net Income, EPS, Margins
- 5-year Balance Sheet: Total Assets, Total Debt, Equity, Current Ratio
- 5-year Cash Flow: Operating CF, CapEx, FCF, Dividend Paid
- YoY % changes for sparklines
- Source: yfinance `.financials`, `.balance_sheet`, `.cashflow`

##### [NEW] `GET /api/companies/{ticker}/shareholding`
- Promoter %, FII %, DII %, Public % (quarterly data)
- Source: Attempt from yfinance `major_holders` / `institutional_holders`
- Fallback: "Shareholding data not available" (honest, not faked)

##### [NEW] `GET /api/companies/{ticker}/insider-activity`
- Recent promoter/director buys and sells
- Source: `pnsea` package for SEBI SAST/PIT disclosures
- Fallback: NSE bulk/block deal data

##### [MODIFY] `GET /api/companies/{ticker}/peers`
- Auto-detect sector peers from same industry group in Nifty 500
- Return top 5 peers sorted by market cap proximity
- Include: Ticker, Name, Market Cap, P/E, P/B, ROE, ROCE, D/E, Div Yield, 1Y Return

#### 4.2 New Frontend Components

##### [NEW] `FinancialStatements.tsx`
- Tabbed view: Income Statement | Balance Sheet | Cash Flow
- 5-year data in a clean table
- Inline sparkline mini-charts for each row showing YoY trend
- Collapsible detailed line items

##### [NEW] `ShareholdingChart.tsx`
- Stacked bar chart (Recharts) showing last 8 quarters
- Segments: Promoter (green), FII (blue), DII (purple), Public (grey)
- Highlight changes: "Promoter decreased 2.3% this quarter" annotation

##### [NEW] `InsiderActivity.tsx`
- Chronological table of insider transactions
- Color: Green rows = Buy, Red rows = Sell
- Columns: Date, Person, Role, Type, Shares, Value (₹ Cr), Source Link

##### [NEW] `PeerComparison.tsx`
- Side-by-side table: current stock highlighted, 4-5 peers
- Sortable columns
- Mini-snowflake icon per peer for quick visual comparison

##### [MODIFY] `DCFCalculator.tsx` — Meaningful DCF
Replace fake formula with real 2-stage DCF:
```
For years 1-5: FCF × (1 + growth_rate)^year
For years 6-10: FCF × (1 + growth_rate/2)^year  (growth decays)
Terminal Value: FCF_year10 × (1 + terminal_growth) / (WACC - terminal_growth)
Fair Value = Sum(PV of all cash flows) / shares_outstanding
```
- Sliders: Revenue Growth (0-40%, default: trailing CAGR), WACC (8-18%, default: 12%), Terminal Growth (0-5%, default: 3%)
- Pre-seeded defaults from company's actual historical data
- Show: Fair Value vs Current Price, Margin of Safety %, verdict (undervalued/overvalued)

##### [MODIFY] Stock page layout
Add tabbed sections below the key stats:
```
[ Overview ] [ Financials ] [ Shareholding ] [ Insider Activity ] [ AI Research ]
```

---

### Phase 5: Screener — Screener.in-Grade Query Builder
**Goal:** Full custom filtering with visual results and proper pagination.  
**Estimated effort:** 2 days

---

##### [MODIFY] [screener_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/screener_engine.py)
- **Pre-compute screener data:** GitHub Actions job fetches fundamentals for all Nifty 500 stocks daily. Screener queries run against cached data, not live API calls.
- **Add pagination:** `page` and `limit` query params.
- **Add sorting:** `sort_by` and `order` query params.
- **Fix heatmap:** Market-cap-weighted sector averages.

##### [MODIFY] [screener/page.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/screener/page.tsx)
- **Custom Filter Panel** (already partially exists — wire it properly):
  - Range sliders: Market Cap, P/E, P/B, ROE, ROCE, D/E, Div Yield, Rev Growth, EPS Growth
  - Sector filter dropdown
  - Boolean toggles: Zero Debt, Dividend Payer, Nifty 50 Only
  - "Run Screen" + "Clear Filters" buttons
- **Results view modes:** Grid (cards with mini-Snowflake) | List (sortable table)
- **Pagination:** Page controls at bottom
- **CSV export:** Download current filtered results
- **Result count:** "Found 47 stocks matching your criteria"
- **Save screen:** Save filter configuration to account (requires auth — Phase 8)

---

### Phase 6: Behavior Analyzer — Full Psychology Engine
**Goal:** Complete 8-metric engine with real CSV upload and proper narration.  
**Estimated effort:** 2-3 days

---

#### 6.1 CSV Upload & Parsing

##### [MODIFY] [behavior/page.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/app/behavior/page.tsx)
- Add real `<input type="file" accept=".csv">` with proper drag-and-drop
- **Smart CSV parser** (replace naive `split(",")`):
  - Handle quoted strings
  - Auto-detect format from column headers:
    - **Zerodha Console:** `symbol, isin, trade_date, exchange, segment, series, trade_type, quantity, price, ...`
    - **Groww:** `Stock Name, ISIN, Buy Date, Buy Price, Sell Date, Sell Price, Quantity, ...`
    - **Generic:** `ticker, buy_date, buy_price, sell_date, sell_price, qty`
  - Show preview table of parsed trades before analysis
- Remove auto-run-on-mount. Show empty state: "Upload your trade history to get started"
- Add "Run Demo Analysis" button (clearly labeled as demo)

#### 6.2 Complete 8-Metric Engine

##### [MODIFY] [behavior_engine.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/behavior_engine.py)
Implement ALL 8 metrics (currently only 5, some wrong):

| # | Metric | Implementation |
|---|--------|---------------|
| 1 | **Disposition Effect (PGR-PLR)** | Fix to standard formula. Positive = sells winners early, holds losers. |
| 2 | **Loss Aversion Ratio** | `avg_loss_pct / max(avg_win_pct, 0.01)`. Ratio > 1 = losses bigger than wins. |
| 3 | **Revenge Trading** | Trades within 48h of a loss AND (position_size > 1.2 × baseline OR trade_count > 2 × weekly_avg) |
| 4 | **Overtrading Score** | `weekly_trade_count / max(baseline_weekly_avg, 1)`. Score > 2 = flagged. |
| 5 | **Position Sizing CV** | `std(position_sizes) / mean(position_sizes)`. CV > 0.5 = erratic. |
| 6 | **Win Rate vs Expectancy** | `expectancy = (win_rate × avg_win) − (loss_rate × avg_loss)`. Show both. |
| 7 | **Time Patterns** | Group P&L by day-of-week. Flag statistically significant underperformance. |
| 8 | **Sector Concentration (HHI)** | `HHI = Σ(sector_weight²)`. HHI > 0.25 = concentrated. |

All pure statistics — zero LLM.

#### 6.3 Narration (Optional AI Layer)

- ONE Gemini Flash-Lite call per unique trade-set hash
- Turns metrics into advice: "You hold losing positions 2.4x longer than winners — a classic disposition effect..."
- Cached forever. Falls back to template narration if AI unavailable.

---

### Phase 7: AI Research Digest (Pseudo-Brain)
**Goal:** Build the corporate announcement pipeline and AI-powered filing summarization.  
**Estimated effort:** 3-4 days

---

#### 7.1 Live Announcement Feed

##### [MODIFY] [pseudo_brain.py](file:///c:/Users/yasha/Desktop/Saarthi/backend/services/pseudo_brain.py) — Full rewrite
Replace all mock data with real pipeline:

1. **Announcement fetching:** Wire `nse` package (circulars method) + `pnsea` (insider trading)
2. **Diff engine:** Compare against stored announcements — only process NEW filings
3. **Rule-based triage** (zero LLM):
   - Classify by keyword into fixed categories: `results, board_meeting, credit_rating, auditor_change, litigation, pledge_change, personnel_change, dividend, bonus, split, buyback, rights_issue`
   - Low-signal → log, don't summarize
   - High-signal → queue for Gemini synthesis

4. **Gemini synthesis** (high-signal only):
   - Uses `GeminiKeyRotator.call(task_type="heavy", ...)`
   - Structured output: `{summary, category_tag, sentiment, red_flags[]}`
   - Validated against schema. Fallback: "See original filing" link.
   - Cached permanently by document hash.

#### 7.2 Research Notes UI

##### [MODIFY] [ResearchDigestCard.tsx](file:///c:/Users/yasha/Desktop/Saarthi/frontend/src/components/ResearchDigestCard.tsx)
Replace mock data with live data:
- **Announcements:** Real chronological list from API, color-coded by category
- **Flags panel:** Split into:
  - 🟢 "Computed from data" (rule-based: debt, pledge, interest coverage)
  - 🟣 "AI-detected from filings" (Gemini synthesis)
- Every AI line: `"AI-summarized from [source] — read original"` tag with link
- "Not yet available" graceful state for companies without coverage

---

### Phase 8: Polish, Extra Features & Launch
**Goal:** Add differentiator features, make it feel premium, wire up auth and cron.  
**Estimated effort:** 3-4 days

---

#### 8.1 Sector Heatmap → Proper Treemap
- Replace uniform grid with Recharts Treemap
- Sized by market cap, colored by daily performance
- Clickable: sector → pre-filtered screener

#### 8.2 Strategy Leaderboard → Real Data
- "Publish to Leaderboard" button on backtester results page
- Real strategy data from database
- "Clone & Backtest" passes strategy params via URL to pre-fill backtester

#### 8.3 Shareable Report Card
- HTML5 Canvas snapshot: Snowflake + key stats + "What We Found"
- Branded with Nivesh dark theme + logo
- "Download as PNG" + "Copy Link" buttons

#### 8.4 Chart Timeframe Buttons
- Add 1D / 1W / 1M / 3M / 1Y / 5Y / MAX buttons to StockChart
- Different data granularity: intraday for 1D/1W, daily for rest

#### 8.5 Loading States Everywhere
- Shimmer/skeleton loading components for every card and table
- Error states with retry buttons
- Empty states with helpful messages
- Toast notification system for actions (add to watchlist, alert created, etc.)

#### 8.6 GitHub Actions Cron Jobs

##### [NEW] `.github/workflows/daily-refresh.yml`
- Runs daily at 4 PM IST (after market close)
- Fetches EOD OHLCV for Nifty 500
- Updates fundamentals_cache
- Re-computes Snowflake scores

##### [NEW] `.github/workflows/keepalive.yml`
- Runs every 10 min
- Hits backend `/health` + Supabase `SELECT 1`
- Prevents free-tier sleep/pause

#### 8.7 Auth (Supabase)
- Email + Google OAuth via Supabase Auth
- Protect user-owned data: watchlists, saved screens, trade uploads, strategies
- Row-Level Security policies on Postgres tables
- Anonymous users can browse stock data, use screener, run backtests
- Logged-in users can save watchlists, upload trades, publish strategies

---

## §4 — Creative Additions (My Recommendations)

| Feature | Value | Cost |
|---------|-------|------|
| **"What If" Calculator** — "What if I invested ₹1L in [stock] on [date]?" Shows value today, vs FD, vs Nifty 50 | High engagement, great for social sharing | Zero — pure math |
| **Stock Comparison Tool** — Side-by-side 2-5 stocks with overlaid Snowflakes | Frequently requested feature | Zero — reuses existing components |
| **Market Pulse** — Daily 5-point AI summary of top market events | Homepage engagement | 1 Gemini call/day (cached 24h) |
| **Keyboard Shortcuts** — `/` search, `W` watchlist, `Esc` close | Power user retention | Zero — client JS only |
| **Smart Alerts** — Pattern-based: "Promoter buying detected", "P/E now below 5yr average" | Differentiator vs competitors | Zero — rule-based on cached data |
| **Export API** — CSV/JSON export on every data table | Developer community, data portability | Zero — formatting only |

---

## §5 — Verification Plan

### Automated Tests

```bash
# Backend — expand to full pytest suite
cd backend && python -m pytest tests/ -v --tb=short

# New test files to create:
# tests/test_financial_math.py  — CAGR, Sharpe, RSI, DCF formulas
# tests/test_snowflake.py       — 30-check scoring edge cases
# tests/test_gemini_rotator.py  — Key rotation, cooldown, fallback
# tests/test_behavior.py        — All 8 psychology metrics
# tests/test_screener.py        — Filter combinations

# Frontend build check
cd frontend && npm run build && npm run lint
```

### Manual Verification Checklist

**Phase 1 Checks:**
- [ ] Search "Reliance" → autocomplete shows RELIANCE.NS with full name
- [ ] Search "Baj" → shows Bajaj Auto, Bajaj Finance, Bajaj Finserv
- [ ] Navigate to any Nifty 50 stock → no fake values, proper data_source flags
- [ ] Navigate to a stock where yfinance has gaps → warning banner shows
- [ ] Snowflake: non-dividend stock scores 0/6 on Dividend axis (not 3/6)
- [ ] ROCE value differs from ROE (not just ROE × 1.05)

**Phase 3 Checks:**
- [ ] Type "Buy TCS when RSI below 30, sell above 70, test during COVID" → form fills correctly
- [ ] Run backtest → equity curve chart renders with benchmark overlay
- [ ] Sharpe ratio is mathematically correct (manually verify with a calculator)
- [ ] CAGR is mathematically correct

**Phase 4 Checks:**
- [ ] Financial statements tab shows 5 years of real data
- [ ] DCF: moving sliders produces meaningfully different fair values (not always ~95% of price)

**Phase 6 Checks:**
- [ ] Upload a real CSV → 8 behavior metrics computed correctly
- [ ] Demo button → clearly labeled as demo data

**Phase 7 Checks:**
- [ ] Real corporate announcements appear (not hardcoded mock data)
- [ ] AI summaries link back to original filings

**Cross-Cutting Checks:**
- [ ] Every page works on 375px mobile
- [ ] Turn off backend → frontend shows clear warnings
- [ ] Exhaust all Gemini keys → features degrade to non-AI fallback (no crashes)
- [ ] Gemini status endpoint shows per-key credit usage
- [ ] No `http://localhost:8000` anywhere in deployed code

---

## §6 — Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| yfinance rate-limited | Cache-first architecture. Background jobs only. Never call from user requests. |
| NSE blocks scrapers | Proper headers. Respect rate limits. Multiple source fallbacks. |
| All 7 Gemini keys exhausted | Every AI feature has code-first fallback. Product works at 100% correctness with 0 AI. |
| Supabase 500MB limit | Nifty 500 only (not 2000). Prune old intraday. Compress JSON. |
| Upstash 10K/day limit | Only cache actively-viewed tickers. Postgres as fallback. |
| Render cold starts | Keep-alive cron every 10 min. "Waking up..." frontend loading state. |
| Single key degraded to Flash-Lite | Rotator automatically detects and routes only light tasks to degraded keys. |

---

## §7 — Execution Priority Summary

| Phase | Focus | Fixes | New Features | Est. Days |
|-------|-------|-------|-------------|-----------|
| **1** | 🔴 Foundation + Data Integrity | C1-C14 | Gemini Rotator, Cache Manager, DB Client, API helper | 3-4 |
| **2** | 📱 Mobile + Navigation | M1-M10 | Footer, Favicon, Mobile menu, Active links | 1-2 |
| **3** | 📈 Backtester Production | H1-H2 | Real NL parser, Equity curve, Scenario library, Trade log | 3-4 |
| **4** | 🏢 Company Dashboard | G1-G6, H8 | Financials, Shareholding, Insider, Peers, DCF | 4-5 |
| **5** | 🔍 Screener | H9-H10 | Custom filters, Pagination, Grid/List views | 2 |
| **6** | 🧠 Behavior Analyzer | H6, G10-G11 | 8 metrics, CSV upload, Broker parsers | 2-3 |
| **7** | 🤖 AI Research Digest | H3-H4, G12-G13 | Live announcements, Gemini synthesis, Red flags | 3-4 |
| **8** | ✨ Polish + Launch | G14-G22 | Treemap, Auth, Cron, Loading states, Extras | 3-4 |
| | | **Total** | | **~22-30 days** |

---

> [!TIP]
> **The single most important principle:** AI is a garnish on a dish that's already complete without it. The Gemini 7-key rotation maximizes value, but if every key dies tomorrow, Nivesh still works — correct math, correct data, correct backtests — just plainer prose. That's the architecture that lets you sleep at night on a ₹0 budget.

> [!CAUTION]
> **Before I start:** Please share your Supabase Project URL, Anon Key, and Service Role Key (via DM or secure method — not in chat). Also share your Upstash Redis REST URL and Token. I will store these ONLY in `.env` files that are `.gitignore`'d. Your Gemini keys should be regenerated (since they were shared in chat) and provided fresh.
