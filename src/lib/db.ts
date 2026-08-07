/**
 * ProcureWise Data Layer — User-Scoped
 *
 * 所有数据操作均以 user_id 为第一维度。
 * Supabase RLS 作为兜底防御，应用层作为第一道防线。
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!url || !key) {
      logger.warn("Supabase credentials missing");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ═══════════════════════════════════════════════
// Dataset CRUD
// ═══════════════════════════════════════════════

export interface DatasetMeta {
  id: string;
  name: string;
  originalName: string;
  columns: string[];
  rowCount: number;
  summary: string;
  createdAt: string;
  semanticRoles?: any;
  platform?: string;
}

export async function saveDataset(
  userId: string,
  data: {
    id: string;
    name: string;
    originalName: string;
    columns: string[];
    rows: Record<string, unknown>[];
    summary: string;
    platform?: string;
    semanticRoles?: any;
  }
): Promise<void> {
  try {
    const client = getClient();
    const payload: Record<string, any> = {
      id: data.id,
      user_id: userId,
      name: data.name,
      original_name: data.originalName,
      columns: data.columns,
      rows: data.rows,
      row_count: data.rows.length,
      summary: data.summary,
      created_at: new Date().toISOString(),
    };
    if (data.platform) payload.platform = data.platform;
    if (data.semanticRoles) payload.semantic_roles = data.semanticRoles;
    const { error } = await client.from("datasets").upsert(payload);
    if (error) {
      logger.error("saveDataset failed", { code: error.code, message: error.message });
      throw new Error("Supabase: " + error.message);
    }
    await cleanup(userId);
  } catch (e: any) {
    logger.error("saveDataset error", { message: e.message });
    throw e;
  }
}

/** 按用户清理旧数据集（只删该用户超过 5 条的） */
async function cleanup(userId: string): Promise<void> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from("datasets")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data || data.length <= 5) return;
    const ids = data.slice(5).map((d: { id: string }) => d.id);
    if (ids.length > 0) {
      await client.from("analysis_results").delete().in("id", ids);
      await client.from("datasets").delete().in("id", ids);
    }
  } catch (e: any) {
    logger.warn("cleanup error (non-fatal)", { message: e.message });
  }
}

export async function getDataset(userId: string, id: string): Promise<DatasetMeta | null> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from("datasets")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return mapDataset(data);
  } catch (e: any) {
    logger.warn("getDataset error", { message: e.message });
    return null;
  }
}

export async function getLatestDataset(userId: string): Promise<DatasetMeta | null> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from("datasets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return mapDataset(data);
  } catch {
    return null;
  }
}

export async function listDatasets(userId: string): Promise<DatasetMeta[]> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from("datasets")
      .select("id, name, original_name, row_count, columns, created_at, semantic_roles, platform")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return data.map(mapDataset);
  } catch {
    return [];
  }
}

export async function deleteDataset(userId: string, id: string): Promise<void> {
  try {
    const client = getClient();
    await client.from("analysis_results").delete().eq("dataset_id", id).eq("user_id", userId);
    await client.from("datasets").delete().eq("id", id).eq("user_id", userId);
  } catch (e: any) {
    logger.warn("deleteDataset error", { message: e.message });
  }
}

// ═══════════════════════════════════════════════
// Analysis Results
// ═══════════════════════════════════════════════

export async function saveAnalysis(userId: string, data: {
  id: string; datasetId: string; summary: string;
  insights: string; risks: string; suggestions: string;
}): Promise<void> {
  try {
    const client = getClient();
    await client.from("analysis_results").upsert({
      id: data.id,
      user_id: userId,
      dataset_id: data.datasetId,
      summary: data.summary,
      insights: data.insights,
      risks: data.risks,
      suggestions: data.suggestions,
      created_at: new Date().toISOString(),
    });
  } catch (e: any) {
    logger.warn("saveAnalysis error", { message: e.message });
  }
}

export async function getAnalysis(userId: string, datasetId: string): Promise<any> {
  try {
    const client = getClient();
    const { data } = await client
      .from("analysis_results")
      .select("*")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════
// Chat History
// ═══════════════════════════════════════════════

export async function saveChatMessage(userId: string, datasetId: string | null, role: string, content: string): Promise<void> {
  try {
    const client = getClient();
    await client.from("chat_history").insert({
      user_id: userId,
      dataset_id: datasetId,
      role,
      content,
      created_at: new Date().toISOString(),
    });
  } catch {}
}

export async function getChatHistory(userId: string, datasetId: string | null, limit = 50): Promise<any[]> {
  try {
    const client = getClient();
    let query = client.from("chat_history").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (datasetId) query = query.eq("dataset_id", datasetId);
    const { data } = await query.limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════
// Mapper
// ═══════════════════════════════════════════════

function mapDataset(row: Record<string, unknown>): DatasetMeta {
  return {
    id: String(row.id),
    name: String(row.name),
    originalName: String(row.original_name),
    columns: Array.isArray(row.columns) ? row.columns.map(String) : [],
    rowCount: Number(row.row_count) || 0,
    summary: row.summary ? String(row.summary) : "",
    createdAt: String(row.created_at),
    semanticRoles: row.semantic_roles || undefined,
    platform: row.platform ? String(row.platform) : undefined,
  };
}
