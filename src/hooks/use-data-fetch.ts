import { useState, useEffect, useRef, useCallback } from "react";
import { dataManager } from "@/lib/data-manager";

export function useDataFetch<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: any[] = [],
  options?: {
    ttl?: number;
    enabled?: boolean;
  }
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const mountedRef = useRef(true);
  const keyRef = useRef(key);

  // ⚠️ 必须在 useEffect 之前声明，因为 effect 的 .then() 闭包会引用它们
  const currentKey = key;
  const ttl = options?.ttl ?? 60_000;
  const enabled = options?.enabled ?? true;

  // ⚠️ 不要将 refetchSignal 放入 useEffect 依赖数组。
  // 根因: refetch() 调用 setRefetchSignal → 触发 re-render →
  // effect 检测到 refetchSignal 变化 → 重新执行 → setState → re-render →
  // effect 再次执行... 无限级联 → React #300 "Too many re-renders"。
  //
  // 正确做法: effect 仅依赖 [...deps]，refetch 直接调用 fetcher + setState，
  // 绕过 effect 依赖数组。这样 refetch 不会触发 effect 重新执行。

  useEffect(function () {
    mountedRef.current = true;
    keyRef.current = currentKey;

    dataManager.cancel(currentKey);

    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });

    var fetchResult = dataManager.fetch(currentKey, fetcher, ttl);
    var fetchPromise: Promise<any> = fetchResult instanceof Promise
      ? fetchResult
      : Promise.resolve(fetchResult);

    var cancelled = false;
    fetchPromise.then(
      function (data) {
        if (cancelled) return;
        if (keyRef.current !== currentKey) return;
        if (!mountedRef.current) return;
        setState({ data: data, loading: false, error: null });
      },
      function (err) {
        if (cancelled) return;
        if (keyRef.current !== currentKey) return;
        if (!mountedRef.current) return;
        if (err.name === "AbortError") return;
        setState({ data: null, loading: false, error: err as Error });
      }
    );

    return function () {
      cancelled = true;
      mountedRef.current = false;
      dataManager.cancel(currentKey);
    };
  }, [...deps]);

  const refetch = useCallback(function () {
    dataManager.invalidate(keyRef.current);
    const signal = new AbortController();
    fetcher(signal.signal).then(
      function (data) {
        if (keyRef.current !== currentKey) return;
        if (!mountedRef.current) return;
        setState({ data: data, loading: false, error: null });
      },
      function (err) {
        if (keyRef.current !== currentKey) return;
        if (!mountedRef.current) return;
        if (err.name === "AbortError") return;
        setState({ data: null, loading: false, error: err as Error });
      }
    );
  }, [fetcher, currentKey]);

  return { ...state, refetch };
}
