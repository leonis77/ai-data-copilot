/**
 * ProcureWise Business Closed-Loop Types v1.0
 *
 * 链路：AnalysisRun → Decision → ActionTask → Execution → Outcome
 *
 * 设计原则：
 * - 最小字段集，每个表只存必要字段
 * - DecisionChain 快照以 JSONB 存储，避免联表查询
 * - 状态字段用字符串枚举，便于前端展示
 */

// ═══════════════════════════════════════════════
// AnalysisRun（分析运行）
// ═══════════════════════════════════════════════

/** Pipeline 单次执行的完整快照 */
export interface AnalysisRun {
  id: string;
  datasetId: string;
  input: string;
  /** 完整 DecisionChain 快照（JSONB） */
  chainSnapshot: Record<string, unknown>;
  /** Pipeline 总延迟 (ms) */
  pipelineLatency: number;
  /** 触发时使用的平台 key */
  platform: string | null;
  /** 检测到的行业名称 */
  industry: string | null;
  /** 知识新鲜度 0-100 */
  freshnessScore: number;
  /** 是否触发了 WebSearch */
  webSearchTriggered: boolean;
  /** 生成时间 */
  createdAt: string;
}

// ═══════════════════════════════════════════════
// Decision（经营决策）
// ═══════════════════════════════════════════════

/** 经营决策状态 */
export type DecisionStatus = "pending" | "approved" | "rejected" | "completed";

/** 从 AnalysisRun 提炼的决策 */
export interface Decision {
  id: string;
  analysisRunId: string;
  datasetId: string;
  /** 决策摘要（来自 AI summary 或 deterministic fallback） */
  summary: string;
  /** 决策类型：buy_more / hold / reduce / drop / custom */
  verdict: string;
  /** 整体置信度 */
  confidence: number;
  /** 决策状态 */
  status: DecisionStatus;
  /** 关联的商品名称列表 */
  productNames: string[];
  /** 关联的证据卡索引列表 */
  evidenceCardIndices: number[];
  /** 预期收益影响（元） */
  expectedProfitImpact: number;
  /** 风险等级 */
  riskLevel: "low" | "medium" | "high";
  /** 决策备注（用户可填） */
  notes: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ═══════════════════════════════════════════════
// ActionTask（行动任务）
// ═══════════════════════════════════════════════

/** 行动任务状态 */
export type ActionTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

/** 从 PrioritizedAction 派生的可追踪任务 */
export interface ActionTask {
  id: string;
  decisionId: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 优先级：P0/P1/P2 */
  priority: string;
  /** 任务状态 */
  status: ActionTaskStatus;
  /** 关联证据卡索引列表 */
  evidenceRefs: number[];
  /** 关联规则ID列表 */
  ruleIds: string[];
  /** 预期收益影响（元） */
  expectedProfitImpact: number;
  /** 风险等级 */
  riskLevel: "low" | "medium" | "high";
  /** 执行备注 */
  notes: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ═══════════════════════════════════════════════
// Execution（执行记录）
// ═══════════════════════════════════════════════

/** 执行状态 */
export type ExecutionStatus = "running" | "completed" | "failed" | "cancelled";

/** ActionTask 的执行记录 */
export interface Execution {
  id: string;
  actionTaskId: string;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 执行结果摘要 */
  result: string | null;
  /** 执行人 */
  executedBy: string | null;
  /** 执行时间 */
  executedAt: string;
  /** 创建时间 */
  createdAt: string;
}

// ═══════════════════════════════════════════════
// Outcome（结果验证）
// ═══════════════════════════════════════════════

/** 结果验证记录 */
export interface Outcome {
  id: string;
  executionId: string;
  /** 指标名称（如 "月利润"、"退款率"） */
  metric: string;
  /** 执行前基线值 */
  beforeValue: number;
  /** 执行后实际值 */
  afterValue: number;
  /** 改善值（after - before，负数表示恶化） */
  improvement: number;
  /** 改善百分比 */
  improvementPercent: number;
  /** 验证时间 */
  verifiedAt: string;
}

// ═══════════════════════════════════════════════
// Helper：DecisionChain → Decision 转换
// ═══════════════════════════════════════════════

export interface DecisionExtractOptions {
  analysisRunId: string;
  datasetId: string;
  chain: Record<string, unknown>;
}

/** 从 DecisionChain 快照中提取顶层决策摘要 */
export function extractDecisionSummary(chain: Record<string, unknown>): {
  summary: string;
  verdict: string;
  confidence: number;
  productNames: string[];
  evidenceCardIndices: number[];
  expectedProfitImpact: number;
  riskLevel: "low" | "medium" | "high";
} {
  const aiExplanation = chain.aiExplanation as Record<string, unknown> | undefined;
  const actions = Array.isArray(chain.actions) ? (chain.actions as Record<string, unknown>[]) : [];
  const evidenceCards = Array.isArray(chain.evidenceCards) ? (chain.evidenceCards as Record<string, unknown>[]) : [];
  const meta = chain.meta as Record<string, unknown> | undefined;

  const summary = (aiExplanation?.summary as string) || "分析完成，请查看详细结果。";
  const confidence = typeof meta?.confidence === "number" ? meta.confidence : (typeof aiExplanation?.confidence === "number" ? aiExplanation.confidence : 0.5);

  // 从 actions 中提取主要 verdict
  let verdict = "hold";
  const verdicts = actions.map((a) => a.verdict as string).filter(Boolean);
  if (verdicts.includes("drop")) verdict = "drop";
  else if (verdicts.includes("buy_more")) verdict = "buy_more";
  else if (verdicts.includes("reduce")) verdict = "reduce";
  else if (verdicts.length > 0) verdict = verdicts[0];

  const productNames = [...new Set(
    evidenceCards.map((c) => c.productName as string).filter(Boolean)
  )];

  const evidenceCardIndices = [...new Set(
    evidenceCards.map((c) => Number(c.cardIndex)).filter((i) => !isNaN(i) && i >= 0)
  )];

  let expectedProfitImpact = 0;
  for (const a of actions) {
    const impact = Number(a.expectedProfitImpact);
    if (!isNaN(impact) && impact > 0) expectedProfitImpact += impact;
  }
  expectedProfitImpact = Math.round(expectedProfitImpact * 100) / 100;

  const riskLevels = actions.map((a) => a.riskLevel as string).filter(Boolean);
  let riskLevel: "low" | "medium" | "high" = "low";
  if (riskLevels.includes("high")) riskLevel = "high";
  else if (riskLevels.includes("medium")) riskLevel = "medium";

  return { summary, verdict, confidence, productNames, evidenceCardIndices, expectedProfitImpact, riskLevel };
}
