import { logger } from "@/lib/logger";

const KEY = "aicopilot";
const MAX_STORE_SIZE = 4 * 1024 * 1024; // 4MB warning threshold

export interface AppStore {
  activeId: string;
  datasets: { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string; profile?: string; semanticRoles?: any; platform?: string }[];
  columnConfig: { datasetId: string; templateId?: string | null; selectedColumns: string[] } | null;
}

function estimateSize(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) total += (localStorage.getItem(k) || "").length * 2; // UTF-16
    }
    return total;
  } catch { return 0; }
}

function cleanupIfNeeded(): void {
  const size = estimateSize();
  if (size > MAX_STORE_SIZE) {
    logger.warn("localStorage approaching limit, cleaning oldest datasets", { size, limit: MAX_STORE_SIZE });
    try {
      const s = getStore();
      s.datasets = s.datasets.slice(0, 3); // keep only 3 most recent
      setStore(s);
    } catch (e) {
      logger.error("cleanup failed", { message: e instanceof Error ? e.message : String(e) });
    }
  }
}

export function getStore(): AppStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { activeId: "", datasets: [], columnConfig: null };
    const parsed = JSON.parse(raw);
    return {
      activeId: parsed.activeId || "",
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets.slice(0, 5) : [],
      columnConfig: parsed.columnConfig || null,
    };
  } catch (e) {
    logger.error("getStore parse failed", { message: e instanceof Error ? e.message : String(e) });
    return { activeId: "", datasets: [], columnConfig: null };
  }
}

export function setStore(update: Partial<AppStore>): AppStore {
  try {
    const prev = getStore();
    const next = { ...prev, ...update };
    const data = JSON.stringify(next);
    if (data.length > 3 * 1024 * 1024) {
      logger.warn("store data approaching quota, truncating", { size: data.length });
      next.datasets = next.datasets.slice(0, 3);
    }
    localStorage.setItem(KEY, JSON.stringify(next));
    cleanupIfNeeded();
    return next;
  } catch (e) {
    logger.error("setStore failed", { message: e instanceof Error ? e.message : String(e) });
    return getStore();
  }
}

export function addDataset(id: string, name: string, rowCount: number, columns: string[], profile?: string, semanticRoles?: any, platform?: string) {
  try {
    const s = getStore();
    s.datasets = s.datasets.filter(function(d) { return d.id !== id; });
    s.datasets.unshift({ id, originalName: name, rowCount, columns, createdAt: new Date().toISOString(), profile: profile || "unknown", semanticRoles: semanticRoles || null, platform: platform || undefined });
    if (s.datasets.length > 5) s.datasets = s.datasets.slice(0, 5);
    s.activeId = id;
    s.columnConfig = null;
    setStore(s);
    return s;
  } catch (e) {
    logger.error("addDataset failed", { message: e instanceof Error ? e.message : String(e) });
    return getStore();
  }
}

export function removeDataset(id: string) {
  try {
    const s = getStore();
    s.datasets = s.datasets.filter(function(d) { return d.id !== id; });
    if (s.activeId === id) s.activeId = s.datasets.length > 0 ? s.datasets[0].id : "";
    setStore(s);
    return s;
  } catch (e) {
    logger.error("removeDataset failed", { message: e instanceof Error ? e.message : String(e) });
    return getStore();
  }
}

export function saveColumnConfig(config: AppStore["columnConfig"]) {
  try {
    setStore({ columnConfig: config });
  } catch (e) {
    logger.error("saveColumnConfig failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

export function clearStore() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    logger.error("clearStore failed", { message: e instanceof Error ? e.message : String(e) });
  }
}
