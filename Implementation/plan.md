# NIVESH — Definitive Master Implementation Plan & Product Architecture
> 🇮🇳 **100% INDIAN EQUITY MARKET SPECIFIC (NSE & BSE EQUITIES ONLY)**
> **Mission**: Unify 10-year tabular financial statements, visual ratio trend graphs, Bloomberg-style supply chain ecosystem maps, forensic fraud risk engines, and strategy backtesting into a zero-latency, ₹0-budget institutional platform for Indian stock traders.

---

## 🏛️ 1. Master Product Architecture & Competitive Edge

Nivesh synthesizes the best capabilities of top equity research platforms into a single unified workspace tailored specifically for Indian markets:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          NIVESH UNIFIED RESEARCH WORKSPACE                                            │
├──────────────────────────┬─────────────────────────────┬─────────────────────────────┬────────────────────────────────┤
│       SCREENER.IN        │       SIMPLY WALL ST        │       TIJORI FINANCE        │       BLOOMBERG TERMINAL       │
│     (Tabular Depth)      │    (Visual Trend Graphs)    │    (Segment Breakdown)      │    (SPLC Supply Chain Graph)   │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ • 10-Year Full P&L       │ • Multi-Year Ratio Lines    │ • Product Revenue Split     │ • Upstream Raw Material Vendors│
│ • Balance Sheet & Cash   │ • Debt vs Equity Visualizer │ • Subsidiaries & Holding %  │ • Downstream B2B Customers     │
│ • 8-Quarter P&L Results  │ • Revenue vs Net Profit     │ • Segment Profitability     │ • Cross-Asset Ripple Effect    │
│ • Rule-Based Pros/Cons   │ • Valuation Ranges          │ • Operational KPIs          │ • Forensic Solvency (Altman Z) │
└──────────────────────────┴─────────────────────────────┴─────────────────────────────┴────────────────────────────────┘
```

---

## 📑 2. Multi-Tab Stock Research Workspace (`/stock/[ticker]`)

Every stock detail page is structured into **8 dedicated tabs** for seamless navigation:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [1. Overview] [2. Deep Financials] [3. Visual Ratios] [4. Supply Chain & Segments] [5. Forensic Risk] [6. Smart Money] [7. Peers] [8. Docs] │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Executive Overview
- **Features**: 5-Axis Snowflake Radar Chart (0–30 Score), Interactive Price Chart (lightweight-charts), Key Ratios Strip with Glossary Tooltips, Interactive DCF Fair Value Calculator, Rule-Based Pros & Cons.
- **Goal**: 10-second glanceable health, valuation, and dividend pulse check.

### Tab 2: Deep Financials & Statements (Screener.in-Style Depth)
- **Features**: 10-Year P&L Statement, Balance Sheet, Cash Flow Statement, 8-Quarter Results with inline YoY % growth badges, solid-background sticky metric columns (`bg-surface`), and CSV Data Export.
- **Goal**: Multicyle financial analysis for Indian value and growth investors.

### Tab 3: Visual Ratios & Trend Graphs (Simply Wall St-Style Trend Lines)
- **Features**: Multi-year interactive Recharts line & area graphs for Profitability (OPM %, NPM %, ROE %, ROCE %), Capital Structure (Debt vs Equity, Interest Coverage), and Working Capital Days.
- **Goal**: Instantly spot margin expansion, deleveraging, or operational efficiency shifts.

### Tab 4: Supply Chain, Business Segments & Related Parties (Bloomberg SPLC + Tijori Depth)
- **Features**:
  1. **Bloomberg SPLC Supply Chain Graph**: Interactive 3-column ecosystem map:  
     `[ Upstream Suppliers / Raw Materials ]` ──► `[ Target Stock ]` ──► `[ Downstream Customers & Outlets ]`
  2. **Product & Segment Revenue Split**: Donut / Stacked Bar chart of revenue by business segment.
  3. **Subsidiaries List**: Active subsidiary companies and holding percentage.
  4. **Related-Party Transaction Highlights**: Disclosure alerts on promoter and subsidiary transactions.
- **Goal**: Cross-asset ripple effect arbitrage (buying suppliers before earnings reflect customer order surges) and promoter diversion auditing.

### Tab 5: Forensic Accounting & Solvency Risk (Ind AS Fraud Detector)
- **Features**:
  1. **Altman Z'-Score (Emerging Market Solvency)**: $Z' = 0.717 X_1 + 0.847 X_2 + 3.107 X_3 + 0.420 X_4 + 0.998 X_5$ (Safe > 2.90, Grey 1.23–2.90, Distress ≤ 1.23).
  2. **Beneish M-Score**: 8-variable Ind AS earnings manipulation risk score.
  3. **Promoter Share Pledging Risk**: Color-coded margin-call warnings (<5% Safe, 5–25% Caution, >25% High Risk).
  4. **5-Year Valuation Bands (P/E & P/B Median ± 1SD / 2SD)**: Visual valuation band overlays.
  5. **Reverse DCF (Market Implied Growth Solver)**: Solves for the implied 5-year cash flow CAGR $g$ priced into current stock price.
- **Goal**: Automated forensic audit shield against accounting manipulation and promoter margin call risks.

### Tab 6: Smart Money & Insider Disclosures (SEBI & Exchange Tracking)
- **Features**: SEBI PIT promoter/KMP buys/sells (>₹10L), SEBI SAST substantial acquisitions (>2%, >5%), NSE daily bulk/block deals (>0.5% equity), and Superinvestor portfolio activity (Ashish Kacholia, Vijay Kedia, Rekha Jhunjhunwala, Dolly Khanna, Mukul Agrawal, Radhakishan Damani).
- **Goal**: Track institutional accumulation before major price breakouts.

### Tab 7: Sector Peer Benchmarking Matrix
- **Features**: Multi-metric sortable table comparing the stock against 5 sector competitors on P/E, P/B, ROE, ROCE, D/E, Dividend Yield, and Snowflake Score.
- **Goal**: Identify the highest-quality or cheapest stock in any specific Indian industry.

### Tab 8: Corporate Documents & Exchange Announcements
- **Features**: Direct links to official NSE & BSE announcements, concall digests, annual reports, and investor presentations.
- **Goal**: Eliminate manual searching across exchange portals.

---

## ⚡ 3. Platform Modules Beyond Stock Research

### A. Natural Language Strategy Backtester (`/backtester`)
- **Engine**: Guided Parameter Builder + Gemini 2.5 Flash Natural Language Parsing → Enforced JSON Schema → `vectorbt` Python Backtest Engine.
- **Indian Market Crisis Scenarios**:
  - *Ketan Parekh Dot-Com Bust (2000–2001)*
  - *Global Financial Crisis (2008–2009)*
  - *2016 Demonetization Policy Shock*
  - *COVID-19 Crash & V-Recovery (2020)*
  - *Adani-Hindenburg Episode (2023)*
- **Outputs**: Interactive Equity Curve, CAGR, Sharpe Ratio, Max Drawdown, Win Rate %, and Trade Log Table.

### B. Trading Behavior & Psychology Diagnostic Engine (`/behavior`)
- **Engine**: Zerodha, Groww, Upstox, and Generic CSV trade log importer + pre-loaded 8-trade sample demo dataset.
- **Metrics**: Disposition Effect Score (PGR/PLR), Loss Aversion Ratio, Revenge Trading Score, Position Sizing CV, Mathematical Expectancy.
- **Output**: Psychological Coaching Narrative Report highlighting cognitive biases and risk management rules.

### C. Equity Screener & Sector Heatmap (`/screener`)
- **Features**: 8 Institutional Presets (*Quality Compounders*, *Deep Value*, *Zero Promoter Pledge*, etc.), Custom Range Sliders (P/E, P/B, ROE, ROCE, D/E, Dividend Yield, Market Cap), Sector Performance Heatmap, CSV Data Export.

### D. Watchlist & Real-Time Price Alerts (`/watchlist`)
- **Features**: Multi-stock tracking, real-time price indicators, and custom threshold alerts (`PRICE_ABOVE`, `RSI_BELOW`).

---

## 🔒 4. Data Privacy & Git Security Verification

- [x] **Git Ignored**: `future_plans.md`, `USA_Specifics.md`, `future trash/`, and `future_trash/` are explicitly added to `.gitignore`.
- [x] **100% Indian Equity Scope**: Platform is exclusively dedicated to Indian Stock Market (NSE & BSE) equities.
- [x] **Zero TypeScript Errors**: Verified clean build via `npx tsc --noEmit`.
- [x] **Verified Live Endpoints**:
  - `GET /api/companies/TATAMOTORS.NS/supply-chain` → **HTTP 200 OK**
  - `GET /api/companies/RELIANCE.NS/forensic` → **HTTP 200 OK**
  - `GET /api/companies/RELIANCE.NS/valuation-bands` → **HTTP 200 OK**
