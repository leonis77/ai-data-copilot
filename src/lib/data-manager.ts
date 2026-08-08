/**
 * DataManager — 统一数据获取管理器
 *
 * 大厂级实践：
 * - 请求去重：同一 key 同一时刻只有一个 in-flight 请求
 * - 自动取消：新请求自动取消同一 key 的旧请求
 * - 内存缓存：TTL 过期自动失效
 * - 主动失效：支持按 key 或全局清除缓存
 */

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface InflightEntry {
  promise: Promise<any>;
  controller: AbortController;
}

const cache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, InflightEntry>();
const DEFAULT_TTL = 60_000; // 60s

export const dataManager = {
  async fetch<T>(key: string, fetcher: Fetcher<T>, ttl = DEFAULT_TTL): Promise<T> {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const existing = inflight.get(key);
    if (existing) {
      return existing.promise;
    }

    const controller = new AbortController();
    const promise = fetcher(controller.signal)
      .then((data) => {
        cache.set(key, { data, timestamp: Date.now() });
        inflight.delete(key);
        return data;
      })
      .catch((err) => {
        inflight.delete(key);
        throw err;
      });

    inflight.set(key, { promise, controller });
    return promise;
  },

  cancel(key: string): void {
    const entry = inflight.get(key);
    if (entry) {
      entry.controller.abort();
      inflight.delete(key);
    }
  },

  invalidate(key?: string | string[]): void {
    if (!key) {
      cache.clear();
    } else if (Array.isArray(key)) {
      key.forEach((k) => cache.delete(k));
    } else {
      cache.delete(key);
    }
  },

  clear(): void {
    cache.clear();
    inflight.forEach((entry) => entry.controller.abort());
    inflight.clear();
  },
};
