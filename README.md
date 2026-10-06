# Nepshare — Nepal Share Market Analysis App

**Nepshare** is a simple, easy-to-use Nepal share-market analysis web application designed for public investors and active secondary market participants. It helps users understand NEPSE listed companies, monitor shares, evaluate potential buying and selling setups, and manage private portfolios with true NEPSE fees.

---

## Key Features

1. **Simple, Mobile-Friendly Interface**:
   - Clean, modern layout built with Vanilla CSS design tokens.
   - Large readable typography (Inter & Outfit).
   - Prominent search box with instant autocomplete (`Ctrl+K`).
   - Currency formatted in **NPR** with South Asian numbering system.
   - Timestamps formatted in **Nepal Standard Time (NPT: UTC+5:45)**.
   - Fully bilingual: one-click toggle between **English** and **नेपाली (Nepali)**.
   - Short, helpful tooltips explaining financial terminology (EPS, P/E, Book Value, RSI, MACD, WACC, Support/Resistance, SEBON fee, etc.).

2. **Home Dashboard**:
   - Live NEPSE index summary and real-time market session status (Open, Closed, Pre-Open according to Sunday–Thursday 11:00 AM – 3:00 PM NPT trading hours).
   - Top Gainers, Top Losers, Most Active by Turnover, and Most Active by Volume.
   - Company disclosures, dividends, rights, AGMs, and financial reports with source links.
   - Plain-language market summary synthesizing liquidity and sector rotations.
   - Clear data source badge and persistent notice when operating on demonstration feed.

3. **Company Profiles & Interactive Charts**:
   - Scrip symbol, company name, sector, LTP, daily change, volume, turnover, day high/low, and 52-week high/low.
   - Interactive SVG price chart with selectable timeframes (`1D`, `1W`, `1M`, `3M`, `6M`, `1Y`) and Line / Candlestick view.
   - Verified fundamentals: EPS, P/E ratio, Book Value, P/B, ROE, Market Cap, Paid-up Capital, and reporting quarter.
   - Historical dividend track record (Bonus Share % and Cash Dividend % by fiscal year).
   - Honest representation: never invents financial figures.

4. **Transparent, Rule-Based Buying & Selling Analysis**:
   - Signals: **Potential Buy Setup**, **Hold / Watch**, **Potential Sell Setup**, **Insufficient Data**.
   - Transparent indicators: SMA (20, 50), RSI (14), MACD (12, 26, 9), volume confirmation, and price trends.
   - Calculated entry range, exit target, and stop-loss level with risk-to-reward ratio.
   - Clear identification of main risks (liquidity, volatility, regulatory risks).
   - Signal invalidation criteria (e.g. daily close below stop-loss).
   - Expandable "Advanced analysis" accordion so beginners aren't overwhelmed while active traders have complete depth.

5. **Predictive Scenario Updates & Walk-Forward Validation**:
   - Separate outlooks for the **Next Trading Session (1 Day)** and **Next 5 Trading Sessions (1 Week)**.
   - Probabilistic scenarios: **Bullish**, **Neutral**, **Bearish** with calibrated volatility ranges rather than unrealistic guaranteed price targets.
   - Chronological **walk-forward out-of-sample backtesting** preventing lookahead bias.
   - Compared against a simple Buy & Hold baseline accounting for NEPSE round-trip trading friction (broker commissions, SEBON regulatory fee, DP charge).
   - Non-guarantee disclaimers prominently stated.

6. **Watchlist & Deduplicated In-App Alerts**:
   - Save and remove companies to a personalized watchlist.
   - Set price threshold alerts ("Price Above", "Price Below") and technical setup change monitors.
   - In-app notification drawer with unread counter.
   - Alerts are evaluated only against fresh market quotes and automatically deduplicated to prevent repetitive notifications.

7. **Portfolio Management with NEPSE Fee Calculations**:
   - Enter manual purchases and sales (Quantity, Price, Date, Fees).
   - Tracks Weighted Average Cost of Capital (WACC), total investment, current valuation, and unrealized profit/loss.
   - Correctly accounts for **partial sales** and realized gains/losses.
   - Automatic calculation of standard NEPSE broker commission tiers (0.27% to 0.40%), SEBON fee (0.015%), DP fee (NPR 25.00), and Capital Gains Tax (CGT).
   - Supports custom fee override entry.
   - Private and secure per user account. No automated trading or brokerage credentials collected.

8. **Replaceable Data Integration Layer**:
   - Pluggable `IDataProvider` architecture:
     - `NepseDemoProvider`: High-fidelity, deterministic Nepal market dataset with genuine NEPSE scrips (NABIL, GBIME, NICA, UPPER, CHCL, SHIVM, HDL, CIT, NTC, etc.) with real sector spread, quarter fundamentals, and realistic historical candles.
     - `NepseLiveProvider`: Adapter for authorized live secondary market data feeds with server-side caching, rate limiting, and stale-data detection.
   - Prominent "Demo data—not current market information" banner displayed whenever running sample data. Real outbound alerts are suppressed in demo mode.

---

## Project Architecture

```
nepshare/
├── server/
│   ├── config.ts               # Configuration settings
│   ├── db/
│   │   └── database.ts         # Persistent SQLite DB tables & indexes
│   ├── engine/
│   │   ├── nepaliCalendar.ts   # NPT timezone & NEPSE trading hours
│   │   ├── technicalAnalysis.ts# Rule-based buy/sell/hold setup engine
│   │   ├── predictiveEngine.ts # 1D & 5D scenario envelopes + walk-forward testing
│   │   ├── portfolioEngine.ts  # WACC, partial sales, NEPSE broker/SEBON fees
│   │   └── alertEngine.ts      # Price & signal alert evaluator + deduplication
│   ├── providers/
│   │   ├── types.ts            # IDataProvider interface & domain types
│   │   ├── nepseDemoData.ts    # Authentic NEPSE company database & candles
│   │   ├── nepseDemoProvider.ts# Verified sample data feed implementation
│   │   ├── nepseLiveProvider.ts# External feed adapter with caching & TTL
│   │   └── index.ts            # Data provider singleton factory
│   ├── middleware/
│   │   └── auth.ts             # JWT session auth & ownership verification
│   ├── routes/
│   │   ├── authRoutes.ts       # Registration, login & 1-click demo login
│   │   ├── marketRoutes.ts     # Index summary, movers, announcements, news
│   │   ├── companyRoutes.ts    # Screener, fundamentals, technicals, predictions
│   │   ├── watchlistRoutes.ts  # Saved scrip CRUD with live signal enrichment
│   │   ├── alertRoutes.ts      # User alert management & notification drawer
│   │   └── portfolioRoutes.ts  # Transactions, WACC summary & fee calculator
│   ├── tests/
│   │   ├── technical.test.ts   # Indicator & signal logic tests
│   │   ├── predictive.test.ts  # Walk-forward backtesting tests
│   │   └── portfolio.test.ts   # WACC, partial sales & NEPSE fee tests
│   └── index.ts                # Express server entrypoint & static asset serving
├── src/
│   ├── api/client.ts           # Typed API client
│   ├── components/             # Reusable UI components (Chart, Badges, Modals, Tooltips)
│   ├── context/                # Auth, Language (EN/NE), and Alert contexts
│   ├── i18n/                   # English and Nepali translations
│   ├── styles/index.css        # Vanilla CSS Design System with dark mode tokens
│   ├── views/                  # Home, Explore, CompanyDetail, Watchlist, Portfolio
│   ├── App.tsx                 # Root application component
│   └── main.tsx                # Client entrypoint
└── scripts/dev.mjs             # Development launcher
```

---

## Installation & Running Locally

### Prerequisites
- Node.js (v18 or higher recommended; verified on Node v24)
- npm (v9 or higher)

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (defaults will run in high-fidelity demo mode out of the box):
```bash
cp .env.example .env
```

### 3. Run Tests
Execute the Vitest financial calculation and signal test suite:
```bash
npm test
```
All 11 tests across portfolio, technical signals, and predictive walk-forward models will run and pass.

### 4. Start the Application
To run both backend API server and Vite client concurrently in development mode:
```bash
npm run dev
```

Alternatively, to build and run production mode:
```bash
npm run build
npm start
```
Then visit **`http://localhost:5000`** in your browser.

---

## Public vs. Private Features
- **Public Browsing (No Login Required)**:
  - NEPSE market summary, index point changes, and trading hours.
  - Top gainers, losers, and scrips driving liquidity.
  - Explore company screener with sector filters.
  - Company fundamentals, reporting dates, and dividend history.
  - Rule-based buying/selling technical analysis and entry/stop-loss levels.
  - 1-day and 5-day predictive scenario intervals.
  - Company disclosures, news, and official source links.
- **Saved Personal Features (Account Required)**:
  - Personal watchlist scrip persistence.
  - Custom price alerts and technical signal change notifications.
  - Private portfolio tracking with custom transaction history, WACC, and partial sales accounting.
  - *Tip*: Visitors can click **"🚀 Try with Demo Account"** to immediately test all personal features with pre-seeded holdings without registration!
# Nepshare
