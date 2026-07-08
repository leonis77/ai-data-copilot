# Commerce Copilot

> Upload your store data. Get a profit diagnosis and actionable decisions — not just charts.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## 它能做什么

Commerce Copilot 接收你的电商表格（订单、供货成本、广告、退款），告诉你哪些商品在亏钱、为什么亏、以及该怎么做。

目标用户：天猫、淘宝、京东、拼多多、抖音上月营收 ¥10万–500万 的卖家。

### 通用 AI 分析的问题

问 ChatGPT "帮我分析销售数据"，你得到的是看似合理实则空洞的文字。问它 "商品 A 的利润是多少"，它靠猜。Commerce Copilot 不猜——它运行一个了解每个平台精确费率结构的规则引擎，再让 AI 用通俗语言解释结果。

### 核心工作流

```
上传表格 → 自动识别平台和表格类型 → 计算单品利润
→ 诊断问题 → 构建证据卡 → AI 解释发现 → 分级行动方案
```

每条可执行的建议都链回具体的证据卡和业务规则，推理过程全程可追溯。

---

## Features

### 15 种平台模板，零配置

拖入 Excel 或 CSV 文件。模板引擎通过匹配列指纹自动识别来源平台和表格类型——无需手动映射。

| 类别 | 支持的数据源 |
|---|---|
| 订单 | 天猫、淘宝、拼多多、抖音、京东 |
| 广告 | 直通车（计划/关键词）、引力魔方、万相台、千川 |
| 退款 | 淘宝退款、拼多多退款 |
| 通用 | 库存、商品目录、供应商报价 |

无法识别的格式回退到 AI 辅助解析，并需用户确认。

### 利润引擎（4 平台、8 项成本）

扣除每项可见成本后计算实际单品利润：

| 成本项 | 适用平台 |
|---|---|
| 平台佣金 | 全部（各平台费率不同） |
| 固定费用（月费÷销量） | 京东、天猫 |
| 运费险 | 全部 |
| 达人佣金 | 抖音（A/B+/C/D 分级制度） |
| 运费 | 全部 |
| 广告费分摊 | 全部 |
| 退货损耗 | 全部 |
| 财税合规成本 | 拼多多（未开票资金冻结） |

平台费率数据锁定至 2026 年 7 月，版本化可审计。

### 决策管道（9 层）

不同于"数据进、AI 文字出"的模式，管道产出可追溯的决策链：

```
Raw data → Metrics → Diagnosis → Evidence cards → Business rules
→ Cross-dataset comparison → Cross-platform comparison → AI explanation → Ranked actions
```

每一层由专用引擎代码计算。AI 位于解释层——它解读数字，不发明数字。

### 跨平台利润对比

上传多平台数据后，引擎通过 Jaccard 相似度匹配跨平台商品，计算各平台利润，标记价差超过 30% 的商品。

### 反幻觉护栏

- AI 输出中的每个数字必须引用证据卡索引
- 所有成本和利润由确定性 JS 计算——AI 只负责解释
- 每条建议链接到触发它的具体业务规则
- 证据卡和知识库条目附带置信度评分

---

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript (strict) |
| 样式 | Tailwind CSS, 暗色主题 |
| UI | Radix UI, Lucide 图标, Framer Motion |
| 图表 | ECharts |
| AI | DeepSeek V4 Pro / V4 Flash |
| 知识 | 静态知识库 + WebSearch 回退 |
| 数据库 | Supabase (PostgreSQL, 免费额度) |
| 托管 | Vercel |

---

## 快速开始

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

## 项目结构

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
    insights/                   # EvidenceCard, ActionCard, CrossPlatform, CrossDataset, Health
    dashboard/                  # ProfitBar, ProfitRanking, CostStructure
    procurement/                # 供货分析面板
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

## 部署

1. Fork 或克隆到你的 GitHub 账号
2. 将仓库导入 Vercel
3. 设置环境变量：`DEEPSEEK_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
4. 部署——推送到 `master` 分支会自动触发重新部署

生产环境：[ai-data-copilot-sigma.vercel.app](https://ai-data-copilot-sigma.vercel.app)

---

## 安全

- 所有 API 密钥从 `process.env` 读取——无硬编码密钥
- `.env.local` 和 `.env.prod` 已在 `.gitignore` 中
- Supabase RLS 策略可用于行级访问控制

---

## 更新日志

**2026-07-08** — 全链路闭环修复 + 证据链优化 (V1.0)
- 🔧 P0 断裂链修复：Dashboard AI 摘要字段路径、跨平台数据路径、relatedDatasetIds 传入、"平台"列语义角色冲突、avgPrice 加权均价计算
- 🔗 P1 证据链优化：API 响应补充 metrics+aiExplanation 完整嵌套对象、CrossPlatform 提升到 DecisionChain 顶层、EvidenceCardView 展示估算标记、Dashboard Pipeline 错误状态+重试、Dashboard 嵌入证据卡展示
- 🎯 P2 体验增强：AI 置信度彩色徽章（Dashboard + Chat 双端）
- 🐛 P3 隐藏 Bug：stockHealth 计算、influencerCommissionRate 残留字段清理
- ✅ TypeScript 构建零错误，9 文件 +107/-15 行

**2026-07-07** — 前后端 Pipeline 集成 (V0.9)
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
