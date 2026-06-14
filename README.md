# Commerce Copilot

> AI 驱动的电商经营诊断平台。上传 Excel，获取可执行的经营决策。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## 核心功能

### 智能语义分析
上传任意表格，系统自动识别每列的语义角色（金额/时间/商品名/地址/数量/分类），不限于预定义的订单/供货类型。
- **任意表格** → 语义角色自动检测 → 可用分析维度自动匹配
- **多表关联** → 检测共享实体“商品名”或“时间”维度 → 自动触发跨表分析

### 智能首页
- 有历史数据 → 经营工作台（数据概览 + 快速入口）
- 无数据 → 引导页

### AI 决策引擎
- 定价决策：毛利率分析、价格集中度预警
- 补货决策：销量速度提醒
- 跨表分析：订单表×供货表 → 利润分析、新品机会、供应链盲区

### 反幻觉体系
- **Prompt 硬约束**：每个数字必须溯源到具体行/列，数据不足时强制回复 DATA_INSUFFICIENT
- **数据校验**：AI 声称的每个数值实时验证是否真实存在于源数据
- **可验证 UI**：用户可点击查看每个数据点的溯源信息

### 供货分析
- 价格四分位分布
- 商品信号标注（主推/新品/高性价比/尾季/谨慎）
- AI 进货推荐单

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

## 架构设计

```
上传 Excel
    |
    v
解析引擎（规则优先 + AI 引导兆底）
    |
    v
语义分析（列角色检测 + 关系发现）
    |
    v
存入 localStorage + Supabase（非阻塞）
    |
    v
智能首页（工作台 / 引导页）
    |
    v
Dashboard（语义驱动渲染）
    |-- 决策卡片（P0/P1/P2 优先级）
    |-- 跨表关联 Banner
    |-- 排行/分布/异常检测
    |
    v
AI Agent（反幻觉 + 溯源 + 跨表 context）
```

### 核心设计决策

- **语义驱动**：不限于订单/供货类型，任意表格自动识别可用分析维度
- **localStorage 优先**：数据本地持久化，Supabase 为可选缓存
- **反幻觉体系**：AI 输出实时校验，防止编造数据
- **AI 解析兆底**：规则引擎失败时自动切换 AI 引导解析

---

## 项目结构

```
src/
  app/
    page.tsx                   # 智能首页
    layout.tsx                  # 根布局 + 导航栏
    error.tsx                   # 全局错误边界
    upload/page.tsx             # 上传页
    dashboard/page.tsx          # 语义驱动诊断
    workspace/page.tsx          # 数据工作台
    chat/page.tsx               # AI 对话
    report/page.tsx             # 报告生成
    api/
      agent/route.ts            # Agent 路由 + 跨表context
      upload/route.ts           # 解析 + 语义分析
      analyze/route.ts          # DeepSeek 分析
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton
    charts/     # 饼图, 柱状图, 折线图 (ECharts)
    insights/   # HealthCard, DecisionCardUI, GenericOverview
    procurement/ # SupplyHealth, PurchaseList
    workspace/  # SalesTrend, ProductRank, CategoryBreakdown, RegionMap
    layout/     # Navbar
  lib/
    parser.ts              # Excel/CSV 解析
    parser-ai.ts           # AI 引导解析兆底
    semantic/              # 语义分析引擎
      types.ts, roles.ts, relations.ts
    verify.ts              # 数据溯源校验
    db.ts                  # Supabase 客户端
    store/                 # localStorage 状态管理
    agent/                 # AI Agent 框架（反幻觉Prompt）
    decisions/             # 决策引擎
    procurement/           # 供货分析引擎
    logger.ts              # 结构化日志
    i18n/                  # 中文文本管理
  types/
    index.ts               # 公共类型
```

---

## 快速开始

```bash
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot
npm install
```

创建 `.env.local`：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
npm run dev     # http://localhost:3000
```

---

## 安全说明

- API 密钥通过 `process.env` 引用，无硬编码
- `.env.local` 已加入 `.gitignore`
- 源代码及构建产物中不含密钥

---

## 部署 (Vercel)

1. 在 Vercel 中导入 GitHub 仓库 `leonis77/ai-data-copilot`
2. 配置环境变量：`DEEPSEEK_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
3. 点击 Deploy
4. 推送 `master` 自动触发重新部署

---

## 更新日志

- **2026-06-14** 语义决策系统：角色检测 + 跨表关联 + 反幻觉体系
- **2026-06-14** AI 引导解析：DeepSeek 结构分析 + 规则引擎兆底
- **2026-06-14** 智能首页：有数据→工作台，无数据→引导页
- **2026-06-14** 决策引擎：定价 + 补货决策卡片
- **2026-06-14** 供货分析：价格四分位 + AI 进货建议
- **2026-06-14** 全局错误边界 + 结构化日志 + AI 重试
- **2026-06-14** i18n JSON 集中文本管理

## License

MIT
