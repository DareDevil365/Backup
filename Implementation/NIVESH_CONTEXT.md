# Nivesh — Context Summary

*Condensed from `PROJECT_SPEC.md`. Use this as a quick-reference briefing; refer to the full spec for exact schemas, code snippets, and acceptance criteria.*

---

## 1. What it is

**Nivesh** (working name) is an AI-assisted equity research, backtesting, and trading-psychology platform for **NSE-listed (Indian) stocks**, built entirely on **free-tier infrastructure (₹0 budget)**. It's written as a phased execution brief for an AI coding agent (Google Antigravity / Gemini).

**Reference sites it draws from:** simplywall.st (visual clarity, the "Snowflake"), Screener.in (data density, query screener), Tijori Finance (sector/theme framing).

**The differentiator no free Indian platform has today:** an AI "Pseudo-Brain" that reads real filings/concalls/news and surfaces plain-English conclusions with sources — not LLM memory, but synthesis of fetched documents.

---

## 2. Four core features

| # | Feature | What it does |
|---|---|---|
| 1 | **Company Analysis Dashboard** | Simplywall.st-style 5-axis "Snowflake" radar (Value/Future/Past/Health/Dividend), key stats strip, rule-based Pros/Cons, peer comparison, segment revenue breakdown, shareholding pattern, insider/bulk-deal feed, interactive DCF calculator |
| 2 | **Strategy Backtester** | Dropdown Guided Builder (always works, zero AI) + optional NL free-text layer (Gemini parses English → strategy JSON → same `vectorbt` engine). Includes a historical-crisis scenario preset library |
| 3 | **Trading Behavior Analyzer** | Upload trade CSV → pure-stats metrics (disposition effect, loss aversion ratio, revenge trading, overtrading, position sizing consistency, win rate vs. expectancy) + one narrated LLM summary |
| 4 | **AI Research Digest ("Pseudo-Brain")** | Polls NSE announcements + insider disclosures + news RSS; rule-based triage first; Gemini only summarizes/tags high-signal documents (never restates numbers) |

---

## 3. The one governing engineering principle

> **"AI is a garnish on a dish that's already complete without it."**

- Every feature must produce a **correct** result with **zero LLM calls**.
- LLM calls are only for: NL→JSON strategy parsing, backtest narration, behavior report narration, document summarization/tagging — always **structured output**, always **validated**, **one retry then fallback**, always **cached forever** by content hash.
- **Numbers never come from the LLM** — always from `pandas`/`fundamentals_cache`/`price_cache`. The LLM only touches qualitative text.
- Nothing the LLM outputs executes directly — it only ever fills a validated schema/form the user reviews.

---

## 4. Tech stack (locked — don't deviate without strong reason)

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Charts | `lightweight-charts` (candlesticks) + Recharts (radar/bar/line) |
| Backend | Python 3.11 + FastAPI |
| Backtest engine | `vectorbt` (+ custom fallback for complex strategies) |
| Indicators | `pandas-ta` |
| Database | Supabase Postgres (free, 500MB) |
| Cache | Upstash Redis (free, 10k cmds/day) |
| Scheduled jobs | GitHub Actions cron (free, 2000 min/mo) |
| Backend hosting | Render.com (or Fly.io) free tier |
| LLM | Gemini 2.5/3.x Flash (free tier, Google AI Studio key) |
| Auth | Supabase Auth (email + Google OAuth) |

**Golden rule:** no user request ever hits an external data source directly — only background jobs do. Users are always served from Postgres/Redis.

---

## 5. Data sourcing (the riskiest part)

- **`yfinance`** — OHLCV, delayed 15–20 min, no key needed.
- **`nsepython` / `jugaad-data`** — official NSE bhavcopy (EOD), corporate actions, F&O — needs careful headers/session handling, NSE actively anti-bot-protects.
- **Scraped fundamentals** (Screener.in-style) — weekly only, never live-per-request, check `robots.txt`.
- **`nsefin` / `pnsea`** — corporate announcements + SEBI insider (PIT/SAST) disclosures — polled every 15–30 min.

**Historical data policy:** fetch-on-demand, cache forever (EOD data is immutable). No bulk pre-backfill.

**Honest data-availability caveat:** NSE equity trading only began **Nov 1994**. The Harshad Mehta scam (1992) predates NSE entirely and has no reliable free per-stock BSE data — that scenario ships **index-level only** (static seed table), clearly labeled, never faked as a per-stock backtest.

---

## 6. Design system

- **Theme:** dark-mode-first (fintech convention)
- **Background:** `#0B1210` · **Card:** `#131B18` · **Border:** `#223028`
- **Primary accent (brand/positive):** `#1E7A4C` (forest green)
- **Secondary accent:** `#C9A227` (muted gold)
- **Price up/down:** `#2ECC71` / `#E74C3C`
- **Fonts:** Sora (headings/numbers), Inter (body/UI)
- Flat cards, 12px radius, no heavy shadows, 4/8/12/16/24/32/48px spacing scale

---

## 7. Build plan (8 phases, execute in order)

| Phase | Focus |
|---|---|
| 0 | Foundation — monorepo, Supabase, Redis, deploy pipeline hello-world |
| 1 | Data pipeline + Company Dashboard (MVP) |
| 2 | Charts & technical analysis |
| 3 | Screener + Watchlist + Alerts |
| 4 | Strategy Backtester — Guided Builder first, NL layer second |
| 5 | Behavior Analyzer |
| 6 | Pseudo-Brain: AI Research Digest |
| 7 | Extra features & polish (heatmap, Investor Score, glossary, DCF calc) |
| 8 | Launch readiness (keep-alive crons, analytics, README) |

Each phase has explicit checkboxed deliverables and acceptance criteria in the full spec — don't skip Phase 1 (data layer) before later phases; everything downstream depends on it.

---

## 8. Deployment gotchas (free-tier survival)

- Render/Fly.io free web services **sleep after ~15 min** → mitigate with a GitHub Actions cron hitting `/health` every 10 min + a "waking up..." loading state.
- Supabase free tier **pauses after 7 days inactivity** → same keep-alive cron (`SELECT 1`).
- Vercel free tier needs no special handling.
- Secrets (Gemini key, Supabase service key) — env vars / platform secret managers only, never in repo.

---

## 9. Where to find more detail in the full spec

- Exact API endpoint list → `PROJECT_SPEC.md` §5
- Full DB schema (13 tables) → §4
- Strategy JSON schema + indicator vocabulary → §3.3
- Behavior metric formulas → §3.4
- AI Research Digest pipeline → §3.8
- Suggested Antigravity skills to persist (`nse-data-fetching`, `backtest-engine`, `behavior-analytics`, `ai-research-digest`) are called out inline throughout the spec — create these under `.antigravity/skills/<name>/SKILL.md` as work progresses.
