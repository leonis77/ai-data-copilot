# Commerce Copilot

> AI 驱动的电商经营诊断平台 —— 上传订单数据，自动发现经营问题，生成可执行的行动建议。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## 产品定位

不是“AI 数据看板”，而是 **AI 电商经营诊断系统**。

帮助中小电商商家回答核心问题：

- 哪些商品赚钱？哪些在拖后腿？
- 库存是否有积压风险？
- 店铺是否过度依赖爆款？
- 哪些商品应该涨价？哪些应该清仓？
- 明天最应该做什么？

**数据流**: 上传 Excel → 自动建模 → 指标计算 → 规则诊断 → AI 推理 → 行动建议

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | TailwindCSS + 暗黑主题 |
| 组件 | Radix UI + Lucide Icons |
| 动效 | Framer Motion |
| 图表 | ECharts |
| AI | DeepSeek Chat API |
| 数据库 | Supabase (PostgreSQL) |
| 部署 | Vercel |

---
## 快速开始

`ash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
`

### 环境变量

创建 .env.local：

`env
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`

`ash
npm run dev     # 启动开发服务器 http://localhost:3000
`

---
## Database Setup

Run in Supabase SQL Editor:

```sql
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
```

---

## AI Agent System

Three specialized agents share one chat interface. Intent detected via regex:

| Agent | Trigger | Capability |
|-------|---------|------------|
| query-agent | query, find, top | Precise data lookup + chart |
| report-agent | report, summary | Structured analysis report |
| interpret-agent | trend, why, insight | Narrative + anomaly detection |
| general-agent | Fallback | General Q&A |

`
src/lib/agent/
  router.ts          # Intent detection + routing
  query-agent.ts     # Data query
  report-agent.ts    # Report generation
  interpret-agent.ts # Deep interpretation
  general-agent.ts   # General fallback
  llm.ts             # OpenAI-compatible client
  types.ts           # AgentContext, AgentResponse
`
---

## Diagnosis Engine

`
src/lib/engines/
  metrics-engine.ts    # GMV / AOV / refund rate / concentration
  diagnosis-engine.ts  # Stockout / dead stock / hit dependency
  decision-engine.ts   # P0/P1/P2 priority scoring
`

| Condition | Diagnosis |
|-----------|-----------|
| High sales + Low stock | Stockout risk |
| Low sales + High stock | Dead stock risk |
| High sales + Low price | Price increase opportunity |
| Top 3 products > 70% revenue | Hit product dependency |
| Turnover rate < threshold | Inventory backlog |

---

## Project Structure

`
src/
  app/
    page.tsx                   # Landing page
    layout.tsx                  # Root layout + nav
    globals.css                 # Dark theme + glassmorphism
    upload/page.tsx             # Upload page
    dashboard/page.tsx          # Diagnosis dashboard
    workspace/page.tsx          # Data workspace
    chat/page.tsx               # AI chat
    compare/page.tsx            # Data comparison
    report/page.tsx             # Report generation
    api/
      agent/route.ts            # Agent API
      upload/route.ts           # Upload API
      analyze/route.ts          # Analysis API
      compare/route.ts          # Comparison API
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton
    charts/     # Pie, Bar, Line charts (ECharts)
    ai/         # AnalysisPanel, ChatPanel
    insights/   # HealthCard, RiskCard, OpportunityCard, ActionCard
    workspace/  # SalesTrend, ProductRank, CategoryBreakdown, RegionMap, AnomalyDetection
    layout/     # Navbar, PageTransition
  lib/
    parser.ts          # Excel/CSV parser
    db.ts              # Supabase client
    store/             # State management
    agent/             # AI Agent framework
    engines/           # Diagnosis engine
    analysis/          # Data analysis functions
    rag/               # RAG retrieval
    templates/         # Platform templates (Tmall/JD/PDD/Douyin)
  types/
    index.ts           # Type definitions
`

---

## Usage Guide

### 1. Upload Data
Go to /upload, drag-drop or click to upload Excel/CSV.

### 2. Select Columns
Check desired columns, click View Analysis to enter dashboard.

### 3. Business Diagnosis
- Health Score: 0-100 based on inventory, sales, structure, pricing
- Critical Issues: Auto-detected stockout, dead stock, hit dependency
- Opportunities: Price increase, promotion, restock suggestions
- Action Center: P0/P1/P2 prioritized executable actions
- AI Analysis: DeepSeek-powered deep interpretation

### 4. Data Workspace
Five views: Sales Trend, Product Ranking, Category Breakdown, Regional Map, Anomaly Detection.

### 5. AI Chat
Go to /chat to query metrics, generate reports, interpret trends.

### 6. Data Comparison
Go to /compare to compare two datasets side by side.

### 7. Generate Report
Go to /report, click Generate Report, print to PDF.

---

## Deployment (Vercel)

1. Import GitHub repo leonis77/ai-data-copilot in Vercel
2. Configure env vars: DEEPSEEK_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
3. Click Deploy
4. Push to master triggers auto-redeploy

---

## Architecture

`
Upload Excel
    |
    v
Template Matching (Tmall / JD / PDD / Douyin)
    |
    v
Field Normalization
    |
    v
Store in Supabase + localStorage
    |
    v
/dashboard Diagnosis
    |-- Metrics Engine
    |-- Diagnosis Engine
    |-- Anomaly Engine
    |-- AI Reasoning (DeepSeek)
    |
    v
Action Recommendations (P0/P1/P2)
`

---

## License

MIT