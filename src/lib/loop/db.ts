/**
 * ProcureWise Business Closed-Loop Persistence — User-Scoped
 *
 * 所有记录均关联 user_id，确保跨用户数据隔离。
 */

import { createClient, SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { AnalysisRun, Decision, ActionTask, Execution, Outcome } from "./types";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    supabase = createClient(url, key);
  }
  return supabase;
}

// ═══════════════════════════════════════════════
// Production now has user_id + RLS on closed-loop tables.
// Use insertWithUserId to enforce user-scoped writes.
// ═══════════════════════════════════════════════

async function insertWithUserId(
  client: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
  userId: string
): Promise<PostgrestError | null> {
  const withUser = Object.assign({}, payload, { user_id: userId });
  const { error } = await client.from(table).insert(withUser);
  return error;
}

// ═══════════════════════════════════════════════
// AnalysisRun CRUD
// ═══════════════════════════════════════════════

export async function saveAnalysisRun(userId: string, data: {
  id: string;
  datasetId: string;
  input: string;
  chainSnapshot: Record<string, unknown>;
  pipelineLatency: number;
  platform: string | null;
  industry: string | null;
  freshnessScore: number;
  webSearchTriggered: boolean;
}): Promise<boolean> {
  try {
    const client = getClient();
    const payload: Record<string, unknown> = {
      id: data.id,
      dataset_id: data.datasetId,
      input: data.input,
      chain_snapshot: data.chainSnapshot,
      pipeline_latency: data.pipelineLatency,
      platform: data.platform,
      industry: data.industry,
      freshness_score: data.freshnessScore,
      web_search_triggered: data.webSearchTriggered,
      created_at: new Date().toISOString(),
    };
    const error = await insertWithUserId(client, "analysis_runs", payload, userId);
    if (error) { logger.warn("saveAnalysisRun failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    return true;
  } catch (e: any) {
    logger.warn("saveAnalysisRun error", { message: e.message });
    return false;
  }
}

export async function getAnalysisRun(userId: string, id: string): Promise<AnalysisRun | null> {
  try {
    const client = getClient();
    const { data, error } = await client.from("analysis_runs").select("*").eq("user_id", userId).eq("id", id).single();
    if (error || !data) return null;
    return mapAnalysisRun(data);
  } catch (e: unknown) {
    logger.warn("getAnalysisRun error", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function listAnalysisRuns(userId: string, datasetId: string, limit = 10): Promise<AnalysisRun[]> {
  try {
    const client = getClient();
    const { data, error } = await client.from("analysis_runs")
      .select("*")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapAnalysisRun);
  } catch (e: unknown) {
    logger.warn("listAnalysisRuns error", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

// ═══════════════════════════════════════════════
// Decision CRUD
// ═══════════════════════════════════════════════

export async function saveDecision(userId: string, data: {
  id: string;
  analysisRunId: string;
  datasetId: string;
  summary: string;
  verdict: string;
  confidence: number;
  status: Decision["status"];
  productNames: string[];
  evidenceCardIndices: number[];
  expectedProfitImpact: number;
  riskLevel: Decision["riskLevel"];
  notes?: string | null;
}): Promise<boolean> {
  try {
    const client = getClient();
    const payload: Record<string, unknown> = {
      id: data.id,
      analysis_run_id: data.analysisRunId,
      dataset_id: data.datasetId,
      summary: data.summary,
      verdict: data.verdict,
      confidence: data.confidence,
      status: data.status,
      product_names: data.productNames,
      evidence_card_indices: data.evidenceCardIndices,
      expected_profit_impact: data.expectedProfitImpact,
      risk_level: data.riskLevel,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const error = await insertWithUserId(client, "decisions", payload, userId);
    if (error) { logger.warn("saveDecision failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    return true;
  } catch (e: any) {
    logger.warn("saveDecision error", { message: e.message });
    return false;
  }
}

export async function updateDecisionStatus(
  userId: string,
  id: string,
  status: Decision["status"],
  notes?: string | null,
  expectedStatus?: Decision["status"],
): Promise<boolean> {
  try {
    const client = getClient();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    let query = client.from("decisions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);
    if (expectedStatus) query = query.eq("status", expectedStatus);
    const { data, error } = await query.select("id");
    if (error) { logger.warn("updateDecisionStatus failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    if (!data || data.length === 0) return false;
    return true;
  } catch (e: any) {
    logger.warn("updateDecisionStatus error", { message: e.message });
    return false;
  }
}

export async function getDecision(userId: string, id: string): Promise<Decision | null> {
  try {
    const client = getClient();
    const { data, error } = await client.from("decisions").select("*").eq("user_id", userId).eq("id", id).single();
    if (error || !data) return null;
    return mapDecision(data);
  } catch (e: unknown) {
    logger.warn("getDecision error", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function listDecisions(userId: string, datasetId: string, limit = 10): Promise<Decision[]> {
  try {
    const client = getClient();
    const { data, error } = await client.from("decisions")
      .select("*")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapDecision);
  } catch (e: unknown) {
    logger.warn("listDecisions error", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

// ═══════════════════════════════════════════════
// ActionTask CRUD
// ═══════════════════════════════════════════════

export async function saveActionTask(userId: string, data: {
  id: string;
  decisionId: string;
  title: string;
  description: string;
  priority: string;
  evidenceRefs: number[];
  ruleIds: string[];
  expectedProfitImpact: number;
  riskLevel: ActionTask["riskLevel"];
  notes?: string | null;
}): Promise<boolean> {
  try {
    const client = getClient();
    const payload: Record<string, unknown> = {
      id: data.id,
      decision_id: data.decisionId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: "pending",
      evidence_refs: data.evidenceRefs,
      rule_ids: data.ruleIds,
      expected_profit_impact: data.expectedProfitImpact,
      risk_level: data.riskLevel,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const error = await insertWithUserId(client, "action_tasks", payload, userId);
    if (error) { logger.warn("saveActionTask failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    return true;
  } catch (e: any) {
    logger.warn("saveActionTask error", { message: e.message });
    return false;
  }
}

export async function updateActionTaskStatus(
  userId: string,
  id: string,
  status: ActionTask["status"],
  notes?: string | null,
  expectedStatus?: ActionTask["status"],
): Promise<boolean> {
  try {
    const client = getClient();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    let query = client.from("action_tasks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);
    if (expectedStatus) query = query.eq("status", expectedStatus);
    const { data, error } = await query.select("id");
    if (error) { logger.warn("updateActionTaskStatus failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    if (!data || data.length === 0) return false;
    return true;
  } catch (e: any) {
    logger.warn("updateActionTaskStatus error", { message: e.message });
    return false;
  }
}

export async function listActionTasks(userId: string, decisionId: string): Promise<ActionTask[]> {
  try {
    const client = getClient();
    const { data, error } = await client.from("action_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("decision_id", decisionId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map(mapActionTask);
  } catch (e: unknown) {
    logger.warn("listActionTasks error", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export async function getActionTask(userId: string, id: string): Promise<ActionTask | null> {
  try {
    const client = getClient();
    const { data, error } = await client.from("action_tasks").select("*").eq("user_id", userId).eq("id", id).single();
    if (error || !data) return null;
    return mapActionTask(data);
  } catch (e: unknown) {
    logger.warn("getActionTask error", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/** Cancel all still-pending tasks after their decision is rejected. */
export async function cancelPendingActionTasks(userId: string, decisionId: string): Promise<boolean> {
  try {
    const client = getClient();
    const { error } = await client.from("action_tasks")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("decision_id", decisionId)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) {
      logger.warn("cancelPendingActionTasks failed", { message: error.message, code: error.code, details: error.details, hint: error.hint });
      return false;
    }
    return true;
  } catch (e: any) {
    logger.warn("cancelPendingActionTasks error", { message: e.message });
    return false;
  }
}

/** Mark an approved decision completed only when every associated task completed successfully. */
export async function reconcileDecisionStatus(userId: string, decisionId: string): Promise<boolean> {
  try {
    const client = getClient();
    const taskResult = await client.from("action_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("decision_id", decisionId)
      .order("created_at", { ascending: true });
    if (taskResult.error || !taskResult.data || taskResult.data.length === 0) {
      if (taskResult.error) logger.warn("reconcileDecisionStatus task query failed", { message: taskResult.error.message, code: taskResult.error.code });
      return false;
    }
    const tasks = taskResult.data.map(mapActionTask);
    if (!tasks.every(function (task) { return task.status === "completed"; })) return true;

    const decision = await getDecision(userId, decisionId);
    if (!decision) return false;
    if (decision.status === "completed") return true;
    // Never resurrect a rejected decision or complete an unapproved one.
    if (decision.status !== "approved") return true;

    const updated = await updateDecisionStatus(userId, decisionId, "completed", undefined, "approved");
    if (updated) return true;
    const current = await getDecision(userId, decisionId);
    return current?.status === "completed" || current?.status === "rejected";
  } catch (e: any) {
    logger.warn("reconcileDecisionStatus error", { message: e.message });
    return false;
  }
}

// ═══════════════════════════════════════════════
// Execution CRUD
// ═══════════════════════════════════════════════

export async function saveExecution(userId: string, data: {
  id: string;
  actionTaskId: string;
  status: Execution["status"];
  result?: string | null;
  executedBy?: string | null;
}): Promise<boolean> {
  try {
    const client = getClient();
    const payload: Record<string, unknown> = {
      id: data.id,
      action_task_id: data.actionTaskId,
      status: data.status,
      result: data.result || null,
      executed_by: data.executedBy || null,
      executed_at: data.status === "completed" || data.status === "failed" ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    };
    const error = await insertWithUserId(client, "executions", payload, userId);
    if (error) { logger.warn("saveExecution failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    return true;
  } catch (e: any) {
    logger.warn("saveExecution error", { message: e.message });
    return false;
  }
}

export async function updateExecutionStatus(
  userId: string,
  id: string,
  status: Execution["status"],
  result?: string | null,
  expectedStatus?: Execution["status"],
): Promise<boolean> {
  try {
    const client = getClient();
    const updates: Record<string, unknown> = { status };
    if (result !== undefined) updates.result = result;
    if (status === "completed" || status === "failed") updates.executed_at = new Date().toISOString();
    let query = client.from("executions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);
    if (expectedStatus) query = query.eq("status", expectedStatus);
    const { data, error } = await query.select("id");
    if (error) { logger.warn("updateExecutionStatus failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    if (!data || data.length === 0) return false;
    return true;
  } catch (e: any) {
    logger.warn("updateExecutionStatus error", { message: e.message });
    return false;
  }
}

export async function getExecution(userId: string, id: string): Promise<Execution | null> {
  try {
    const client = getClient();
    const { data, error } = await client.from("executions").select("*").eq("user_id", userId).eq("id", id).single();
    if (error || !data) return null;
    return mapExecution(data);
  } catch (e: unknown) {
    logger.warn("getExecution error", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function listExecutions(userId: string, actionTaskId: string): Promise<Execution[]> {
  try {
    const client = getClient();
    const { data, error } = await client.from("executions")
      .select("*")
      .eq("user_id", userId)
      .eq("action_task_id", actionTaskId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(mapExecution);
  } catch (e: unknown) {
    logger.warn("listExecutions error", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

// ═══════════════════════════════════════════════
// Outcome CRUD
// ═══════════════════════════════════════════════

export async function saveOutcome(userId: string, data: {
  id: string;
  executionId: string;
  metric: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  improvementPercent: number;
}): Promise<boolean> {
  try {
    const execution = await getExecution(userId, data.executionId);
    if (!execution || execution.status !== "completed") {
      logger.warn("saveOutcome rejected: execution is not completed", { userId, executionId: data.executionId, status: execution?.status });
      return false;
    }
    const client = getClient();
    const payload: Record<string, unknown> = {
      id: data.id,
      execution_id: data.executionId,
      metric: data.metric,
      before_value: data.beforeValue,
      after_value: data.afterValue,
      improvement: data.improvement,
      improvement_percent: data.improvementPercent,
      verified_at: new Date().toISOString(),
    };
    const error = await insertWithUserId(client, "outcomes", payload, userId);
    if (error) { logger.warn("saveOutcome failed", { message: error.message, code: error.code, details: error.details, hint: error.hint }); return false; }
    return true;
  } catch (e: any) {
    logger.warn("saveOutcome error", { message: e.message });
    return false;
  }
}

export async function listOutcomes(userId: string, executionId: string): Promise<Outcome[]> {
  try {
    const client = getClient();
    const { data, error } = await client.from("outcomes")
      .select("*")
      .eq("user_id", userId)
      .eq("execution_id", executionId)
      .order("verified_at", { ascending: false });
    if (error || !data) return [];
    return data.map(mapOutcome);
  } catch (e: unknown) {
    logger.warn("listOutcomes error", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

// ═══════════════════════════════════════════════
// Compensating Cleanup
// ═══════════════════════════════════════════════

export async function cleanupAgentPersistence(
  userId: string,
  analysisRunId?: string,
  decisionId?: string,
): Promise<void> {
  try {
    const client = getClient();
    if (decisionId) {
      // Cascade: delete outcomes → executions → action_tasks → decision
      const tasks = await client.from("action_tasks").select("id").eq("decision_id", decisionId).eq("user_id", userId);
      if (!tasks.error && tasks.data) {
        const taskIds = tasks.data.map(function(t: { id: string }) { return t.id; });
        if (taskIds.length > 0) {
          const execs = await client.from("executions").select("id").in("action_task_id", taskIds);
          if (!execs.error && execs.data) {
            const execIds = execs.data.map(function(e: { id: string }) { return e.id; });
            if (execIds.length > 0) {
              await client.from("outcomes").delete().in("execution_id", execIds).eq("user_id", userId);
            }
          }
          await client.from("executions").delete().in("action_task_id", taskIds).eq("user_id", userId);
        }
      }
      await client.from("action_tasks").delete().eq("decision_id", decisionId).eq("user_id", userId);
      await client.from("decisions").delete().eq("id", decisionId).eq("user_id", userId);
    }
    if (analysisRunId) {
      await client.from("analysis_runs").delete().eq("id", analysisRunId).eq("user_id", userId);
    }
  } catch (e: any) {
    logger.warn("cleanupAgentPersistence error", { message: e.message });
  }
}

// ═══════════════════════════════════════════════
// Batch Queries (eliminate N+1 cascade)
// ═══════════════════════════════════════════════

const BATCH_CHUNK_SIZE = 10_000; // Postgres parameter limit safety (65,535 max)

function chunkIds<T>(ids: T[]): T[][] {
  if (ids.length <= BATCH_CHUNK_SIZE) return [ids];
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + BATCH_CHUNK_SIZE));
  }
  return chunks;
}

function validateUserId(userId: string): boolean {
  return typeof userId === "string" && userId.trim().length > 0;
}

export async function listActionTasksBatch(
  userId: string,
  decisionIds: string[]
): Promise<Record<string, ActionTask[]>> {
  const result: Record<string, ActionTask[]> = {};
  if (!validateUserId(userId) || decisionIds.length === 0) return result;
  try {
    const client = getClient();
    const chunks = chunkIds(decisionIds);
    for (const chunk of chunks) {
      const { data, error } = await client
        .from("action_tasks")
        .select("*")
        .eq("user_id", userId)
        .in("decision_id", chunk)
        .order("created_at", { ascending: true });
      if (error || !data) continue;
      for (const row of data) {
        const mapped = mapActionTask(row);
        if (!result[mapped.decisionId]) result[mapped.decisionId] = [];
        result[mapped.decisionId].push(mapped);
      }
    }
  } catch (e) {
    logger.warn("listActionTasksBatch error", { message: e instanceof Error ? e.message : String(e) });
  }
  return result;
}

export async function listExecutionsBatch(
  userId: string,
  actionTaskIds: string[]
): Promise<Record<string, Execution[]>> {
  const result: Record<string, Execution[]> = {};
  if (!validateUserId(userId) || actionTaskIds.length === 0) return result;
  try {
    const client = getClient();
    const chunks = chunkIds(actionTaskIds);
    for (const chunk of chunks) {
      const { data, error } = await client
        .from("executions")
        .select("*")
        .eq("user_id", userId)
        .in("action_task_id", chunk)
        .order("created_at", { ascending: false });
      if (error || !data) continue;
      for (const row of data) {
        const mapped = mapExecution(row);
        if (!result[mapped.actionTaskId]) result[mapped.actionTaskId] = [];
        result[mapped.actionTaskId].push(mapped);
      }
    }
  } catch (e) {
    logger.warn("listExecutionsBatch error", { message: e instanceof Error ? e.message : String(e) });
  }
  return result;
}

export async function listOutcomesBatch(
  userId: string,
  executionIds: string[]
): Promise<Record<string, Outcome[]>> {
  const result: Record<string, Outcome[]> = {};
  if (!validateUserId(userId) || executionIds.length === 0) return result;
  try {
    const client = getClient();
    const chunks = chunkIds(executionIds);
    for (const chunk of chunks) {
      const { data, error } = await client
        .from("outcomes")
        .select("*")
        .eq("user_id", userId)
        .in("execution_id", chunk)
        .order("verified_at", { ascending: false });
      if (error || !data) continue;
      for (const row of data) {
        const mapped = mapOutcome(row);
        if (!result[mapped.executionId]) result[mapped.executionId] = [];
        result[mapped.executionId].push(mapped);
      }
    }
  } catch (e) {
    logger.warn("listOutcomesBatch error", { message: e instanceof Error ? e.message : String(e) });
  }
  return result;
}

// ═══════════════════════════════════════════════
// Mappers
// ═══════════════════════════════════════════════

function mapAnalysisRun(row: Record<string, unknown>): AnalysisRun {
  return {
    id: String(row.id),
    datasetId: String(row.dataset_id),
    input: String(row.input),
    chainSnapshot: (row.chain_snapshot as Record<string, unknown>) || {},
    pipelineLatency: Number(row.pipeline_latency) || 0,
    platform: row.platform ? String(row.platform) : null,
    industry: row.industry ? String(row.industry) : null,
    freshnessScore: Number(row.freshness_score) || 0,
    webSearchTriggered: Boolean(row.web_search_triggered),
    createdAt: String(row.created_at),
  };
}

function mapDecision(row: Record<string, unknown>): Decision {
  return {
    id: String(row.id),
    analysisRunId: String(row.analysis_run_id),
    datasetId: String(row.dataset_id),
    summary: String(row.summary),
    verdict: String(row.verdict),
    confidence: Number(row.confidence) || 0,
    status: String(row.status) as Decision["status"],
    productNames: Array.isArray(row.product_names) ? row.product_names.map(String) : [],
    evidenceCardIndices: Array.isArray(row.evidence_card_indices) ? row.evidence_card_indices.map(Number) : [],
    expectedProfitImpact: Number(row.expected_profit_impact) || 0,
    riskLevel: String(row.risk_level) as Decision["riskLevel"],
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapActionTask(row: Record<string, unknown>): ActionTask {
  return {
    id: String(row.id),
    decisionId: String(row.decision_id),
    title: String(row.title),
    description: String(row.description),
    priority: String(row.priority),
    status: String(row.status) as ActionTask["status"],
    evidenceRefs: Array.isArray(row.evidence_refs) ? row.evidence_refs.map(Number) : [],
    ruleIds: Array.isArray(row.rule_ids) ? row.rule_ids.map(String) : [],
    expectedProfitImpact: Number(row.expected_profit_impact) || 0,
    riskLevel: String(row.risk_level) as ActionTask["riskLevel"],
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapExecution(row: Record<string, unknown>): Execution {
  return {
    id: String(row.id),
    actionTaskId: String(row.action_task_id),
    status: String(row.status) as Execution["status"],
    result: row.result ? String(row.result) : null,
    executedBy: row.executed_by ? String(row.executed_by) : null,
    executedAt: row.executed_at ? String(row.executed_at) : "",
    createdAt: String(row.created_at),
  };
}

function mapOutcome(row: Record<string, unknown>): Outcome {
  return {
    id: String(row.id),
    executionId: String(row.execution_id),
    metric: String(row.metric),
    beforeValue: Number(row.before_value) || 0,
    afterValue: Number(row.after_value) || 0,
    improvement: Number(row.improvement) || 0,
    improvementPercent: Number(row.improvement_percent) || 0,
    verifiedAt: String(row.verified_at),
  };
}
