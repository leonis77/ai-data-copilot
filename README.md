# Commerce Copilot

> Upload your store data. Get a profit diagnosis and actionable decisions — not just charts.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## What it does

Commerce Copilot takes your e-commerce spreadsheets (orders, supply costs, ads, refunds) and tells you which products are bleeding money, why, and what to do about it.

Target users: sellers on Tmall, Taobao, JD, PDD, and Douyin doing ¥100K–5M monthly revenue.

### The problem with generic AI analytics

Ask ChatGPT to "analyze my sales data" and you get plausible-sounding paragraphs. Ask it "how much profit did I make on product A" and it guesses. Commerce Copilot doesn't guess — it runs a rules engine that knows every platform's exact fee structure, then asks AI to explain the results in plain language.

### Core workflow

```
Upload spreadsheet → auto-detect platform & table type → compute per-product profit
→ diagnose problems → build evidence cards → AI explains findings → ranked action plan
```

Each actionable suggestion links back to a specific evidence card and business rule so you can trace the reasoning.

---

## Features

### 15 platform templates, zero config

Drop an Excel or CSV file. The template engine identifies the source platform and table type by matching column fingerprints — no manual mapping needed.

| Category | Supported sources |
|---|---|
| Orders | Tmall, Taobao, PDD, Douyin, JD |
| Ads | ZTC (plan/keyword), Gravity Cube, Wanxiangtai, Qianchuan |
| Refunds | Taobao refunds, PDD refunds |
| General | Inventory, product catalogs, supplier quotes |

Unrecognized formats fall back to AI-assisted parsing with user confirmation.

### Profit engine (4 platforms, 8 cost items)

Calculates actual per-unit profit after deducting every visible cost:

| Cost item | Platforms affected |
|---|---|
| Platform commission | All (rates differ per platform) |
| Fixed fees (monthly ÷ volume) | JD, Tmall |
| Shipping insurance | All |
| Influencer commission | Douyin (A/B+/C/D tier system) |
| Shipping cost | All |
| Ad cost allocation | All |
| Return loss | All |
| Tax compliance cost | PDD (uninvoiced fund freeze) |

Platform fee data is pinned to July 2026 rates and versioned for auditability.

### Decision pipeline (9 layers)

Instead of "data in, AI text out", the pipeline produces a traceable decision chain:

```
Raw data → Metrics → Diagnosis → Evidence cards → Business rules
→ Cross-dataset comparison → Cross-platform comparison → AI explanation → Ranked actions
```

Each layer is computed by dedicated engine code. AI sits at the explanation layer — it interprets the numbers, it doesn't invent them.

### Cross-platform profit comparison

When you upload data from multiple platforms, the engine matches products across platforms (Jaccard similarity on product names), computes per-platform profit, and flags price spreads above 30%.

### Anti-hallucination guardrails

- Every number in AI output must reference an evidence card index
- All costs and profits are computed by deterministic JS — AI only explains
- Each recommendation links to the specific business rule that triggered it
- Confidence scores attached to evidence cards and knowledge base entries

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS, dark theme |
| UI | Radix UI, Lucide icons, Framer Motion |
| Charts | ECharts |
| AI | DeepSeek V4 Pro / V4 Flash |
| Knowledge | Static knowledge base + WebSearch fallback |
| Database | Supabase (PostgreSQL, free tier) |
| Hosting | Vercel |

---

## Quick start

```bash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
```

Create `.env.local`:

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
npm run dev    # opens at http://localhost:3000
```

---

## Project layout

```
src/
  app/
    page.tsx                    # Landing
    upload/page.tsx             # File upload + template matching
    dashboard/page.tsx          # Diagnostic dashboard
    chat/page.tsx               # AI chat with structured cards
    api/
      upload/route.ts           # Parse + semantic analysis
      agent/route.ts            # Decision pipeline + AI agent
      analyze/route.ts          # Layered AI analysis
      chat/route.ts             # Conversation API
  components/
    ui/                         # GlassCard, CountUp, Skeleton, TableSelector
    charts/                     # Pie, bar (ECharts)
    insights/                   # EvidenceCard, ActionCard, CrossPlatform, Health
    procurement/                # Supply analysis panel
    layout/                     # Navbar
  lib/
    pipeline/                   # Decision chain orchestrator
      decision-pipeline.ts      # 9-layer pipeline: metrics → diagnosis → evidence → rules → AI → actions
      ai-explanation.ts         # Structured system prompt builder
      types.ts                  # EvidenceCard, DecisionChain, PrioritizedAction, etc.
    engines/                    # Compute engines
      metrics-engine.ts         # Product & store-level KPIs
      diagnosis-engine.ts       # Health diagnosis (stockout, stagnation, over-reliance)
      decision-engine.ts        # Prioritized action generation (P0/P1/P2)
    profit/
      engine.ts                 # 4-platform profit calculator (8 cost items)
    semantic/
      types.ts, roles.ts        # Column role detection (money/entity/datetime/quantity)
      relations.ts              # Cross-table relation discovery
    rag/
      inject.ts                 # Knowledge injection (AI-primary architecture v3)
      knowledge.ts              # Knowledge base search
      industry-detector.ts      # 15-industry auto-detection
      freshness.ts              # Staleness guard (4-layer defense)
    cross-platform.ts           # Jaccard product matching + profit comparison
    templates/                  # 15 platform templates
    parser.ts                   # Excel/CSV parsing
    store/                      # localStorage state management
    db.ts                       # Supabase client
```

---

## Deploy

1. Fork or clone to your GitHub account
2. Import the repo into Vercel
3. Set environment variables: `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — pushes to `master` trigger automatic redeploys

Production: [ai-data-copilot-sigma.vercel.app](https://ai-data-copilot-sigma.vercel.app)

---

## Security

- All API keys read from `process.env` — no hardcoded secrets
- `.env.local` and `.env.prod` are in `.gitignore`
- Supabase RLS policies available for row-level access control

---

## Changelog

**2026-07-07** — Frontend-backend pipeline integration (V0.x)
- Chat UI now renders structured evidence cards, action cards, cross-dataset comparisons, and cross-platform profit tables alongside AI text
- Dashboard fetches decision chain from `/api/agent` instead of duplicating compute logic
- Three new components: EvidenceCardView, ActionCardView, CrossDatasetView
- Cross-dataset comparison works end-to-end (on-the-fly role detection, Jaccard entity matching, price/quantity tables)

**2026-07-06** — Knowledge engine refactor + profit engine
- AI-primary knowledge architecture (DeepSeek V4 as main reasoner, knowledge base as trusted cache)
- WebSearch layer for real-time policy verification
- 15-industry auto-detection
- 4-platform profit engine with 8 cost items
- Cross-platform product matching and profit comparison

**2026-06-17** — Platform templates + ads engine
- 15 platform templates with automatic detection
- Ads analysis engine (ROI ranking, anomaly detection, budget suggestions)
- Cross-table profit engine (orders × supply × ads × refunds)
- 8 table-type classifier (role fingerprint, not regex)
- Business concept translation layer (55+ rules)

**2026-06-14** — Semantic decision system
- Column role detection (money/entity_name/datetime/quantity/location)
- AI-guided parser for unrecognized formats
- Decision engine and supply analysis panel

## License

MIT
