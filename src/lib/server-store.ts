/**
 * In-memory server-side dataset store.
 *
 * This provides a fallback when Supabase is unreachable.
 * NOTE: In Vercel/serverless deployments, each function instance has its own
 * memory, so this store won't be shared across requests. For production use,
 * ensure Supabase is configured correctly or use a real cache (e.g. Redis).
 */

interface ServerDataset {
  id: string;
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
// Module-level variables are reset when routes are compiled on first access.
const g = globalThis as unknown as Record<string, unknown>;
const STORE_KEY = "__aicopilot_server_store__";
if (!g[STORE_KEY]) {
  g[STORE_KEY] = new Map<string, ServerDataset>();
}
const store = g[STORE_KEY] as Map<string, ServerDataset>;
const MAX_DATASETS = 10;

export function saveToServerStore(data: ServerDataset): void {
  store.set(data.id, data);
  // Evict oldest entries if over limit
  if (store.size > MAX_DATASETS) {
    const keys = Array.from(store.keys());
    const oldest = keys.sort((a, b) => {
      const da = store.get(a)?.createdAt || "";
      const db = store.get(b)?.createdAt || "";
      return da.localeCompare(db);
    });
    for (let i = 0; i < oldest.length - MAX_DATASETS; i++) {
      store.delete(oldest[i]);
    }
  }
}

export function getFromServerStore(id: string): ServerDataset | null {
  return store.get(id) || null;
}

export function getLatestFromServerStore(): ServerDataset | null {
  if (store.size === 0) return null;
  const all = Array.from(store.values());
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all[0];
}

export function deleteFromServerStore(id: string): void {
  store.delete(id);
}
