# Commerce Copilot

> AI-powered e-commerce business diagnosis platform. Upload Excel/CSV, get actionable decisions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## Features

### Smart Data Recognition
Auto-detects table type on upload and switches analysis mode:
- **Order tables** (orders/buyers/payments/refunds) -> Business diagnosis + decision cards
- **Supply tables** (SKU/pricing/origin/logistics) -> Supply analysis + purchase recommendations
- **Unknown tables** -> Smart column profiling with role detection (ID/name/price/date/category)

### Intelligent Homepage
- Has historical data -> shows workbench overview with quick actions
- No data -> shows onboarding landing page

### AI Decision Engine
P0/P1/P2 prioritized business decisions:
- Pricing: margin analysis, price concentration alerts
- Restock: sales velocity-based replenishment reminders

### Supply Analysis
- Price quartile distribution (box-whisker style)
- Product signal tagging (hot/new/value/tail/caution)
- AI purchase recommendation list

### Generic Data Profiler
Any uploaded table auto-analyzed:
- Column role detection (7 semantic roles)
- Value type inference (number/date/text)
- Numeric column statistics (min/max/avg)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS + Dark Theme |
| Components | Radix UI + Lucide Icons |
| Animation | Framer Motion |
| Charts | ECharts |
| AI | DeepSeek Chat API |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

---

## Quick Start

\\ash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
\
### Environment Variables

Create \.env.local\:

\\env
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\
\\ash
npm run dev     # http://localhost:3000
\
---

## Architecture

\Upload Excel
    |
    v
Profile Detection (order/supply/unknown)
    |
    v
Store in localStorage + Supabase (non-blocking)
    |
    v
Smart Homepage (workbench or landing)
    |
    v
Dashboard (profile-based rendering)
    |-- order -> Decision cards + Health score + Charts
    |-- supply -> Supply health + Purchase list
    |-- unknown -> Column profiling + Numeric stats
\
### Key Design Decisions

- **localStorage-first**: Data persists locally. Supabase is optional cache.
- **Non-blocking Supabase**: Save failure does not affect upload success.
- **Profile at upload time**: Table type detected once, stored, never re-computed.
- **useRef for file data**: Avoids React state closure issues in multi-sheet uploads.

---

## Project Structure

\src/
  app/
    page.tsx                   # Smart homepage (workbench / landing)
    layout.tsx                  # Root layout + navbar
    globals.css                 # Dark theme + glassmorphism
    error.tsx                   # Global error boundary
    upload/page.tsx             # Upload (drag-drop + sheet picker + column selector)
    dashboard/page.tsx          # Profile-based diagnosis (order/supply/unknown)
    workspace/page.tsx          # 5-tab data workspace
    chat/page.tsx               # AI chat assistant
    report/page.tsx             # Report generation + print
    api/
      agent/route.ts            # Agent routing + RAG integration
      upload/route.ts           # File parsing + profile detection
      analyze/route.ts          # DeepSeek analysis
      report/route.ts           # Report generation
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton, SheetPicker, ColumnSelector
    charts/     # Pie, Bar, Line (ECharts)
    insights/   # HealthCard, DecisionCardUI, RiskCard, OpportunityCard, GenericOverview
    procurement/ # SupplyHealth, PurchaseList (supply analysis)
    workspace/  # SalesTrend, ProductRank, CategoryBreakdown, RegionMap, AnomalyDetection
    layout/     # Navbar, PageTransition
  lib/
    parser.ts              # Excel/CSV parser (smart header detection + value dedup)
    db.ts                  # Supabase client (try-catch all operations)
    store/                 # localStorage state management (capacity check + cleanup)
    agent/                 # AI Agent framework (withRetry + structured prompts)
    decisions/             # Decision engine (pricing + restock)
    procurement/           # Supply analysis engine (pricing + signals + recommend)
    profiler/              # Smart column role detection
    logger.ts              # Structured logger (debug/info/warn/error)
    i18n/                  # zh.json centralized text management
    templates/             # Platform templates (Tmall/JD/PDD/Douyin)
    rag/                   # RAG knowledge retrieval
  types/
    index.ts               # Shared type definitions
\
---

## Database Setup

Run in Supabase SQL Editor:

\\sql
CREATE TABLE datasets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  columns       JSONB DEFAULT '[]',
  rows          JSONB DEFAULT '[]',
  row_count     INTEGER DEFAULT 0,
  summary       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analysis_results (
  id          TEXT PRIMARY KEY,
  dataset_id  TEXT REFERENCES datasets(id),
  summary     TEXT,
  insights    JSONB DEFAULT '[]',
  risks       JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;
\
---

## Security

- API keys via \process.env\, never hardcoded
- \.env.local\ in \.gitignore- No secrets in source code or build output
- Supabase connection failures do not block upload

---

## Deployment (Vercel)

1. Import GitHub repo \leonis77/ai-data-copilot\ in Vercel
2. Configure env vars: \DEEPSEEK_API_KEY\, \SUPABASE_URL\, \SUPABASE_SERVICE_ROLE_KEY3. Click Deploy
4. Push to \master\ triggers auto-redeploy

---

## Changelog

- **2026-06-14**: Generic data profiler with smart column role detection
- **2026-06-14**: Smart homepage: workbench vs landing based on data state
- **2026-06-14**: Table type auto-detection at upload (order/supply/unknown)
- **2026-06-14**: Decision engine: pricing + restock decision cards
- **2026-06-14**: Supply analysis module: price quartiles + AI purchase recommendations
- **2026-06-14**: Global error boundary + structured logger
- **2026-06-14**: AI API retry with exponential backoff
- **2026-06-14**: localStorage capacity check + auto-cleanup
- **2026-06-14**: i18n JSON centralized text management

## License

MIT
