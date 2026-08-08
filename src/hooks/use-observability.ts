"use client";

import { useEffect, useRef, useMemo } from "react";
import { authFetch } from "@/lib/auth-fetch";

type MetricType = "page_view" | "api_call" | "pipeline_result" | "user_action" | "error" | "performance";

interface MetricEvent {
  type: MetricType;
  name: string;
  value?: number;
  tags?: Record<string, string | number | boolean>;
  timestamp: string;
  sessionId: string;
}

const SESSION_KEY = "__aicopilot_obs_session__";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "sess_" + Date.now().toString(36);
  }
}

const sessionId = getSessionId();
const buffer: MetricEvent[] = [];
const MAX_BUFFER = 50;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function flush(): void {
  if (buffer.length === 0) return;
  const payload = buffer.splice(0, buffer.length);
  authFetch("/api/observability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: payload }),
    keepalive: true,
  }).catch(function() {});
}

function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flush, 10000);
}

export function trackMetric(type: MetricType, name: string, value?: number, tags?: Record<string, string | number | boolean>): void {
  const event: MetricEvent = { type, name, value, tags, timestamp: new Date(Date.now()).toISOString(), sessionId };
  buffer.push(event);
  if (buffer.length >= MAX_BUFFER) flush();
  ensureFlushTimer();
}

interface ObsApi {
  trackPageView: (pageName: string, tags?: Record<string, string | number | boolean>) => void;
  trackApiCall: (route: string, durationMs: number, ok: boolean, tags?: Record<string, string | number | boolean>) => void;
  trackPipelineResult: (resultType: string, durationMs: number, tags?: Record<string, string | number | boolean>) => void;
  trackError: (error: Error | string, tags?: Record<string, string | number | boolean>) => void;
  trackPerformance: (name: string, valueMs: number, tags?: Record<string, string | number | boolean>) => void;
}

export function useObservability(): ObsApi {
  const pageViewTracked = useRef(false);

  const trackPageViewRef = useRef(function(pageName: string, tags?: Record<string, string | number | boolean>) {
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    trackMetric("page_view", pageName, undefined, tags);
  });

  const trackApiCallRef = useRef(function(route: string, durationMs: number, ok: boolean, tags?: Record<string, string | number | boolean>) {
    trackMetric("api_call", route, durationMs, Object.assign({ ok }, tags || {}));
  });

  const trackPipelineResultRef = useRef(function(resultType: string, durationMs: number, tags?: Record<string, string | number | boolean>) {
    trackMetric("pipeline_result", resultType, durationMs, tags);
  });

  const trackErrorRef = useRef(function(error: Error | string, tags?: Record<string, string | number | boolean>) {
    trackMetric("error", error instanceof Error ? error.message : error, undefined, tags);
  });

  const trackPerformanceRef = useRef(function(name: string, valueMs: number, tags?: Record<string, string | number | boolean>) {
    trackMetric("performance", name, valueMs, tags);
  });

  useEffect(function() {
    return function() {
      if (flushTimer) clearInterval(flushTimer);
      flush();
    };
  }, []);

  // Stable object reference — never changes across re-renders.
  // Using refs for implementations + useMemo(..., []) guarantees
  // consumers see the same obs object every render, preventing
  // cascading useEffect restarts.
  return useMemo(function() {
    return {
      trackPageView: function(pageName: string, tags?: Record<string, string | number | boolean>) {
        return trackPageViewRef.current(pageName, tags);
      },
      trackApiCall: function(route: string, durationMs: number, ok: boolean, tags?: Record<string, string | number | boolean>) {
        return trackApiCallRef.current(route, durationMs, ok, tags);
      },
      trackPipelineResult: function(resultType: string, durationMs: number, tags?: Record<string, string | number | boolean>) {
        return trackPipelineResultRef.current(resultType, durationMs, tags);
      },
      trackError: function(error: Error | string, tags?: Record<string, string | number | boolean>) {
        return trackErrorRef.current(error, tags);
      },
      trackPerformance: function(name: string, valueMs: number, tags?: Record<string, string | number | boolean>) {
        return trackPerformanceRef.current(name, valueMs, tags);
      },
    };
  }, []);
}
