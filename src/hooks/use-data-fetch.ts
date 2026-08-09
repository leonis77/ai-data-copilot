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
  const ttl = options?.ttl ?? 60_000;
  const enabled = options?.enabled ?? true;
  const [refetchSignal, setRefetchSignal] = useState(0);

  // CRITICAL: Do NOT wrap deps in useMemo. useMemo does NOT guarantee
  // reference stability (React documentation explicitly states this).
  // A new array reference on every render would make useEffect fire
  // continuously, cascading into React #300 "Too many re-renders".
  // Spreading deps directly into useEffect's dependency array is correct
  // and only triggers the effect when a value actually changes.
  useEffect(function () {
    mountedRef.current = true;
    const currentKey = key;
    keyRef.current = key;

    dataManager.cancel(key);

    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });

    // dataManager.fetch 可能在 cache hit 时同步返回数据（非 Promise）
    // 必须用 Promise.resolve() 包装，确保 .then() 总是异步执行，
    // 避免在 effect 执行期间同步调用 setState 导致 React #300
    var fetchResult = dataManager.fetch(key, fetcher, ttl);
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
  }, [...deps, refetchSignal]);

  const refetch = useCallback(function () {
    dataManager.invalidate(key);
    setRefetchSignal(function (s) { return s + 1; });
  }, [key]);

  return { ...state, refetch };
}
