# AI Data Copilot

AI 驱动的数据 Agent 平台 — **问数**、**报告**、**解读**，将原始数据转化为决策。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript (strict) |
| 样式 | TailwindCSS, Glassmorphism 暗黑主题 |
| 组件 | Radix UI, Lucide Icons |
| 动效 | Framer Motion |
| 图表 | ECharts |
| AI | DeepSeek Chat API |
| 存储 | Supabase (PostgreSQL) |
| 部署 | Vercel |

## 架构

```
Browser (Next.js 15 + React 19)
  |
  +-- /               首页, Hero + 功能展示
  +-- /upload         拖拽上传 Excel/CSV
  +-- /dashboard      仪表盘, ECharts 图表
  +-- /chat           AI Agent 对话 (问数/报告/解读)
  +-- /report         浏览器打印 -> PDF
  |
  +-- /api/upload     文件解析 -> Supabase
  +-- /api/analyze    DeepSeek 数据分析
  +-- /api/agent      Agent 路由分发
  +-- /api/chat       上下文对话
```

## AI Agent 系统

三个专用 Agent 共享统一对话入口，前端正则匹配意图后路由分发：

| Agent | 触发词 | 能力 |
|---|---|---|
| `query-agent` | "查询""哪个""多少""排名" | 精确数据查询 + 图表建议 |
| `report-agent` | "报告""总结""分析一下" | 多段结构化报告 |
| `interpret-agent` | "解读""为什么""趋势""洞察" | 叙事分析 + 异常检测 + 机会点 |

未命中意图时由 `general-agent` 兜底处理。

```typescript
// src/lib/agent/
router.ts          // 意图检测 + 路由分发
query-agent.ts     // 数据查询
report-agent.ts    // 报告生成
interpret-agent.ts // 深度解读
general-agent.ts   // 通用兜底
llm.ts             // OpenAI 兼容客户端
types.ts           // AgentContext, AgentResponse
```

## 目录结构

```
src/
  app/                         # Next.js App Router
    page.tsx                   # 首页
    layout.tsx                  # 根布局 + 导航栏
    globals.css                 # 主题, 玻璃效果, 动效
    upload/page.tsx             # 上传页 (react-dropzone)
    dashboard/page.tsx          # 仪表盘
    chat/page.tsx               # Agent 对话
    report/page.tsx             # 打印 PDF
    api/
      agent/route.ts            # Agent 分发 API
      upload/route.ts           # 文件解析
      analyze/route.ts          # DeepSeek 分析
      chat/route.ts             # 上下文对话
      report/route.ts           # PDF 生成
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton
    charts/     # 饼图, 柱状图, 折线图 (ECharts)
    ai/         # AnalysisPanel, ChatPanel
    layout/     # Navbar, PageTransition
  lib/
    parser.ts   # Excel/CSV 解析 (xlsx)
    db.ts       # Supabase 客户端
    ai.ts       # DeepSeek API 封装
    utils.ts    # cn(), formatNumber
    agent/      # Agent 框架
  types/
    index.ts    # 公共类型定义
```

## 快速开始

```bash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
```

创建 `.env.local`:

```env
DEEPSEEK_API_KEY=sk-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

```bash
npm run dev     # http://localhost:3000
```

## 数据库

在 Supabase SQL Editor 中执行：

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

## 设计规范

| Token | 值 |
|---|---|
| 背景 | `#0B0F17` |
| 卡片 | `#111827` |
| 主色 | `#6366F1` -> `#A855F7` 渐变 |
| 辅色 | `#06B6D4` (cyan), `#A855F7` (purple) |
| 字体 | Inter, system-ui |
| 圆角 | 12-16px |
| 网格 | 8px |
| 效果 | `backdrop-blur-xl`, `shadow-lg` |
