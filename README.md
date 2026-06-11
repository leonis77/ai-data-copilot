# AI Data Copilot

智能数据分析助手 — 将 Excel 数据转化为 AI 驱动的决策建议。

## 技术栈

- **前端**: Next.js 15 (App Router) + TypeScript + TailwindCSS + Framer Motion + ECharts
- **后端**: Next.js API Routes
- **数据库**: JSON 文件存储（可扩展至 SQLite/PostgreSQL）
- **AI**: DeepSeek API
- **部署**: Vercel / 自托管

## 功能模块

| 模块 | 功能 |
|------|------|
| 首页 | Hero 动画、功能展示、数据流介绍 |
| 上传 | 拖拽上传 Excel/CSV，自动解析字段与统计 |
| 仪表盘 | Glassmorphism 数据卡片、ECharts 可视化图表 |
| AI 分析 | DeepSeek AI 自动生成洞察、风险、建议（打字机效果） |
| AI 对话 | 基于数据集的自然语言问答，Markdown 渲染 |
| 报告 | 一键生成 PDF 含图表与 AI 分析 |

## 快速开始

### 环境要求

- Node.js 18+
- DeepSeek API Key

### 安装

```bash
cd ai-data-copilot
npm install
```

### 配置

复制 `.env.local` 并填入你的 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 开发

```bash
npm run dev
```

访问 http://localhost:3000

### 构建

```bash
npm run build
npm start
```

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式（暗黑主题）
│   ├── upload/page.tsx       # 上传页
│   ├── dashboard/page.tsx    # 仪表盘
│   ├── chat/page.tsx         # AI 对话
│   ├── report/page.tsx       # 报告生成
│   └── api/
│       ├── upload/route.ts   # 文件上传 API
│       ├── analyze/route.ts  # AI 分析 API
│       ├── chat/route.ts     # AI 对话 API
│       └── report/route.ts   # PDF 报告 API
├── components/
│   ├── ui/                   # 通用 UI 组件
│   ├── charts/               # ECharts 图表组件
│   ├── ai/                   # AI 相关组件
│   └── layout/               # 布局组件
├── lib/
│   ├── utils.ts              # 工具函数
│   ├── db.ts                 # 数据持久化
│   ├── parser.ts             # Excel/CSV 解析
│   └── ai.ts                 # DeepSeek API 封装
└── types/
    └── index.ts              # TypeScript 类型
```

## 设计系统

- **风格**: AI SaaS Dashboard, 暗黑模式优先, Glassmorphism
- **颜色**: 背景 #0B0F17, 卡片 #111827, 紫蓝渐变主色调
- **字体**: Inter / System UI
- **动效**: Framer Motion, 页面切换淡入淡出, hover 浮动, 数字滚动, 打字机效果