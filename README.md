# Commerce Copilot

> AI 驱动的电商经营决策平台。上传 Excel，秒出经营诊断和可执行决策。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leonis77/ai-data-copilot)

---

## 产品定位

**中小电商的 AI CFO** — 不做 BI 工具（太贵太复杂），不做 Excel（太浅），只做一件事：**上传数据，告诉你今天该做什么。**

目标用户：月销 ¥10-500 万的淘宝/拼多多/抖音/京东卖家。

---

## 核心能力

### 15 套平台模板，秒级识别

上传文件 → 自动识别来源平台和表格类型，零配置。

| 类别 | 支持平台 |
|------|---------|
| 订单 | 天猫、淘宝、拼多多、抖音电商、京东 |
| 推广 | 直通车(计划/关键词)、引力魔方、万相台、巨量千川 |
| 售后 | 淘宝退款单、拼多多退款单 |
| 通用 | 库存表、商品目录、供货报价表 |

非标格式（ERP 导出、自定义表）自动走 AI 解析 + 用户确认 + 另存为模板。

### 8 种表格类型智能分类

基于**语义角色指纹**（非列名正则）自动判断表格类型：

`订单表` `供货表` `推广报表` `售后表` `库存表` `商品目录` `财务流水` `通用数据表`

### ⭐ 经营决策链路（Phase 1 新增）

```
数据 → 指标 → 诊断 → 证据卡 → 规则 → AI解释 → 行动建议 → 预期收益 → 风险
```

不再是"数据 → AI → 黑盒文本"，而是 9 层透明链路：

| 层级 | 模块 | 产出 |
|:--:|------|------|
| 1 | 指标引擎 | 商品/店铺级指标（GMV/客单价/TOP3占比/贡献度） |
| 2 | 诊断引擎 | 缺货/滞销/可提价/爆款依赖/SKU冗余（含知识库引用） |
| 3 | 证据卡 | 8项成本逐项归因（佣金/达人/运费险/退货损耗/广告/财税…） |
| 4 | 规则引擎 | 8条经营规则（亏损预警/达人分级/平台费率/财税合规） |
| 5 | AI 解释 (DeepSeek V4) | 结构化 5 层上下文 → 首席采购决策分析师 |
| 6 | 决策引擎 | P0/P1/P2 优先级行动建议 + 预期收益 + 风险等级 |

### 四平台利润计算引擎

- **四平台独立费率**：天猫/京东/拼多多/抖音（2026年7月最新数据）
- **8项成本明细**：平台佣金 + 固定费用 + 运费险 + 达人佣金 + 运费 + 广告费 + 退货损耗 + 财税合规成本
- **达人佣金分级**：抖音A/B+/C/D四级，佣金率3-4倍差距
- **真实利润** = 售价 − 全部显性成本

### 跨表利润计算

上传 订单 + 供货 + 推广 + 售后 → 系统自动计算每个 SKU 的真实净利润：

> 净利润 = 订单收入 - 供货成本 - 广告费分摊 - 退款损失

### 推广分析引擎

上传推广报表 → 秒出：
- 计划 ROI 排行
- 亏损告警（ROI < 1 的计划）
- 点击率/点击单价异常检测
- 预算优化建议（停投 / 降出价 / 加预算）

### AI 分层分析管道

```
Layer 0: 数据质量 → "您的数据有 3 个问题需要注意"
Layer 1: 描述性统计 → "共 45 个商品，总 GMV ¥125,000"
Layer 2: 模式发现 → "近 7 天销量下降 15%"
Layer 3: 业务诊断 → "3 个商品采购成本高于售价"
Layer 4: 决策建议 → "P0：调整苹果定价，止损 ¥800/月"
```

AI 只做高层解读和决策生成，数学计算全部由引擎预计算。

### 反幻觉体系

- **Prompt 硬约束**：每个数字必须溯源到证据卡索引
- **规则引擎验证**：所有成本和利润由 JS 规则引擎精确计算，AI 只负责解释
- **证据卡绑定**：每条建议绑定证据卡索引 + 规则ID，完整可追溯

---

## 架构设计

```
上传文件
    │
    ▼
模板匹配 (15套平台模板，秒级，0成本)
    │ 匹配失败 → AI 解析 → 用户确认 → 另存为模板
    ▼
语义角色标注 (money/entity_name/datetime/quantity/location/...)
    │
    ▼
业务概念映射 (采购成本 vs 销售价格 vs 广告花费 vs 退款金额)
    │
    ▼
表格分类 (8种类型，角色指纹驱动)
    │
    ▼
跨表关联 + 实体匹配 (品类无关的模糊匹配引擎)
    │
    ├──→ 推广分析 (ROI排行 + 异常告警)
    ├──→ 利润计算 (跨表单品净利润)
    ├──→ ⭐ DecisionPipeline (Phase 1: 9层透明决策链路)
    └──→ AI 分层分析 (角色感知 + 类型专用 prompt)
    │
    ▼
Dashboard / 经营日报
```

### 核心设计原则

| 原则 | 说明 |
|------|------|
| **模板优先 > AI 兜底** | 能用模板就不用 AI（成本、速度、准确度） |
| **角色是唯一真相源** | 所有下游逻辑从 semanticRoles 派生，不自己猜列名 |
| **计算归引擎，解读归 AI** | 数学能确定的绝不丢给 AI 猜 |
| **经营决策链路贯通** | 7 个引擎模块从"独立孤岛"变为"串联链路" |
| **品类无关，角色驱动** | 水果/数码/服装/工业品，同一套逻辑 |
| **计算下沉到客户端** | Supabase 只做持久化，所有分析在浏览器完成 |

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
| AI | DeepSeek V4 Pro / V4 Flash |
| 知识库 | 静态知识条目 + WebSearch 实时验证 |
| 数据库 | Supabase (PostgreSQL, 免费额度) |
| 部署 | Vercel |

---

## 项目结构

```
src/
  app/
    page.tsx                      # 智能首页
    upload/page.tsx               # 上传 + 模板匹配 + 分类
    dashboard/page.tsx            # 经营日报 + 详细分析
    workspace/page.tsx            # 数据工作台
    chat/page.tsx                 # AI 对话
    report/page.tsx               # 报告生成
    api/
      upload/route.ts             # 解析 + 语义分析 + 模板匹配
      analyze/route.ts            # 分层 AI 分析管道
      agent/route.ts              # ⭐ Agent + 跨表context + DecisionPipeline
      chat/route.ts               # 对话 API
  components/
    ui/                           # GlassCard, CountUp, Skeleton, TableSelector, SheetPicker
    charts/                       # 饼图, 柱状图 (ECharts)
    insights/                     # HealthCard, DecisionCard, AIInsightPanel, MarketingPanel, GenericOverview
    procurement/                  # 供货分析面板
    workspace/                    # SalesTrend, ProductRank, CategoryBreakdown, RegionMap
    layout/                       # Navbar
  lib/
    templates/                    # 模板引擎
      types.ts                    # 新旧模板类型定义
      platforms.ts                # 15 套平台模板数据
      matcher.ts                  # 模板匹配引擎
      index.ts                    # 统一导出
      tmall.ts, jd.ts, pdd.ts,    # 旧版模板 (向后兼容)
      douyin.ts, generic.ts
    pipeline/                     # ⭐ 经营决策链路编排器 (Phase 1)
      decision-pipeline.ts        # 核心：Layer 0-6 全链路编排
      ai-explanation.ts           # 结构化 5 层 System Prompt
      types.ts                    # DecisionChain / EvidenceCard 等
    engines/                      # 分析引擎
      metrics-engine.ts           # 商品/店铺指标
      diagnosis-engine.ts         # 健康诊断（含知识库引用）
      decision-engine.ts          # 决策优先级 (P0/P1/P2)
      marketing-engine.ts         # 推广分析 (ROI + 异常 + 建议)
    profit/
      engine.ts                   # 利润计算引擎（四平台费率 + 8项成本）
    rag/                          # 知识引擎
      inject.ts                   # 知识注入 v3（AI 主体架构）
      knowledge.ts                # 知识库搜索
      industry-detector.ts        # 15 行业自动检测
      freshness.ts                # 知识新鲜度（四层联防）
    semantic/                     # 语义分析引擎
      types.ts, roles.ts, relations.ts, index.ts
    classifier.ts                 # 角色指纹表格分类器 (8 种类型)
    business-concepts.ts          # 角色 → 业务概念翻译层 (55+ 规则)
    business-model.ts             # 多表业务模型自动构建
    entities.ts                   # 通用实体引擎 (4 策略模糊匹配)
    cross-platform.ts             # 跨平台 SKU 匹配 + 利润对比
    search/                       # WebSearch 平台数据搜索
    parser.ts                     # Excel/CSV 规则解析
    parser-ai.ts                  # AI 引导解析 (规则失败时启用)
    ai.ts                         # AI 分析 (分层上下文 + 类型专用 prompt)
    store/index.ts                # localStorage 状态管理
    db.ts                         # Supabase 客户端
    logger.ts                     # 结构化日志
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

## 部署 (Vercel)

1. Fork 或克隆仓库到你的 GitHub
2. 在 Vercel 中导入仓库
3. 配置环境变量：`DEEPSEEK_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — 推送 `master` 自动触发重新部署

生产环境：https://ai-data-copilot-sigma.vercel.app

---

## 安全

- API 密钥通过 `process.env` 引用，无硬编码
- `.env.local` 已加入 `.gitignore`
- Supabase RLS 策略可按需启用

---

## 更新日志

- **2026-07-07** ⭐ **Phase 1 — 经营决策链路贯通**
  - 新建 DecisionPipeline 编排器，串联 7 个已有引擎模块
  - Evidence Card 结构化证据卡输出（8项成本逐项归因）
  - AI 结构化 5 层 System Prompt（指标→诊断→证据→规则→知识）
  - 8 条经营规则定义（亏损预警/达人分级/平台费率/财税合规）
  - 行动建议绑定证据卡索引 + 规则ID + 预期收益金额
  - 向后兼容：Pipeline 失败自动回退 routeAgent

- **2026-07-06** 知识引擎 AI 主体架构重构
  - DeepSeek V4 作为主推理引擎，知识库降级为可信缓存
  - WebSearch 实时验证层（全国政策变动追踪）
  - 15 行业自动检测引擎
  - 利润计算引擎（四平台真实费率 + 8项成本明细）
  - 跨平台 SKU 匹配 + 利润对比

- **2026-06-17** 15 套平台模板 + 推广分析引擎 + 跨表利润引擎 + 8 种表格分类 + 业务概念翻译层 + 实体模糊匹配引擎
- **2026-06-16** CSV 引号解析修复 + 多 Sheet UI + Dashboard 语义角色驱动
- **2026-06-14** 语义决策系统、AI 引导解析、智能首页、决策引擎、供货分析

## License

MIT
