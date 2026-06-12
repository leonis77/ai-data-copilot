# AI Data Copilot

AI-driven data Agent platform. **Query**, **Report**, **Interpret** --- turn raw data into decisions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS, Glassmorphism dark theme |
| Components | Radix UI, Lucide Icons |
| Animation | Framer Motion |
| Charts | ECharts |
| AI | DeepSeek Chat API |
| Storage | Supabase (PostgreSQL) |
| Hosting | Vercel |

## Architecture

```
Browser (Next.js 15 + React 19)
  |
  +-- /               Landing page
  +-- /upload         Drag-drop Excel/CSV parser
  +-- /dashboard      ECharts + Glassmorphism stats
  +-- /chat           AI Agent (query / report / interpret)
  +-- /report         Browser print -> PDF
  |
  +-- /api/upload     File ingestion -> Supabase
  +-- /api/analyze    DeepSeek insight generation
  +-- /api/agent      Intent routing -> specialized agents
  +-- /api/chat       Context-aware conversation
```

## AI Agent System

Three specialized agents behind a unified chat interface:

| Agent | Trigger | Capability |
|---|---|---|
| `query-agent` | "which", "how many", "top N", find, rank | Precise data lookup + chart suggestions |
| `report-agent` | "report", "summary", "analyze" | Multi-section structured report |
| `interpret-agent` | "why", "insight", "trend", "interpret" | Narrative insights + anomaly detection |

Requests fall through to `general-agent` when no intent matches.

```typescript
// src/lib/agent/
router.ts          // intent detection + dispatch
query-agent.ts     // NL data queries
report-agent.ts    // structured report generation
interpret-agent.ts  // deep narrative analysis
general-agent.ts   // fallback conversation
llm.ts             // OpenAI-compatible client
types.ts           // AgentContext, AgentResponse
```

## Project layout

```
src/
  app/                         # Next.js App Router
    page.tsx                   # Landing
    layout.tsx                  # Root layout + navbar
    globals.css                 # Theme, glass, animations
    upload/page.tsx             # File upload (react-dropzone)
    dashboard/page.tsx          # Analytics dashboard
    chat/page.tsx               # Agent chat UI
    report/page.tsx             # Print-to-PDF
    api/
      agent/route.ts            # Agent dispatch API
      upload/route.ts           # File ingestion
      analyze/route.ts          # DeepSeek analysis
      chat/route.ts             # Context chat
      report/route.ts           # PDF generation
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton
    charts/     # Pie, Bar, Line (ECharts wrappers)
    ai/         # AnalysisPanel, ChatPanel
    layout/     # Navbar, PageTransition
  lib/
    parser.ts   # xlsx-based Excel/CSV parser
    db.ts       # Supabase client + CRUD
    ai.ts       # DeepSeek API client
    utils.ts    # cn(), formatNumber, formatCurrency
    agent/      # Agent framework (see above)
  types/
    index.ts    # Shared type definitions
```

## Quick start

```bash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
```

Create `.env.local`:

```env
DEEPSEEK_API_KEY=sk-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

```bash
npm run dev     # http://localhost:3000
```

## Database

Run this in Supabase SQL Editor:

```sql
CREATE TABLE datasets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  original_name TEXT NOT NULL,
  columns     JSONB DEFAULT '[]',
  rows        JSONB DEFAULT '[]',
  row_count   INTEGER DEFAULT 0,
  summary     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
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
```

## Design

| Token | Value |
|---|---|
| Background | `#0B0F17` |
| Surface | `#111827` |
| Primary | `#6366F1` -> `#A855F7` gradient |
| Accent | `#06B6D4` (cyan), `#A855F7` (purple) |
| Font | Inter, system-ui |
| Radius | 12-16px |
| Grid | 8px |
| Effects | `backdrop-blur-xl`, `shadow-lg` |
