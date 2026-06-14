# Commerce Copilot

> AI 驱动的电商经营诊断平台。上传 Excel，获取可执行的经营决策。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## 核心功能

### 智能数据类型识别
上传表格时自动检测业务类型，切换对应分析模式：
- **订单表**（含订单/买家/收货/支付/退款）→ 经营诊断 + 决策卡片
- **供货表**（含SKU/供货价/产地/规格）→ 供货分析 + AI进货建议
- **通用表**（都不匹配）→ 智能列画像 + 数值统计

### 智能首页
- 有历史数据 → 显示经营工作台（数据概览 + 快速入口）
- 无数据 → 显示引导页

### AI 决策引擎
- 定价决策：毛利率分析、价格集中度预警
- 补货决策：销量速度提醒

### 供货分析
- 价格四分位分布
- 商品信号标注（主推/新品/高性价比/尾季/谨慎）
- AI 进货推荐单

### 通用数据画像
任意表格上传后自动分析：
- 列角色识别（ID/名称/价格/日期/分类/地址/数量）
- 值类型推断（数字/日期/文本）
- 数值列统计（最小/最大/均值）

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
npm run dev     # 启动开发服务器 -> http://localhost:3000
```

---

## 架构设计

```
上传 Excel
    |
    v
数据画像检测 (订单/供货/通用)
    |
    v
存入 localStorage + Supabase（非阻塞）
    |
    v
智能首页（工作台 或 引导页）
    |
    v
Dashboard（按类型渲染）
    |-- 订单 -> 决策卡片 + 健康评分 + 图表
    |-- 供货 -> 供货健康 + AI进货建议
    |-- 通用 -> 列画像 + 数值统计
```

### 核心设计决策

- **localStorage 优先**：数据本地持久化，Supabase 为可选缓存
- **Supabase 非阻塞**：存储失败不影响上传成功
- **上传时检测类型**：一次判定，持久存储，不重复计算
- **useRef 存储文件数据**：避免 React 闭包陷阱

---

## 项目结构

```
src/
  app/
    page.tsx                   # 智能首页（工作台/引导页）
    layout.tsx                  # 根布局 + 导航栏
    globals.css                 # 暗黑主题 + 玻璃拟态
    error.tsx                   # 全局错误边界
    upload/page.tsx             # 上传页（拖拽+Sheet选择+字段选择）
    dashboard/page.tsx          # 按类型诊断（订单/供货/通用）
    workspace/page.tsx          # 数据工作台（5个分析视图）
    chat/page.tsx               # AI 对话助手
    report/page.tsx             # 报告生成 + 打印
    api/
      agent/route.ts            # Agent 路由 + RAG
      upload/route.ts           # 文件解析 + 画像检测
      analyze/route.ts          # DeepSeek 分析
      report/route.ts           # 报告生成
  components/
    ui/         # GlassCard, CountUp, Typewriter, Skeleton, SheetPicker
    charts/     # 饼图, 柱状图, 折线图 (ECharts)
    insights/   # HealthCard, DecisionCardUI, RiskCard, GenericOverview
    procurement/ # SupplyHealth, PurchaseList
    workspace/  # SalesTrend, ProductRank, CategoryBreakdown, RegionMap
    layout/     # Navbar
  lib/
    parser.ts              # Excel/CSV 解析（智能标题检测 + 合并单元格处理）
    db.ts                  # Supabase 客户端（全 try-catch）
    store/                 # localStorage 状态管理（容量检测 + 清理）
    agent/                 # AI Agent 框架（重试 + 结构化提示词）
    decisions/             # 决策引擎（定价 + 补货）
    procurement/           # 供货分析引擎（价格 + 信号 + 推荐）
    logger.ts              # 结构化日志 (debug/info/warn/error)
    i18n/                  # zh.json 集中文本管理
    templates/             # 平台模板（天猫/京东/拼多多/抖店）
  types/
    index.ts               # 公共类型定义
```

---

## 数据库初始化

在 Supabase SQL Editor 中执行：

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

## 安全说明

- API 密钥通过 `process.env` 引用，无硬编码
- `.env.local` 已加入 `.gitignore`
- 源代码及构建产物中不含密钥

---

## 部署 (Vercel)

1. 在 Vercel 中导入 GitHub 仓库 `leonis77/ai-data-copilot`
2. 配置环境变量：`DEEPSEEK_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
3. 点击 Deploy
4. 推送 `master` 分支自动触发重新部署

---

## 更新日志

- **2026-06-14** 通用数据画像：智能列角色识别 + 数值统计
- **2026-06-14** 智能首页：有数据->工作台，无数据->引导页
- **2026-06-14** 上传时自动检测数据类型（订单/供货/通用）
- **2026-06-14** 决策引擎：定价 + 补货决策卡片
- **2026-06-14** 供货分析模块：价格四分位 + AI 进货建议
- **2026-06-14** 全局错误边界 + 结构化日志
- **2026-06-14** AI API 指数退避重试
- **2026-06-14** localStorage 容量检测 + 自动清理
- **2026-06-14** i18n JSON 集中文本管理

## License

MIT
