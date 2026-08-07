/**
 * ProcureWise Business Closed-Loop Frontend Client
 *
 * 前端调用 /api/loop 的轻量封装，负责：
 * - 拉取 AnalysisRun / Decision / ActionTask 历史
 * - 写入 Execution / Outcome
 */

import { authFetch } from "@/lib/auth-fetch";

export interface AnalysisRun {
  id: string;
  datasetId: string;
  input: string;
  chainSnapshot: Record<string, unknown>;
  pipelineLatency: number;
  platform: string | null;
  industry: string | null;
  freshnessScore: number;
  webSearchTriggered: boolean;
  createdAt: string;
}

export interface Decision {
  id: string;
  analysisRunId: string;
  datasetId: string;
  summary: string;
  verdict: string;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "completed";
  productNames: string[];
  evidenceCardIndices: number[];
  expectedProfitImpact: number;
  riskLevel: "low" | "medium" | "high";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionTask {
  id: string;
  decisionId: string;
  title: string;
  description: string;
  priority: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  evidenceRefs: number[];
  ruleIds: string[];
  expectedProfitImpact: number;
  riskLevel: "low" | "medium" | "high";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Execution {
  id: string;
  actionTaskId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  result: string | null;
  executedBy: string | null;
  executedAt: string;
  createdAt: string;
}

export interface Outcome {
  id: string;
  executionId: string;
  metric: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  improvementPercent: number;
  verifiedAt: string;
}

export interface LoopHistory {
  datasetId: string;
  analysisRuns: AnalysisRun[];
  decisions: Array<{
    decision: Decision;
    actionTasks: ActionTask[];
    executions?: Record<string, Execution[]>;
    outcomes?: Record<string, Outcome[]>;
  }>;
}

export interface LoopApiError {
  error: string;
}

function ensureOk(res: Response): void {
  if (!res.ok) {
    throw new Error("Loop API error: " + res.status + " " + res.statusText);
  }
}

export async function fetchLoopHistory(datasetId: string, userId?: string): Promise<LoopHistory> {
  const url = "/api/loop?datasetId=" + encodeURIComponent(datasetId) + (userId ? "&userId=" + encodeURIComponent(userId) : "");
  const res = await authFetch(url);
  ensureOk(res);
  return await res.json();
}

export async function startExecution(params: {
  id: string;
  actionTaskId: string;
  executedBy?: string;
}): Promise<{ ok: boolean; executionId: string }> {
  const res = await authFetch("/api/loop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start_execution", ...params }),
  });
  ensureOk(res);
  return await res.json();
}

export async function completeExecution(params: {
  executionId: string;
  status?: "completed" | "failed" | "cancelled";
  result?: string;
}): Promise<{ ok: boolean }> {
  const res = await authFetch("/api/loop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete_execution", ...params }),
  });
  ensureOk(res);
  return await res.json();
}

export async function saveOutcome(params: {
  id: string;
  executionId: string;
  metric: string;
  beforeValue: number;
  afterValue: number;
}): Promise<{ ok: boolean; outcomeId: string }> {
  const improvement = params.afterValue - params.beforeValue;
  const improvementPercent =
    params.beforeValue !== 0 ? Math.round((improvement / Math.abs(params.beforeValue)) * 10000) / 100 : 0;
  const res = await authFetch("/api/loop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save_outcome",
      id: params.id,
      executionId: params.executionId,
      metric: params.metric,
      beforeValue: params.beforeValue,
      afterValue: params.afterValue,
      improvement,
      improvementPercent,
    }),
  });
  ensureOk(res);
  return await res.json();
}

export async function updateDecisionStatus(params: {
  decisionId: string;
  status: Decision["status"];
  notes?: string;
}): Promise<{ ok: boolean; decisionId: string; status: string }> {
  const res = await authFetch("/api/loop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_decision_status",
      decisionId: params.decisionId,
      status: params.status,
      notes: params.notes,
    }),
  });
  ensureOk(res);
  return await res.json();
}

export async function updateActionTaskStatus(params: {
  taskId: string;
  status: ActionTask["status"];
  notes?: string;
}): Promise<{ ok: boolean; taskId: string; status: string }> {
  const res = await authFetch("/api/loop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_action_task_status",
      taskId: params.taskId,
      status: params.status,
      notes: params.notes,
    }),
  });
  ensureOk(res);
  return await res.json();
}
