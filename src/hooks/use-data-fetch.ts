import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  var allDeps = useMemo(function() { return [...deps, refetchSignal]; }, [deps.join(","), refetchSignal]);

  useEffect(() => {
    mountedRef.current = true;
    const currentKey = key;
    keyRef.current = key;

    dataManager.cancel(key);

    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });

    dataManager.fetch(key, fetcher, ttl).then(
      (data) => {
        if (keyRef.current !== currentKey) return;
        if (!mountedRef.current) return;
        setState({ data, loading: false, error: null });
      },
      (err) => {
        if (keyRef.current !== currentKey) return;
        if (!mountedRef.current) return;
        if (err.name === "AbortError") return;
        setState({ data: null, loading: false, error: err as Error });
      }
    );

    return () => {
      mountedRef.current = false;
      dataManager.cancel(currentKey);
    };
  }, allDeps);

  const refetch = useCallback(() => {
    dataManager.invalidate(key);
    setRefetchSignal((s) => s + 1);
  }, [key]);

  return { ...state, refetch };
}
