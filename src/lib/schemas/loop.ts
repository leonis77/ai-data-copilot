/**
 * M5 Production Hardening — Loop API contracts
 *
 * 职责：定义 /api/loop 的请求/响应 schema，
 * 为 execution、outcome、decision status、action task status 提供输入校验。
 */

import { z } from "zod";
import type { Decision, ActionTask } from "@/lib/loop/types";

// ═══ Request schemas ═══

export const StartExecutionSchema = z.object({
  action: z.literal("start_execution"),
  id: z.string().min(1, "execution id required"),
  actionTaskId: z.string().min(1, "actionTaskId required"),
  executedBy: z.string().optional(),
});

export const CompleteExecutionSchema = z.object({
  action: z.literal("complete_execution"),
  executionId: z.string().min(1, "executionId required"),
  status: z.enum(["completed", "failed", "cancelled"]).default("completed"),
  result: z.string().optional(),
});

export const SaveOutcomeSchema = z.object({
  action: z.literal("save_outcome"),
  id: z.string().min(1, "outcome id required"),
  executionId: z.string().min(1, "executionId required"),
  metric: z.string().min(1, "metric required"),
  beforeValue: z.number().finite(),
  afterValue: z.number().finite(),
});

export const UpdateDecisionStatusSchema = z.object({
  action: z.literal("update_decision_status"),
  decisionId: z.string().min(1, "decisionId required"),
  status: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
});

export const UpdateActionTaskStatusSchema = z.object({
  action: z.literal("update_action_task_status"),
  taskId: z.string().min(1, "taskId required"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  notes: z.string().optional(),
});

export const LoopPostActionSchema = z.discriminatedUnion("action", [
  StartExecutionSchema,
  CompleteExecutionSchema,
  SaveOutcomeSchema,
  UpdateDecisionStatusSchema,
  UpdateActionTaskStatusSchema,
]);

export type LoopPostAction = z.infer<typeof LoopPostActionSchema>;

// ═══ Response schemas ═══

export const LoopErrorSchema = z.object({
  error: z.string(),
});

export type LoopError = z.infer<typeof LoopErrorSchema>;

export const LoopOkSchema = z.object({ ok: z.literal(true) });
export const LoopWithIdSchema = z.object({ ok: z.literal(true), id: z.string() });

// ═══ Helpers ═══

export function validateLoopPostAction(raw: unknown): LoopPostAction {
  return LoopPostActionSchema.parse(raw);
}
