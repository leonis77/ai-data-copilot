import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      logger.warn("Supabase credentials missing, using localStorage-only mode");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function saveDataset(data: {
  id: string;
  name: string;
  originalName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  summary: string;
}) {
  try {
    const client = getClient();
    const payload = {
      id: data.id, name: data.name, original_name: data.originalName,
      columns: data.columns, rows: data.rows, row_count: data.rows.length,
      summary: data.summary, created_at: new Date().toISOString(),
    };
    const jsonSize = JSON.stringify(payload).length;
    logger.info("Saving dataset", { id: data.id, rows: data.rows.length, jsonSize });
    const { error } = await client.from("datasets").upsert(payload);
    if (error) {
      logger.error("Supabase upsert failed", { code: error.code, message: error.message, details: error.details });
      throw new Error("Supabase: " + error.message);
    }
    await cleanup(client);
  } catch (e: any) {
    logger.error("saveDataset failed", { message: e.message });
    throw e;
  }
}

async function cleanup(client: SupabaseClient) {
  try {
    const { data, error } = await client.from("datasets").select("id").order("created_at", { ascending: false });
    if (error) { logger.warn("Cleanup select failed", { message: error.message }); return; }
    if (!data || data.length <= 5) return;
    const ids = data.slice(5).map(function(d: { id: string }) { return d.id; });
    if (ids.length > 0) {
      await client.from("analysis_results").delete().in("dataset_id", ids);
      await client.from("datasets").delete().in("id", ids);
    }
  } catch (e: any) {
    logger.warn("Cleanup error (non-fatal)", { message: e.message });
  }
}

export async function getDataset(id: string) {
  try {
    const client = getClient();
    const { data, error } = await client.from("datasets").select("*").eq("id", id).single();
    if (error) { logger.warn("getDataset failed", { message: error.message }); return null; }
    return data;
  } catch (e: any) { logger.error("getDataset error", { message: e.message }); return null; }
}

export async function getLatestDataset() {
  try {
    const client = getClient();
    const { data, error } = await client.from("datasets").select("*").order("created_at", { ascending: false }).limit(1).single();
    if (error) return null;
    return data;
  } catch { return null; }
}

export async function listDatasets() {
  try {
    const client = getClient();
    const { data, error } = await client.from("datasets").select("id, name, original_name, row_count, columns, created_at").order("created_at", { ascending: false }).limit(20);
    if (error) return [];
    return (data || []).map(function(d: any) {
      return { id: d.id, name: d.name, originalName: d.original_name, rowCount: d.row_count, columns: d.columns, createdAt: d.created_at };
    });
  } catch { return []; }
}

export async function deleteDataset(id: string) {
  try {
    const client = getClient();
    await client.from("analysis_results").delete().eq("dataset_id", id);
    const { error } = await client.from("datasets").delete().eq("id", id);
    if (error) logger.warn("deleteDataset failed", { message: error.message });
  } catch (e: any) { logger.warn("deleteDataset error", { message: e.message }); }
}

export async function saveAnalysis(data: {
  id: string; datasetId: string; summary: string; insights: string; risks: string; suggestions: string;
}) {
  try {
    const client = getClient();
    const { error } = await client.from("analysis_results").upsert({
      id: data.id, dataset_id: data.datasetId, summary: data.summary,
      insights: data.insights, risks: data.risks, suggestions: data.suggestions,
      created_at: new Date().toISOString(),
    });
    if (error) logger.warn("saveAnalysis failed", { message: error.message });
  } catch (e: any) { logger.warn("saveAnalysis error", { message: e.message }); }
}

export async function getAnalysis(datasetId: string) {
  try {
    const client = getClient();
    const { data } = await client.from("analysis_results").select("*").eq("dataset_id", datasetId).order("created_at", { ascending: false }).limit(1);
    return (data && data.length > 0) ? data[0] : null;
  } catch { return null; }
}

export async function saveChatMessage(datasetId: string | null, role: string, content: string) {
  try {
    const client = getClient();
    await client.from("chat_history").insert({ dataset_id: datasetId, role, content, created_at: new Date().toISOString() });
  } catch {}
}

export async function getChatHistory(datasetId: string | null, limit = 50) {
  try {
    const client = getClient();
    let query = client.from("chat_history").select("*").order("created_at", { ascending: true });
    if (datasetId) query = query.eq("dataset_id", datasetId);
    const { data } = await query.limit(limit);
    return data || [];
  } catch { return []; }
}
