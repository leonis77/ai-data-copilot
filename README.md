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

```bash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
```

### 环境变量

创建 `.env.local`：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
npm run dev     # 启动开发服务器 http://localhost:3000
```

---

## 数据库初始化

在 Supabase SQL Editor 中执行以下建表语句：

```sql
-- 数据集表
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

-- 分析结果表（缓存）
CREATE TABLE analysis_results (
  id          TEXT PRIMARY KEY,
  dataset_id  TEXT REFERENCES datasets(id),
  summary     TEXT,
  insights    JSONB DEFAULT '[]',
  risks       JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 关闭 RLS（开发阶段）
ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;
```

---
## AI Agent 系统

三个专用 Agent 共用一个对话入口，前端通过正则匹配意图后路由分发：

| Agent | 触发词 | 能力 |
|-------|--------|------|
| `query-agent` | 查询、排名、最高、多少 | 精确数据查询 + 图表建议 |
| `report-agent` | 报告、总结、生成 | 多段结构化经营报告 |
| `interpret-agent` | 解读、趋势、为什么 | 叙事分析 + 异常检测 + 机会点 |
| `general-agent` | 未命中意图 | 通用问答兜底 |

### Agent 目录

```
src/lib/agent/
  router.ts          # 意图检测 + 路由分发
  query-agent.ts     # 数据查询
  report-agent.ts    # 报告生成
  interpret-agent.ts # 深度解读
  general-agent.ts   # 通用兜底
  llm.ts             # OpenAI 兼容客户端
  types.ts           # AgentContext, AgentResponse
```

---

## 经营诊断引擎

```
src/lib/engines/
  metrics-engine.ts    # 指标计算（GMV / 客单价 / 退款率 / 集中度）
  diagnosis-engine.ts  # 规则诊断（缺货 / 滞销 / 爆款依赖 / 涨价机会）
  decision-engine.ts   # 决策排序（P0 / P1 / P2 优先级）
```

### 诊断规则示例

| 条件 | 诊断结果 |
|------|----------|
| 销量高 + 库存低 | 缺货风险 |
| 销量低 + 库存高 | 滞销风险 |
| 销量高 + 价格低 | 涨价机会 |
| TOP3 商品销售额占比 > 70% | 爆款依赖 |
| 库存周转率 < 阈值 | 库存积压 |

---

## 项目结构

```
src/
  app/
    page.tsx                   # 首页 (Hero + 功能介绍)
    layout.tsx                  # 根布局 + 导航栏
    globals.css                 # 暗黑主题 + 玻璃拟态 + 动画
    upload/page.tsx             # 上传页 (拖拽 + 模板匹配 + 字段选择)
    dashboard/page.tsx          # 经营诊断仪表盘
    workspace/page.tsx          # 数据工作台 (销售额/排行/品类/区域/异常)
    chat/page.tsx               # AI 分析助手对话
    compare/page.tsx            # 两表纵向对比
    report/page.tsx             # 报告生成 + 打印
    api/
      agent/route.ts            # Agent 路由 API
      upload/route.ts           # 文件解析 API
      analyze/route.ts          # DeepSeek 分析 API
      compare/route.ts          # 对比分析 API
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton, SheetPicker, ColumnSelector
    charts/     # 饼图, 柱状图, 折线图 (ECharts)
    ai/         # AnalysisPanel, ChatPanel, CompareCard
    insights/   # HealthCard, RiskCard, OpportunityCard, ActionCard
    workspace/  # SalesTrend, ProductRank, CategoryBreakdown, RegionMap, AnomalyDetection
    layout/     # Navbar, PageTransition
  lib/
    parser.ts          # Excel/CSV 解析
    db.ts              # Supabase 客户端
    store/             # localStorage 状态管理
    agent/             # AI Agent 框架
    engines/           # 诊断引擎
    analysis/          # 数据分析函数库
    rag/               # RAG 检索增强
    templates/         # 电商平台模板 (天猫/京东/拼多多/抖店)
  types/
    index.ts           # 公共类型定义
```
---

## 设计系统

| Token | 值 |
|-------|-----|
| 主背景 | `#0B0F17` |
| 卡片背景 | `#111827` |
| 主色渐变 | `#6366F1` → `#A855F7` |
| 辅助色 | `#06B6D4` (cyan), `#A855F7` (purple) |
| 字体 | Inter, system-ui |
| 圆角 | 12-16px |
| 网格 | 8px |
| 效果 | `backdrop-blur-xl`, `shadow-lg` |

---

## 数据上传说明

### 支持格式
- `.xlsx` / `.xls` (Excel)
- `.csv` (UTF-8 编码)

### 智能识别
系统会自动匹配上传文件的列名，识别所属电商平台（天猫 / 京东 / 拼多多 / 抖店）并标准化字段映射。

### 多 Sheet 支持
对于包含多个工作表（Sheet）的 Excel 文件，系统会列出所有 Sheet，用户可选择需要分析的目标 Sheet。

### 字段选择
上传后可在字段选择器中勾选需要参与分析的列，未被选中的列将不纳入仪表盘和 AI 分析。

### 固定模板
上传页提供「下载标准模板」按钮，下载后按模板格式填写数据并上传，可获得 100% 准确识别。

---

## 使用指南

### 1. 上传数据
打开 `/upload`，拖拽或点击上传 Excel/CSV 文件。系统自动解析、匹配平台模板、显示字段列表。

### 2. 选择字段
在字段选择器中勾选需要分析的列，点击「查看分析」进入仪表盘。

### 3. 经营诊断（仪表盘）
- **健康评分**: 综合库存、销量、结构、价格四个维度计算 0-100 分
- **关键问题**: 自动识别缺货风险、滞销、爆款依赖等
- **机会**: 涨价机会、推广建议、补货建议
- **动作中心**: 按 P0/P1/P2 优先级排序的可执行动作
- **AI 分析**: 点击「开始 AI 分析」获得 DeepSeek 深度解读

### 4. 数据工作台
五个分析视图：
- **销售额体检**: 日趋势 / 周对比，支持 7/30/90 天筛选
- **商品排行榜**: TOP N 按销售额排序
- **品类结构**: 品类占比 + SKU 集中度
- **区域热力图**: 省份级别销量排名
- **异常检测**: Z-score 算法检测异常订单

### 5. AI 对话
打开 `/chat`，可以：
- 问数据：“哪个商品退货率最高？”
- 出报告：“生成一份经营分析报告”
- 深解读：“为什么最近销量下降了？”
- 找爆款：“哪些商品有增长潜力？”

### 6. 数据对比
打开 `/compare`，选择两个数据集进行纵向对比，查看公共字段的变化幅度。

### 7. 生成报告
打开 `/report`，点击「生成报告」获得 AI 分析报告，支持浏览器打印输出 PDF。

---

## 部署 (Vercel)

### 前置条件
1. GitHub 仓库已关联
2. Vercel 账户已登录
3. Supabase 数据库已创建

### 部署步骤
1. 在 Vercel 中导入 GitHub 仓库 `leonis77/ai-data-copilot`
2. 配置环境变量： `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. 点击 Deploy
4. 推送代码到 `master` 分支后 Vercel 会自动触发重新部署

---

## 架构设计

```
用户上传 Excel
       |
       v
模板匹配 (天猫/京东/拼多多/抖店)
       |
       v
字段标准化 (amount, order_time, product_name...)
       |
       v
存入 Supabase + localStorage
       |
       v
/dashboard 经营诊断
  ├── 指标计算 (metrics-engine)
  ├── 规则诊断 (diagnosis-engine)
  ├── 异常检测 (anomaly-engine)
  └── AI 推理 (DeepSeek)
       |
       v
行动建议 (P0/P1/P2 优先级排序)
```

---

## License

MIT

---

## 智能数据类型识别

系统自动识别上传表格的业务类型，并切换对应的分析模式：

| 数据类型 | 识别关键词 | 分析模式 |
|----------|-----------|---------|
| 订单表 | 订单/买家/收货/支付/退款/实付 | 经营诊断：决策卡片流 + 健康评分 |
| 供货表 | SKU/供货/产地/规格/物流 | 供货分析：价格分布 + AI进货建议 |
| 通用表 | 都不匹配 | 数据画像：智能列识别 + 数值统计 |

检测在数据上传时完成，结果持久化存储，后续访问直接读取，不重复计算。

### 智能首页

- 有历史数据时，打开直接显示经营工作台（数据概览 + 快速入口）
- 无数据时，显示功能介绍和上传引导
- 数据本地持久化（localStorage），关闭浏览器不丢失

### 通用数据画像

上传任意表格，系统自动：
- 识别每列的语义角色（ID/名称/价格/日期/分类/地址/数量）
- 检测每列的值类型（数字/日期/文本）
- 自动过滤ID列，计算数值列的均值/最大/最小值
- 一行代码不写，任何表格都能分析

## 近期更新

- 2026-06-14 通用数据画像：智能列角色识别 + 数值统计
- 2026-06-14 智能首页：有数据→工作台，无数据→引导页
- 2026-06-14 数据分类：上传时自动识别订单/供货/通用表格
- 2026-06-14 决策引擎：定价/补货决策卡片流
- 2026-06-14 供货分析模块：价格四分位 + AI进货建议单
