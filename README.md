# AI Data Copilot

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Vercel](https://vercel.com/button)

> 上传电商表格，获取利润诊断与可执行决策——不只是图表。

**线上地址**：[https://lunarjuly.xyz](https://lunarjuly.xyz)

---

## 目录

- [产品定位](#产品定位)
- [核心能力](#核心能力)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [项目结构](#项目结构)
- [API 参考](#api-参考)
- [测试](#测试)
- [安全](#安全)
- [部署](#部署)
- [更新日志](#更新日志)
- [贡献指南](#贡献指南)
- [License](#license)

---

## 产品定位

AI Data Copilot 是面向电商卖家的数据决策平台。用户上传订单、广告、退款等表格后，系统自动完成：平台识别 → 单品利润计算 → 问题诊断 → 证据卡构建 → AI 解释 → 分级行动方案。

目标用户：天猫、淘宝、京东、拼多多、抖音上月营收 ¥10万–500万 的卖家。

### 与通用 AI 分析的差异

| 维度 | 通用 AI（如 ChatGPT） | AI Data Copilot |
|------|---------------------|-----------------|
| 数据来源 | 用户手动描述 | 直接解析 Excel/CSV |
| 利润计算 | 估算/猜测 | 确定性规则引擎，锁定平台费率 |
| 建议可追溯性 | 黑盒 | 每条建议链回证据卡 + 业务规则 |
| 平台适配 | 无 | 15 种平台模板，零配置识别 |

### 核心工作流

```
上传表格 → 自动识别平台和表格类型 → 计算单品利润
→ 诊断问题 → 构建证据卡 → AI 解释发现 → 分级行动方案
```

---

## 核心能力

### 15 种平台模板，零配置

拖入 Excel 或 CSV 文件，模板引擎通过列指纹自动识别来源平台和表格类型——无需手动映射。

| 类别 | 支持的数据源 |
|------|-------------|
| 订单 | 天猫、淘宝、拼多多、抖音、京东 |
| 广告 | 直通车（计划/关键词）、引力魔方、万相台、千川 |
| 退款 | 淘宝退款、拼多多退款 |
| 通用 | 库存、商品目录、供应商报价 |

无法识别的格式回退到 AI 辅助解析，并需用户确认。

### 利润引擎（4 平台、8 项成本）

扣除每项可见成本后计算实际单品利润：

| 成本项 | 适用平台 |
|--------|---------|
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

### 安全与数据隔离

- Supabase Auth JWT 鉴权，所有 API 路由统一鉴权守卫
- Zod Schema 校验，覆盖注入攻击防护（SQL / XSS / 路径遍历 / Prompt 注入）
- 用户级数据隔离：localStorage 按 `userId` 分片，Supabase RLS 策略隔离
- 194 个自动化测试覆盖鉴权、Schema 校验、注入防护场景

---

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript 5.7 (strict mode) |
| 样式 | Tailwind CSS 3.4，暗色主题 + Glass Morphism |
| UI 组件 | Radix UI, Lucide 图标, Framer Motion |
| 图表 | ECharts 5.5 |
| AI | DeepSeek V4 Pro / V4 Flash |
| 知识 | 静态知识库（81 条）+ WebSearch 回退 |
| 数据库 | Supabase (PostgreSQL) |
| 客户端存储 | localStorage (用户级分片) |
| 服务端存储 | 内存 server-store + Supabase 持久化 |
| 测试 | Vitest 4.1（194 个用例） |
| 托管 | Vercel |

---

## 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9
- Supabase 项目（免费额度即可）
- DeepSeek API Key

### 安装

```bash
# 克隆仓库
git clone https://github.com/leonis77/ai-data-copilot.git
cd ai-data-copilot

# 安装依赖
npm install
```

### 配置环境变量

创建 `.env.local`（参考 [环境变量](#环境变量) 章节）：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 启动开发服务器

```bash
npm run dev
# 浏览器打开 http://localhost:3000
```

### 运行测试

```bash
# 监听模式
npm test

# 单次运行
npm run test:run

# 覆盖率报告
npm run test:coverage
```

### 构建生产版本

```bash
npm run build
npm run start
```

---

## 环境变量

| 变量名 | 说明 | 必填 | 示例 |
|--------|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 是 | `sk-xxx` |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | 否 | `https://api.deepseek.com` |
| `SUPABASE_URL` | Supabase 项目 URL | 是 | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥（客户端） | 是 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 | 是 | `eyJ...` |

> ⚠️ **安全提示**：以上变量包含敏感信息，请勿提交到版本控制。`.env.local` 和 `.env.prod` 已在 `.gitignore` 中排除。

---

## 项目结构

```
src/
  app/
    page.tsx                    # Landing 页面
    auth/page.tsx               # 登录 / 注册
    upload/page.tsx             # 文件上传 + 平台识别
    dashboard/page.tsx          # 诊断仪表盘
    chat/page.tsx               # AI Agent 对话
    workspace/page.tsx          # 工作台
    api/
      auth/
        login/route.ts          # 登录 API
        register/route.ts       # 注册 API
        session/route.ts        # Session 查询 API
      upload/route.ts           # 文件解析 + 语义分析
      agent/route.ts            # 决策管道 + AI Agent
      analyze/route.ts          # 分层 AI 分析
      chat/route.ts             # 对话 API
      loop/route.ts             # 业务闭环 API（execution/outcome）
      observability/route.ts    # 可观测性指标
  components/
    ui/                         # 基础组件（GlassCard, Skeleton, TableSelector...）
    charts/                     # ECharts 图表（饼图、柱状图、折线图）
    insights/                   # 洞察组件（EvidenceCard, ActionCard, CrossPlatform...）
    dashboard/                  # 仪表盘组件（ProfitBar, ProfitRanking...）
    procurement/                # 供货分析面板
    layout/                     # 导航栏、布局
  lib/
    pipeline/                   # 决策链编排器
      decision-pipeline.ts      # 9 层管道：metrics → diagnosis → evidence → rules → AI → actions
      ai-explanation.ts         # 结构化 system prompt 构建
      types.ts                  # EvidenceCard, DecisionChain, PrioritizedAction 等
    engines/                    # 计算引擎
      metrics-engine.ts         # 单品 & 店铺级 KPI
      diagnosis-engine.ts       # 健康诊断（缺货、滞销、过度依赖）
      decision-engine.ts        # 分级行动方案生成（P0/P1/P2）
    profit/
      engine.ts                 # 4 平台利润计算器（8 项成本）
    semantic/
      types.ts, roles.ts        # 列角色识别（金额/实体/日期/数量）
      relations.ts              # 跨表关系发现
    rag/
      inject.ts                 # 知识注入
      knowledge.ts              # 知识库检索
      industry-detector.ts      # 15 行业自动识别
      freshness.ts              # 新鲜度守护（4 层防御）
    cross-platform.ts           # Jaccard 商品匹配 + 利润对比
    templates/                  # 15 平台模板定义
    parser.ts                   # Excel/CSV 解析
    store/                      # 用户级 localStorage 状态管理
    db.ts                       # Supabase 客户端（含 RLS）
    server-store.ts             # 服务端内存存储
    auth-context.tsx            # React Auth Context
    auth.ts                     # JWT 验证辅助函数
    schemas/                    # Zod 请求体验证
      auth.ts                   # 登录 / 注册 schema
      upload.ts                 # 上传 schema
      agent.ts                  # Agent schema
      loop.ts                   # 闭环 schema
supabase/
  supabase-schema.sql           # 主库表定义
  supabase-rag-schema.sql       # RAG 知识库表定义
  migrations/                   # 数据库迁移脚本
```

---

## API 参考

### 认证

所有 API 路由（除登录/注册外）均需在 `Authorization` header 中携带 Bearer token：

```
Authorization: Bearer <supabase-jwt-token>
```

未携带或 token 无效时返回 `401 Unauthorized`。

### 路由清单

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| GET | `/api/auth/session` | 获取当前用户信息 |
| POST | `/api/upload` | 上传并解析文件 |
| POST | `/api/agent` | 决策管道 + AI 分析 |
| POST | `/api/analyze` | 分层 AI 分析 |
| POST | `/api/chat` | AI 对话 |
| GET | `/api/loop` | 查询 execution / outcome 历史 |
| POST | `/api/loop` | 写入 execution / outcome |
| GET | `/api/observability` | 可观测性指标 |

### 统一错误格式

```json
{
  "error": {
    "type": "validation_error",
    "content": "VALIDATION_FAILED",
    "code": "INVALID_INPUT",
    "message": "fileName 不能为空",
    "recoverable": true,
    "details": {}
  }
}
```

---

## 测试

### 测试覆盖

| 模块 | 用例数 | 覆盖场景 |
|------|--------|---------|
| 登录/注册 API | 16 | 成功登录、失败场景、参数校验 |
| 上传 API | 10 | 鉴权守卫、文件格式、Base64 校验、大小限制 |
| Session API | 4 | 鉴权守卫 |
| Schema 注入防护 | 21 | SQL 注入、XSS、路径遍历、Prompt 注入、边界值 |
| 速率限制 | 4 | 窗口期、超限拒绝、多标签隔离 |
| 知识库 | 7 | 检索、回退、注入、新鲜度、行业检测 |
| 跨平台匹配 | 3 | Jaccard 相似度、利润对比 |
| 其他 | 9 | 观测性、业务闭环、UI 组件 |

**总计：194 个用例，17 个测试文件，全部通过。**

### 运行测试

```bash
# 监听模式（开发时推荐）
npm test

# CI 模式
npm run test:run

# 覆盖率报告
npm run test:coverage
```

---

## 安全

### 鉴权机制

- 基于 Supabase Auth 的 JWT token 鉴权
- 所有受保护 API 路由统一使用 `authenticateRequest()` 守卫
- Token 从 `Authorization: Bearer <token>` header 提取
- 无效/过期 token 统一返回 `401 AUTH_FAILED`

### 数据隔离

- **客户端**：localStorage 按 `aicopilot_{userId}` 分片存储，登出时清理当前用户数据
- **服务端**：所有数据库写入携带 `user_id`，Supabase RLS 策略确保用户仅访问自身数据
- **迁移脚本**：`supabase/migrations/20260807_user_isolation.sql` 添加 RLS 策略

### 注入防护

- 所有 API 请求体验证使用 Zod Schema，在边界处拒绝非法输入
- 覆盖场景：SQL 注入、XSS、路径遍历、Prompt 注入、超长字符串
- 防护分层：Schema 校验（格式） + 参数化查询（SQL） + React 自动转义（XSS）

### 密钥管理

- 所有密钥从环境变量读取，无硬编码
- `.env.local` 和 `.env.prod` 已加入 `.gitignore`
- Vercel 生产环境通过 Project Settings → Environment Variables 配置

---

## 部署

### Vercel（推荐）

1. Fork 或克隆仓库到你的 GitHub 账号
2. 在 [Vercel](https://vercel.com/new) 导入 GitHub 仓库
3. 在 Project Settings → Environment Variables 中添加：
   - `DEEPSEEK_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. 点击 Deploy

推送到 `master` 分支会自动触发重新部署。

### 当前生产环境

- **自定义域名**：https://lunarjuly.xyz
- **Vercel 子域名**：https://ai-data-copilot-ojzsaqmdv-lucky-leonis.vercel.app

### Supabase 数据库初始化

1. 在 Supabase Dashboard 打开 SQL Editor
2. 执行 `supabase-schema.sql`（主表 + RLS 策略）
3. 执行 `supabase-rag-schema.sql`（知识库表）
4. 执行 `supabase/migrations/20260807_user_isolation.sql`（用户级 RLS）

---

## 更新日志

### 2026-08-07 — M8 安全加固 + 用户数据隔离

- 🔒 Auth Context 修复：`useRef` 解决 `onAuthStateChange`  stale closure 问题
- 🛡️ 数据隔离修复：`clearUserStore` 仅清理当前用户数据，防止跨用户数据泄露
- 🖥️ UI 修复：`use-auth-guard` 在未认证时渲染跳转提示，消除空白页面
- 🔗 API 鉴权统一：`authenticateRequest` 守卫覆盖 agent/analyze/chat/loop/upload/session 全量路由
- ✅ 测试覆盖：新增 35 个安全测试用例（session 4 + upload 10 + injection 21）
- 🗄️ 数据库迁移：用户级 RLS 策略，覆盖 profiles/datasets/runs/decisions/actions/outcomes 全链路

### 2026-07-17 — M0 稳定性修复 + 知识库扩展 + 业务闭环 API

- 🔧 平台持久化：localStorage + inline dataset + Supabase 三端一致性
- 🔗 业务闭环 API：`/api/loop` 支持 GET 历史记录 + POST execution/outcome 写入
- 📚 知识库扩展：31 条 → 81 条，覆盖平台规则/6 大品类基准/方法论/预警/供应链
- 🎯 Pipeline 降级：`insufficient_data` 显式返回、知识注入/LLM 解释失败时保留确定性结果
- ✅ 前端兼容：四类响应统一处理（decision_chain / insufficient_data / fallback_agent / agent_error）
- 🐛 freshnessScore 修复：Dashboard 不再出现 7500%/10000% 异常显示

### 2026-07-08 — 全链路闭环修复 + 证据链优化 (V1.0)

- 🔧 P0 断裂链修复：Dashboard AI 摘要字段路径、跨平台数据路径、relatedDatasetIds 传入
- 🔗 P1 证据链优化：API 响应补充 metrics+aiExplanation 完整嵌套、CrossPlatform 提升到顶层
- 🎯 P2 体验增强：AI 置信度彩色徽章（Dashboard + Chat 双端）
- ✅ TypeScript 构建零错误，9 文件 +107/-15 行

### 2026-07-08 — M1 可信输入 + M2 统一错误处理 + M3 前端数据契约

- 🔒 M1 可信输入：Zod Schema 校验上传/Agent API 请求体
- 🛡 M2 统一错误处理：标准 API 错误信封
- 📦 M3 前端数据契约： tightened store types、共享 inline dataset helper

### 2026-07-07 — 前后端 Pipeline 集成 (V0.9)

- Chat UI 渲染结构化证据卡、行动卡、跨平台利润表
- Dashboard 从 `/api/agent` 获取决策链
- 新增 EvidenceCardView, ActionCardView, CrossDatasetView 组件

### 2026-07-06 — 知识引擎重构 + 利润引擎

- AI-primary 知识架构（DeepSeek V4 为主推理器）
- WebSearch 实时政策验证层
- 15 行业自动识别
- 4 平台利润引擎（8 项成本）
- 跨平台商品匹配与利润对比

### 2026-06-17 — 平台模板 + 广告引擎

- 15 平台模板 + 自动识别
- 广告分析引擎（ROI 排名、异常检测、预算建议）
- 跨表利润引擎（订单 × 供货 × 广告 × 退款）
- 8 表格类型分类器
- 业务概念翻译层（55+ 规则）

### 2026-06-14 — 语义决策系统

- 列角色识别（金额/实体/日期/数量/地点）
- AI 引导解析器
- 决策引擎 + 供货分析面板

---

## 贡献指南

### 开发规范

1. **分支策略**：`master` 为保护分支，所有变更通过 PR 合并
2. **提交信息**：遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `test:` 测试相关
   - `refactor:` 重构
   - `chore:` 构建/工具链
3. **代码质量**：
   - TypeScript strict mode 零警告
   - 所有新增逻辑必须配套测试
   - 提交前运行 `npm run build` 和 `npm run test:run`

### 报告问题

请在 GitHub Issues 中提交，包含：
- 复现步骤
- 预期行为 vs 实际行为
- 浏览器/Node.js 版本
- 相关日志（脱敏后）

---

## License

MIT
