import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
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
  const client = getClient();
  await client.from("datasets").upsert({
    id: data.id, name: data.name, original_name: data.originalName,
    columns: data.columns, rows: data.rows, row_count: data.rows.length,
    summary: data.summary, created_at: new Date().toISOString(),
  });
  await cleanup(client);
}

async function cleanup(client: SupabaseClient) {
  const { data } = await client.from("datasets").select("id").order("created_at", { ascending: false });
  if (!data || data.length <= 5) return;
  const ids = data.slice(5).map(function(d: { id: string }) { return d.id; });
  if (ids.length > 0) {
    await client.from("analysis_results").delete().in("dataset_id", ids);
    await client.from("datasets").delete().in("id", ids);
  }
}

export async function getDataset(id: string) {
  const client = getClient();
  const { data } = await client.from("datasets").select("*").eq("id", id).single();
  return data;
}

export async function getLatestDataset() {
  const client = getClient();
  const { data } = await client.from("datasets").select("*").order("created_at", { ascending: false }).limit(1).single();
  return data;
}

export async function listDatasets() {
  const client = getClient();
  const { data } = await client.from("datasets").select("id, name, original_name, row_count, columns, created_at").order("created_at", { ascending: false });
  return (data || []).map(function(d: any) {
    return { id: d.id, name: d.name, originalName: d.original_name, rowCount: d.row_count, columns: d.columns, createdAt: d.created_at };
  });
}

export async function deleteDataset(id: string) {
  const client = getClient();
  await client.from("analysis_results").delete().eq("dataset_id", id);
  await client.from("datasets").delete().eq("id", id);
}

export async function saveAnalysis(data: {
  id: string; datasetId: string; summary: string; insights: string; risks: string; suggestions: string;
}) {
  const client = getClient();
  await client.from("analysis_results").upsert({
    id: data.id, dataset_id: data.datasetId, summary: data.summary,
    insights: data.insights, risks: data.risks, suggestions: data.suggestions,
    created_at: new Date().toISOString(),
  });
}

export async function getAnalysis(datasetId: string) {
  const client = getClient();
  const { data } = await client.from("analysis_results").select("*").eq("dataset_id", datasetId).order("created_at", { ascending: false }).limit(1).single();
  return data;
}

export async function saveChatMessage(datasetId: string | null, role: string, content: string) {
  const client = getClient();
  await client.from("chat_history").insert({ dataset_id: datasetId, role, content, created_at: new Date().toISOString() });
}

export async function getChatHistory(datasetId: string | null, limit = 50) {
  const client = getClient();
  let query = client.from("chat_history").select("*").order("created_at", { ascending: true });
  if (datasetId) query = query.eq("dataset_id", datasetId);
  const { data } = await query.limit(limit);
  return data || [];
}
