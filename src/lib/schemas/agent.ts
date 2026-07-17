/**
 * M1 Trusted Input — Agent / DecisionPipeline API contracts
 *
 * 职责：定义 /api/agent 的请求/响应 schema，
 * 让 Chat/Dashboard 与后端对“一次分析请求/结果”有单一可信源。
 */

import { z } from "zod";

// ═══ Request ═══

export const InlineDatasetSchema = z.object({
  columns: z.array(z.string()).min(1, "columns 不能为空"),
  rows: z.array(z.record(z.unknown())).min(0),
  originalName: z.string().optional(),
  platform: z.string().optional(),
});

export type InlineDataset = z.infer<typeof InlineDatasetSchema>;

export const AgentRequestBodySchema = z.object({
  input: z.string().min(1, "input 不能为空").max(4000, "input 过长"),
  datasetId: z.string().min(1, "datasetId 不能为空"),
  relatedDatasetIds: z.array(z.string().min(1)).max(20).optional(),
  inlineDatasets: z.record(InlineDatasetSchema).optional(),
});

export type AgentRequestBody = z.infer<typeof AgentRequestBodySchema>;

// ═══ Response DTOs（与 api-types.ts 对齐，此处保留运行时校验） ═══

/**
 * 运行时校验用的宽松 schema。
 * 精确嵌套 schema 会和 DecisionChain 类型产生循环/兼容性问题，
 * 因此这里保留关键字段校验；完整类型由 api-types.ts + types.ts 提供。
 */
export const DecisionChainResponseSchema = z.object({
  type: z.literal("decision_chain"),
  content: z.string().min(1),
  crossPlatform: z.array(z.any()).default([]),
  metrics: z.object({
    products: z.array(z.any()),
    store: z.any(),
    profit: z.array(z.any()),
    crossPlatform: z.array(z.any()).optional(),
  }),
  diagnoses: z.array(z.any()),
  evidenceCards: z.array(z.any()),
  applicableRules: z.array(z.any()),
  aiExplanation: z.object({
    summary: z.string(),
    reasoningChain: z.array(z.any()),
    confidence: z.number(),
  }),
  actions: z.array(z.any()),
  crossDataset: z.array(z.any()).optional(),
  meta: z.object({
    industry: z.any(),
    knowledgeCoverage: z.string(),
    freshnessScore: z.number(),
    webSearchTriggered: z.boolean(),
    pipelineLatency: z.number(),
  }),
});

export const InsufficientDataResponseSchema = z.object({
  type: z.literal("insufficient_data"),
  content: z.string().min(1),
  limitations: z.array(z.string()),
  recoverable: z.literal(true),
});

export const FallbackAgentResponseSchema = z.object({
  type: z.enum(["query", "report", "interpret", "general"]),
  content: z.string().min(1),
  degraded: z.literal(true),
  fallbackReason: z.string(),
  chart: z.any().optional(),
  table: z.any().optional(),
  suggestions: z.array(z.string()).optional(),
  followUp: z.array(z.string()).optional(),
});

export const AgentErrorResponseSchema = z.object({
  type: z.literal("agent_error"),
  content: z.string().min(1),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    recoverable: z.boolean(),
  }),
});

export const AgentApiResponseSchema = z.discriminatedUnion("type", [
  DecisionChainResponseSchema,
  InsufficientDataResponseSchema,
  FallbackAgentResponseSchema,
  AgentErrorResponseSchema,
]);

export type AgentApiResponse = z.infer<typeof AgentApiResponseSchema>;

// ═══ Helpers ═══

export function validateAgentRequest(raw: unknown): AgentRequestBody {
  return AgentRequestBodySchema.parse(raw);
}

export function validateAgentResponse(raw: unknown): AgentApiResponse {
  return AgentApiResponseSchema.parse(raw);
}
