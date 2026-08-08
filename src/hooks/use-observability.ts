"use client";

import { useEffect, useRef, useCallback } from "react";
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

export function useObservability() {
  const pageViewTracked = useRef(false);

  const trackPageView = useCallback(function(pageName: string, tags?: Record<string, string | number | boolean>) {
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    trackMetric("page_view", pageName, undefined, tags);
  }, []);

  const trackApiCall = useCallback(function(route: string, durationMs: number, ok: boolean, tags?: Record<string, string | number | boolean>) {
    trackMetric("api_call", route, durationMs, Object.assign({ ok }, tags || {}));
  }, []);

  const trackPipelineResult = useCallback(function(resultType: string, durationMs: number, tags?: Record<string, string | number | boolean>) {
    trackMetric("pipeline_result", resultType, durationMs, tags);
  }, []);

  const trackError = useCallback(function(error: Error | string, tags?: Record<string, string | number | boolean>) {
    trackMetric("error", error instanceof Error ? error.message : error, undefined, tags);
  }, []);

  const trackPerformance = useCallback(function(name: string, valueMs: number, tags?: Record<string, string | number | boolean>) {
    trackMetric("performance", name, valueMs, tags);
  }, []);

  useEffect(function() {
    return function() {
      if (flushTimer) clearInterval(flushTimer);
      flush();
    };
  }, []);

  return {
    trackPageView,
    trackApiCall,
    trackPipelineResult,
    trackError,
    trackPerformance,
  };
}
