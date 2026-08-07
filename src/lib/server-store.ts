/**
 * In-memory server-side dataset store — user-scoped.
 *
 * Structure: Map<userId, Map<datasetId, ServerDataset>>
 *
 * NOTE: In Vercel/serverless deployments, each function instance has its own
 * memory, so this store isn't shared across instances. Supabase RLS provides
 * the authoritative multi-tenant isolation; this store is a performance cache.
 */

export interface ServerDataset {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
  createdAt: string;
  semanticRoles?: Record<string, unknown>;
  platform?: string;
}

// Use globalThis to survive Next.js dev mode HMR module re-evaluation.
const g = globalThis as unknown as Record<string, unknown>;
const STORE_KEY = "__aicopilot_server_store__";
if (!g[STORE_KEY]) {
  g[STORE_KEY] = new Map<string, Map<string, ServerDataset>>();
}
const store = g[STORE_KEY] as Map<string, Map<string, ServerDataset>>;
const MAX_DATASETS_PER_USER = 10;

/** Get the inner map for a user, creating if needed */
function getUserStore(userId: string): Map<string, ServerDataset> {
  let userMap = store.get(userId);
  if (!userMap) {
    userMap = new Map();
    store.set(userId, userMap);
  }
  return userMap;
}

export function saveToServerStore(data: ServerDataset): void {
  const userMap = getUserStore(data.userId);
  userMap.set(data.id, data);
  // Evict oldest entries if over limit
  if (userMap.size > MAX_DATASETS_PER_USER) {
    const entries = Array.from(userMap.entries());
    entries.sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
    const toRemove = entries.slice(0, entries.length - MAX_DATASETS_PER_USER);
    for (const [id] of toRemove) userMap.delete(id);
  }
}

export function getFromServerStore(userId: string, id: string): ServerDataset | null {
  return store.get(userId)?.get(id) || null;
}

export function getLatestFromServerStore(userId: string): ServerDataset | null {
  const userMap = store.get(userId);
  if (!userMap || userMap.size === 0) return null;
  const all = Array.from(userMap.values());
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all[0];
}

/** Return all datasets for a specific user */
export function listFromServerStore(userId: string): Array<ServerDataset> {
  const userMap = store.get(userId);
  if (!userMap) return [];
  return Array.from(userMap.values());
}

export function deleteFromServerStore(userId: string, id: string): void {
  store.get(userId)?.delete(id);
}
