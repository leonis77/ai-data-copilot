# AI Data Copilot

> AI-driven Data Agent Platform - Query, Report, Interpret

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

## Architecture

`
User Interface (Next.js 15)
    |-- Landing Page (Hero + Features)
    |-- Upload (Drag-drop Excel/CSV parsing via xlsx)
    |-- Dashboard (ECharts + Glassmorphism cards)
    |-- AI Agent (Intent detection -> Query/Report/Interpret)
    |-- Report (Browser native print -> PDF)
    |
    |-- API Routes (Vercel Serverless)
    |   |-- /api/upload  -> Supabase storage
    |   |-- /api/analyze  -> DeepSeek AI analysis
    |   |-- /api/agent  -> Agent routing
    |   |-- /api/chat  -> AI conversation
    |
    |-- Data Layer
        |-- Supabase PostgreSQL (production)
        |-- JSON file (local dev)
`

## Tech Stack

| Layer | Technology |
|--|--|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | TailwindCSS + Glassmorphism dark theme |
| UI Components | Radix UI + Lucide Icons |
| Animation | Framer Motion |
| Charts | ECharts |
| AI | DeepSeek API (chat model) |
| Database | Supabase PostgreSQL |
| Deployment | Vercel |

## AI Agent System

The Agent system uses regex-based intent detection to route user queries to specialized agents:

`
User Input -> Intent Detection (regex)
                  |
    +-------------+-------------+
    v             v             v
 QueryAgent   ReportAgent   InterpretAgent   GeneralAgent
    |             |             |               |
    +-------------+-------------+---------------+
                  |
                  v
        DeepSeek Chat API -> Structured JSON + Chart Suggestions + Follow-ups
`

### Agent Routing Rules

| Intent | Keywords | Agent |
|--|--|--|
| Data Query | search/find/query/select/count/rank/top N | query-agent |
| Report Generation | report/summary/export/generate | report-agent |
| Deep Interpretation | interpret/insight/story/trend/why | interpret-agent |
| General Chat | everything else | general-agent |

## Project Structure

`
src/
  app/
    page.tsx            # Landing page
    layout.tsx          # Root layout + navbar
    globals.css         # Dark theme + animations
    upload/page.tsx     # Upload with react-dropzone
    dashboard/page.tsx  # Dashboard with ECharts
    chat/page.tsx       # AI Agent chat
    report/page.tsx     # Print-to-PDF report
    api/
      agent/route.ts    # Agent dispatcher API
      upload/route.ts   # Upload + storage API
      analyze/route.ts  # AI analysis API
      chat/route.ts     # AI conversation API
      report/route.ts   # Report generation API
  components/
    ui/       # GlassCard, CountUp, Typewriter, Skeleton
    charts/   # PieChart, BarChart, LineChart (ECharts)
    ai/       # AnalysisPanel, ChatPanel
    layout/   # Navbar, PageTransition
  lib/
    parser.ts           # Excel/CSV parser (xlsx)
    db.ts               # Supabase data layer
    ai.ts               # DeepSeek API client
    utils.ts            # Utility functions
    agent/
      router.ts         # Intent detection + routing
      query-agent.ts    # Data query agent
      report-agent.ts   # Report generation agent
      interpret-agent.ts# Data interpretation agent
      general-agent.ts  # General conversation agent
      llm.ts            # LLM client factory
      types.ts          # Agent type definitions
      index.ts          # Barrel export
  types/index.ts        # Global types
`

## Local Development

`ash
npm install
# Configure .env.local: DEEPSEEK_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm run dev     # http://localhost:3000
npm run build   # Production build
npm start       # Production server
`

## Supabase Schema

`sql
CREATE TABLE datasets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, original_name TEXT NOT NULL,
  columns JSONB DEFAULT CHAR(39)[]CHAR(39), rows JSONB DEFAULT CHAR(39)[]CHAR(39),
  row_count INTEGER DEFAULT 0, summary TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY, dataset_id TEXT REFERENCES datasets(id),
  summary TEXT, insights JSONB DEFAULT CHAR(39)[]CHAR(39),
  risks JSONB DEFAULT CHAR(39)[]CHAR(39), suggestions JSONB DEFAULT CHAR(39)[]CHAR(39),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY, dataset_id TEXT REFERENCES datasets(id),
  role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
`

## Design System

| Property | Value |
|--|--|
| Style | AI SaaS Dashboard, dark-first |
| Background | #0B0F17 |
| Cards | #111827 with backdrop-blur |
| Primary | Purple-blue gradient (#6366F1 -> #A855F7) |
| Accent | Cyan (#06B6D4), Purple (#A855F7) |
| Font | Inter + system UI (PingFang SC / Microsoft YaHei) |
| Effects | Glassmorphism, Framer Motion animations |
| Border Radius | lg/xl (12px-16px) |
| Spacing | 8px grid |

## Features

| Module | Description |
|--|--|
| Landing | Animated hero, feature cards, workflow steps |
| Upload | Drag-drop Excel/CSV, auto field detection, multi-sheet support |
| Dashboard | Stats cards, ECharts charts (pie/bar/line), AI insights |
| AI Agent | Intent routing: query/report/interpret + follow-up suggestions |
| Report | Browser native print-to-PDF with system fonts |