/**
 * ProcureWise Business Closed-Loop Persistence — User-Scoped
 *
 * 所有记录均关联 user_id，确保跨用户数据隔离。
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
}): Promise<void> {
  try {
    const client = getClient();
    const { error } = await client.from("analysis_runs").insert({
      id: data.id,
      user_id: userId,
      dataset_id: data.datasetId,
      input: data.input,
      chain_snapshot: data.chainSnapshot,
      pipeline_latency: data.pipelineLatency,
      platform: data.platform,
      industry: data.industry,
      freshness_score: data.freshnessScore,
      web_search_triggered: data.webSearchTriggered,
      created_at: new Date().toISOString(),
    });
    if (error) logger.warn("saveAnalysisRun failed", { message: error.message });
  } catch (e: any) {
    logger.warn("saveAnalysisRun error", { message: e.message });
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
}): Promise<void> {
  try {
    const client = getClient();
    const { error } = await client.from("decisions").insert({
      id: data.id,
      user_id: userId,
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
    });
    if (error) logger.warn("saveDecision failed", { message: error.message });
  } catch (e: any) {
    logger.warn("saveDecision error", { message: e.message });
  }
}

export async function updateDecisionStatus(userId: string, id: string, status: Decision["status"], notes?: string | null): Promise<void> {
  try {
    const client = getClient();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    const { error } = await client.from("decisions").update(updates).eq("id", id).eq("user_id", userId);
    if (error) logger.warn("updateDecisionStatus failed", { message: error.message });
  } catch (e: any) {
    logger.warn("updateDecisionStatus error", { message: e.message });
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
}): Promise<void> {
  try {
    const client = getClient();
    const { error } = await client.from("action_tasks").insert({
      id: data.id,
      user_id: userId,
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
    });
    if (error) logger.warn("saveActionTask failed", { message: error.message });
  } catch (e: any) {
    logger.warn("saveActionTask error", { message: e.message });
  }
}

export async function updateActionTaskStatus(userId: string, id: string, status: ActionTask["status"], notes?: string | null): Promise<void> {
  try {
    const client = getClient();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    const { error } = await client.from("action_tasks").update(updates).eq("id", id).eq("user_id", userId);
    if (error) logger.warn("updateActionTaskStatus failed", { message: error.message });
  } catch (e: any) {
    logger.warn("updateActionTaskStatus error", { message: e.message });
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

// ═══════════════════════════════════════════════
// Execution CRUD
// ═══════════════════════════════════════════════

export async function saveExecution(userId: string, data: {
  id: string;
  actionTaskId: string;
  status: Execution["status"];
  result?: string | null;
  executedBy?: string | null;
}): Promise<void> {
  try {
    const client = getClient();
    const { error } = await client.from("executions").insert({
      id: data.id,
      user_id: userId,
      action_task_id: data.actionTaskId,
      status: data.status,
      result: data.result || null,
      executed_by: data.executedBy || null,
      executed_at: data.status === "completed" || data.status === "failed" ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    });
    if (error) logger.warn("saveExecution failed", { message: error.message });
  } catch (e: any) {
    logger.warn("saveExecution error", { message: e.message });
  }
}

export async function updateExecutionStatus(userId: string, id: string, status: Execution["status"], result?: string | null): Promise<void> {
  try {
    const client = getClient();
    const updates: Record<string, unknown> = { status };
    if (result !== undefined) updates.result = result;
    if (status === "completed" || status === "failed") updates.executed_at = new Date().toISOString();
    const { error } = await client.from("executions").update(updates).eq("id", id).eq("user_id", userId);
    if (error) logger.warn("updateExecutionStatus failed", { message: error.message });
  } catch (e: any) {
    logger.warn("updateExecutionStatus error", { message: e.message });
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
}): Promise<void> {
  try {
    const client = getClient();
    const { error } = await client.from("outcomes").insert({
      id: data.id,
      user_id: userId,
      execution_id: data.executionId,
      metric: data.metric,
      before_value: data.beforeValue,
      after_value: data.afterValue,
      improvement: data.improvement,
      improvement_percent: data.improvementPercent,
      verified_at: new Date().toISOString(),
    });
    if (error) logger.warn("saveOutcome failed", { message: error.message });
  } catch (e: any) {
    logger.warn("saveOutcome error", { message: e.message });
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
