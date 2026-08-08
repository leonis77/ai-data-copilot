import { logger } from "@/lib/logger";
import type { SemanticProfile } from "@/lib/semantic/types";

const MAIN_KEY = "aicopilot";
const MAX_STORE_SIZE = 4 * 1024 * 1024; // 4MB warning threshold
const ANALYSIS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟

// ═══ M3: Shared frontend dataset contract ═══

/** Dataset metadata persisted in the app store (localStorage key: aicopilot_{userId}) */
export interface LocalDatasetMeta {
  id: string;
  userId: string;
  originalName: string;
  rowCount: number;
  columns: string[];
  createdAt: string;
  profile?: string;
  semanticRoles?: SemanticProfile | null;
  platform?: string;
}

/** Raw rows persisted separately to avoid bloating the main store */
export interface LocalDatasetRows {
  id: string;
  columns: string[];
  rows: Record<string, unknown>[];
  savedAt: number;
}

/** Inline dataset sent to /api/agent (localStorage -> backend pipeline) */
export interface InlineDatasetPayload {
  columns: string[];
  rows: Record<string, unknown>[];
  originalName?: string;
  platform?: string;
}

// ═══ Analysis Cache ═══

export interface AnalysisCacheEntry {
  datasetId: string;
  cachedAt: number;
  data: unknown;
}

export interface AppStore {
  activeId: string;
  datasets: LocalDatasetMeta[];
  columnConfig: { datasetId: string; templateId?: string | null; selectedColumns: string[] } | null;
  auth?: {
    userId: string;
    email: string;
    fullName: string;
    avatarUrl: string;
  };
  analysisCache?: Record<string, AnalysisCacheEntry>;
}

/** 生成用户隔离的 localStorage key */
export function getUserKey(userId: string): string {
  return MAIN_KEY + "_" + userId;
}

/** 生成数据集行数据的 localStorage key */
export function getDataKey(datasetId: string): string {
  return MAIN_KEY + "_data_" + datasetId;
}

function estimateSize(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) total += (localStorage.getItem(k) || "").length * 2;
    }
    return total;
  } catch { return 0; }
}

function cleanupIfNeeded(userId: string): void {
  const size = estimateSize();
  if (size > MAX_STORE_SIZE) {
    logger.warn("localStorage approaching limit, cleaning oldest datasets", { size, limit: MAX_STORE_SIZE });
    try {
      const s = getStore(userId);
      s.datasets = s.datasets.slice(0, 3);
      setStore(userId, s);
    } catch (e) {
      logger.error("cleanup failed", { message: e instanceof Error ? e.message : String(e) });
    }
  }
}

export function getStore(userId: string): AppStore {
  const key = getUserKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { activeId: "", datasets: [], columnConfig: null, auth: undefined };
    const parsed = JSON.parse(raw);
    return {
      activeId: parsed.activeId || "",
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets.slice(0, 5) : [],
      columnConfig: parsed.columnConfig || null,
      auth: parsed.auth || undefined,
    };
  } catch (e) {
    logger.error("getStore parse failed", { message: e instanceof Error ? e.message : String(e) });
    return { activeId: "", datasets: [], columnConfig: null, auth: undefined };
  }
}

export function setStore(userId: string, update: Partial<AppStore>): AppStore {
  const key = getUserKey(userId);
  try {
    const prev = getStore(userId);
    const next = { ...prev, ...update };
    const data = JSON.stringify(next);
    if (data.length > 3 * 1024 * 1024) {
      logger.warn("store data approaching quota, truncating", { size: data.length });
      next.datasets = next.datasets.slice(0, 3);
    }
    localStorage.setItem(key, JSON.stringify(next));
    cleanupIfNeeded(userId);
    return next;
  } catch (e) {
    logger.error("setStore failed", { message: e instanceof Error ? e.message : String(e) });
    return getStore(userId);
  }
}

export function addDataset(
  userId: string,
  id: string,
  name: string,
  rowCount: number,
  columns: string[],
  profile?: string,
  semanticRoles?: SemanticProfile | null,
  platform?: string,
): AppStore {
  try {
    const s = getStore(userId);
    s.datasets = s.datasets.filter(function (d) { return d.id !== id; });
    s.datasets.unshift({
      id,
      userId,
      originalName: name,
      rowCount,
      columns,
      createdAt: new Date().toISOString(),
      profile: profile || "unknown",
      semanticRoles: semanticRoles || null,
      platform: platform || undefined,
    });
    if (s.datasets.length > 5) s.datasets = s.datasets.slice(0, 5);
    s.activeId = id;
    s.columnConfig = null;
    setStore(userId, s);
    // 新上传的数据集，清除旧的分析缓存
    clearAnalysisCache(userId, id);
    return s;
  } catch (e) {
    logger.error("addDataset failed", { message: e instanceof Error ? e.message : String(e) });
    return getStore(userId);
  }
}

export function removeDataset(userId: string, id: string): AppStore {
  try {
    const s = getStore(userId);
    s.datasets = s.datasets.filter(function (d) { return d.id !== id; });
    if (s.activeId === id) s.activeId = s.datasets.length > 0 ? s.datasets[0].id : "";
    setStore(userId, s);
    removeDatasetRows(id);
    clearAnalysisCache(userId, id);
    return s;
  } catch (e) {
    logger.error("removeDataset failed", { message: e instanceof Error ? e.message : String(e) });
    return getStore(userId);
  }
}

export function saveColumnConfig(userId: string, config: AppStore["columnConfig"]) {
  try {
    setStore(userId, { columnConfig: config });
  } catch (e) {
    logger.error("saveColumnConfig failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

/** 保存数据集完整行数据（最多 500 行，独立 key 避免撑爆主 store） */
export function saveDatasetRows(userId: string, id: string, rows: Record<string, unknown>[], columns: string[]): void {
  try {
    const payload: LocalDatasetRows = { id, columns, rows: rows.slice(0, 500), savedAt: Date.now() };
    const data = JSON.stringify(payload);
    if (data.length > 2 * 1024 * 1024) {
      logger.warn("Dataset rows too large, truncating", { id, size: data.length });
      payload.rows = payload.rows.slice(0, Math.floor(500 * 2 * 1024 * 1024 / data.length));
    }
    localStorage.setItem(getDataKey(id), JSON.stringify(payload));
  } catch (e) {
    logger.error("saveDatasetRows failed", { id, message: e instanceof Error ? e.message : String(e) });
  }
}

/** 读取数据集完整行数据 */
export function getDatasetRows(id: string): { rows: Record<string, unknown>[]; columns: string[] } | null {
  try {
    const raw = localStorage.getItem(getDataKey(id));
    if (!raw) return null;
    const parsed: LocalDatasetRows = JSON.parse(raw);
    return { rows: parsed.rows || [], columns: parsed.columns || [] };
  } catch (e) {
    return null;
  }
}

/** 清理指定数据集的存储数据 */
export function removeDatasetRows(id: string): void {
  try {
    localStorage.removeItem(getDataKey(id));
  } catch {}
}

// ═══ Analysis Cache ═══

export function getAnalysisCache(userId: string, datasetId: string, context: string = "dashboard"): AnalysisCacheEntry | null {
  try {
    const s = getStore(userId);
    if (!s.analysisCache) return null;
    const key = datasetId + ":" + context;
    const entry = s.analysisCache[key];
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > ANALYSIS_CACHE_TTL_MS) {
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function setAnalysisCache(userId: string, datasetId: string, data: unknown, context: string = "dashboard"): void {
  try {
    const s = getStore(userId);
    if (!s.analysisCache) s.analysisCache = {};
    const key = datasetId + ":" + context;
    s.analysisCache[key] = {
      datasetId,
      cachedAt: Date.now(),
      data,
    };
    var keys = Object.keys(s.analysisCache);
    if (keys.length > 5) {
      var oldestKey = keys.sort(function (a, b) {
        return (s.analysisCache![a]?.cachedAt || 0) - (s.analysisCache![b]?.cachedAt || 0);
      })[0];
      delete s.analysisCache[oldestKey];
    }
    setStore(userId, { analysisCache: s.analysisCache });
  } catch (e) {
    logger.warn("setAnalysisCache failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

export function clearAnalysisCache(userId: string, datasetId?: string, context?: string): void {
  try {
    const s = getStore(userId);
    if (!s.analysisCache) return;
    if (datasetId) {
      if (context) {
        delete s.analysisCache[datasetId + ":" + context];
      } else {
        // 清除该数据集所有 context 的缓存
        var prefix = datasetId + ":";
        var cache = s.analysisCache;
        Object.keys(cache).forEach(function(k) {
          if (k.startsWith(prefix)) delete cache[k];
        });
      }
    } else {
      s.analysisCache = {};
    }
    setStore(userId, { analysisCache: s.analysisCache });
  } catch (e) {
    logger.warn("clearAnalysisCache failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

/** 清理指定用户的所有本地数据（登出时调用） */
export function clearUserStore(userId: string): void {
  try {
    const key = getUserKey(userId);
    // 先读取该用户的 datasets 列表，记录要清理的 data keys 索引
    const s = getStore(userId);
    const datasetIds = new Set((s.datasets || []).map(function (d) { return d.id; }));
    // 收集要清理的 data keys（必须在 removeItem(key) 之前，因为之后 datasets 列表就丢失了）
    var keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(MAIN_KEY + "_data_")) {
        const dsId = k.slice((MAIN_KEY + "_data_").length);
        if (datasetIds.has(dsId)) {
          keysToRemove.push(k);
        }
      }
    }
    // 先清理 data keys，再清理主 store key
    keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    localStorage.removeItem(key);
  } catch (e) {
    logger.error("clearUserStore failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

// ═══ M3: Inline dataset helper ═══

/**
 * Build a typed inline dataset payload from localStorage store metadata + rows.
 * Single source of truth for the shape sent to /api/agent.
 */
export function buildInlineDataset(
  meta: LocalDatasetMeta,
  rows: Record<string, unknown>[],
  maxRows = 200,
): InlineDatasetPayload {
  return {
    columns: meta.columns,
    rows: rows.slice(0, maxRows),
    originalName: meta.originalName || undefined,
    platform: meta.platform || undefined,
  };
}
