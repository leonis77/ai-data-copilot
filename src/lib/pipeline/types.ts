/**
 * ProcureWise Decision Pipeline Types v1.0
 *
 * 经营决策链路类型定义
 *
 * 链路：数据 → 指标 → 诊断 → 证据 → 规则 → AI解释 → 建议 → 预期收益 → 风险
 *
 * 所有类型基于现有模块重组，不引入新的核心概念。
 */

import type { ProductMetrics, StoreMetrics } from "@/lib/engines/metrics-engine";
import type { Diagnosis } from "@/lib/engines/diagnosis-engine";
import type { Action } from "@/lib/engines/decision-engine";
import type { ProfitResult } from "@/lib/profit/engine";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import type { IndustryResult } from "@/lib/rag/industry-detector";

// ═══════════════════════════════════════════════
// Layer 3: Evidence Card（证据卡）
// ═══════════════════════════════════════════════

/** 8项成本明细（来自 ProfitResult.costs） */
export interface CostBreakdownEvidence {
  /** 平台佣金 */
  commissionFee: number;
  /** 固定费用分摊到单品 */
  fixedFeePerItem: number;
  /** 运费险 */
  shippingInsurance: number;
  /** 达人佣金（抖音专属，其他平台为0） */
  influencerCommission: number;
  /** 运费 */
  shippingCost: number;
  /** 广告费分摊 */
  adCost: number;
  /** 退货损耗 */
  returnLoss: number;
  /** 财税合规成本（拼多多专属，其他平台为0） */
  taxComplianceCost: number;
  /** 进货成本 */
  purchaseCost: number;
  /** 总成本 */
  totalCost: number;
}

/** 利润摘要 */
export interface ProfitSummary {
  netPerItem: number;
  netMonthly: number;
  margin: number;
  roi: number;
}

/** 成本归因项：每项成本占总成本的比例 + 与行业基准的偏差 */
export interface CostAttributionItem {
  /** 成本项名称（中文） */
  item: string;
  /** 金额 */
  amount: number;
  /** 占总成本百分比 */
  percentage: number;
  /** 与行业基准的偏差说明（可选） */
  benchmarkDeviation?: string;
}

/** 证据卡：单件商品 × 单个平台 的完整成本和利润证据 */
export interface EvidenceCard {
  /** 商品名称 */
  productName: string;
  /** 平台中文名 */
  platform: string;
  /** 平台key */
  platformKey: string;
  /** 8项成本明细 */
  costBreakdown: CostBreakdownEvidence;
  /** 售价 */
  sellPrice: number;
  /** 利润摘要 */
  profit: ProfitSummary;
  /** 判决 */
  verdict: "buy_more" | "hold" | "reduce" | "drop";
  /** 判决置信度 */
  verdictConfidence: number;
  /** 判决理由 */
  verdictReason: string;
  /** 成本归因：每项成本占总成本的百分比 */
  costAttribution: CostAttributionItem[];
  /** 关联的规则ID列表 */
  ruleIds: string[];
  /** 关联的知识库条目ID列表 */
  knowledgeRefs: string[];
  /** 唯一索引（用于跨层引用） */
  cardIndex: number;
}

// ═══════════════════════════════════════════════
// Layer 4: Applicable Rule（适用规则）
// ═══════════════════════════════════════════════

/** 适用的规则 */
export interface ApplicableRule {
  /** 规则ID（如 RULE_NEGATIVE_MARGIN） */
  ruleId: string;
  /** 规则名称（中文） */
  ruleName: string;
  /** 规则说明 */
  ruleContent: string;
  /** 来源类型 */
  source: "platform_fee_engine" | "knowledge_entry" | "verdict_engine" | "diagnosis_engine";
  /** 来源ID（知识库条目ID 或 平台key） */
  sourceId?: string;
  /** 规则置信度 */
  confidence: number;
  /** 被应用到的证据卡索引列表 */
  appliedToCardIndices: number[];
}

// ═══════════════════════════════════════════════
// Layer 5: AI Explanation（AI解释）
// ═══════════════════════════════════════════════

/** 推理步骤 */
export interface ReasoningStep {
  /** 步骤序号 */
  step: number;
  /** 步骤标题 */
  title: string;
  /** 步骤内容 */
  content: string;
  /** 引用的证据卡索引 */
  evidenceRefs: number[];
  /** 引用的规则ID */
  ruleRefs: string[];
  /** 该步骤的置信度 */
  confidence?: number;
}

/** AI解释层输出 */
export interface AIExplanation {
  /** AI生成的文本摘要 */
  summary: string;
  /** 结构化推理链 */
  reasoningChain: ReasoningStep[];
  /** 整体置信度 */
  confidence: number;
}

// ═══════════════════════════════════════════════
// Layer 6: Prioritized Action（优先级行动建议）
// ═══════════════════════════════════════════════

/** 扩展的优先级行动建议（继承自 decision-engine 的 Action） */
export interface PrioritizedAction extends Action {
  /** 关联的证据卡索引 */
  evidenceRefs: number[];
  /** 关联的诊断来源 */
  diagnosisRef: string;
  /** 关联的规则ID */
  ruleIds: string[];
  /** 量化预期收益（元） */
  expectedProfitImpact: number;
  /** 风险等级 */
  riskLevel: "low" | "medium" | "high";
}

// ═══════════════════════════════════════════════
// Layer 0-1: Metrics Container（指标容器）
// ═══════════════════════════════════════════════

export interface MetricsContainer {
  products: ProductMetrics[];
  store: StoreMetrics;
  profit: ProfitResult[];
  crossPlatform?: CrossPlatformComparison[];
}

// ═══════════════════════════════════════════════
// Pipeline Meta（元数据）
// ═══════════════════════════════════════════════

export interface PipelineMeta {
  /** 行业检测结果 */
  industry: IndustryResult;
  /** 知识覆盖度评估消息 */
  knowledgeCoverage: string;
  /** 知识新鲜度分数（0-100） */
  freshnessScore: number;
  /** 是否触发了WebSearch */
  webSearchTriggered: boolean;
  /** WebSearch返回结果数 */
  webSearchResults?: number;
  /** Pipeline总延迟（ms） */
  pipelineLatency: number;
}

// ═══════════════════════════════════════════════
// DecisionChain（顶层输出）
// ═══════════════════════════════════════════════

/** 经营决策链路完整输出 */
export interface DecisionChain {
  /** 第1层：指标 */
  metrics: MetricsContainer;
  /** 第2层：诊断 */
  diagnoses: Diagnosis[];
  /** 第3层：证据卡 */
  evidenceCards: EvidenceCard[];
  /** 第4层：适用规则 */
  applicableRules: ApplicableRule[];
  /** 第5层：AI解释 */
  aiExplanation: AIExplanation;
  /** 第6层：行动建议 */
  actions: PrioritizedAction[];
  /** 元数据 */
  meta: PipelineMeta;
}

// ═══════════════════════════════════════════════
// Pipeline Context（内部编排上下文）
// ═══════════════════════════════════════════════

/** Pipeline内部使用的数据集标准化结果 */
export interface NormalizedDataset {
  columns: string[];
  rows: Record<string, unknown>[];
  originalName: string;
  platform?: string;
}

/** generateAIExplanation 的输入上下文 */
export interface AIExplanationContext {
  input: string;
  metrics: ProductMetrics[];
  storeMetrics: StoreMetrics;
  profitResults: ProfitResult[];
  evidenceCards: EvidenceCard[];
  diagnoses: Diagnosis[];
  applicableRules: ApplicableRule[];
  knowledgeBlock: string;
  industry: string;
}
