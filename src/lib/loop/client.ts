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

async function ensureOk(res: Response): Promise<void> {
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.clone().json();
      if (body?.error?.message) detail = ": " + String(body.error.message);
      else if (typeof body?.error === "string") detail = ": " + body.error;
      else if (body?.message) detail = ": " + String(body.message);
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error("Loop API error: " + res.status + " " + res.statusText + detail);
  }
}

export async function fetchLoopHistory(datasetId: string, userId?: string): Promise<LoopHistory> {
  const url = "/api/loop?datasetId=" + encodeURIComponent(datasetId) + (userId ? "&userId=" + encodeURIComponent(userId) : "");
  const res = await authFetch(url);
  await ensureOk(res);
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
  await ensureOk(res);
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
  await ensureOk(res);
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
  await ensureOk(res);
  return await res.json();
}

export async function updateDecisionStatus(params: {
  decisionId: string;
  status: "approved" | "rejected";
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
  await ensureOk(res);
  return await res.json();
}
