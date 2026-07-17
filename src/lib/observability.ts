/**
 * ProcureWise Observability Layer v1.0
 *
 * 目标：在保持现有 logger 接口不变的前提下，增加：
 * 1. 结构化日志字段自动注入（requestId、datasetId、platform）
 * 2. 性能计时器（pipelineLatency、API call duration）
 * 3. 关键指标计数（成功/失败/降级次数）
 * 4. 前端埋点钩子（useObservability）
 */

import { logger } from "./logger";
import type { Level } from "./logger";

// ═══════════════════════════════════════════════
// Structured context（自动注入到每条日志）
// ═══════════════════════════════════════════════

let structuredContext: Record<string, unknown> = {};

export function setStructuredContext(ctx: Record<string, unknown>): void {
  structuredContext = Object.assign({}, structuredContext, ctx);
}

export function clearStructuredContext(): void {
  structuredContext = {};
}

function mergeContext(data?: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return structuredContext;
  if (Array.isArray(data)) return structuredContext;
  return Object.assign({}, structuredContext, data as Record<string, unknown>);
}

// ═══════════════════════════════════════════════
// Timing helpers
// ═══════════════════════════════════════════════

interface Timer {
  name: string;
  startTime: number;
  context?: Record<string, unknown>;
}

const timers = new Map<string, Timer>();

export function startTimer(name: string, context?: Record<string, unknown>): string {
  const id = "timer_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  timers.set(id, { name, startTime: Date.now(), context });
  return id;
}

export function endTimer(id: string, level: Level = "info"): number | null {
  const timer = timers.get(id);
  if (!timer) return null;
  const duration = Date.now() - timer.startTime;
  timers.delete(id);
  logger.info("timer:" + timer.name, Object.assign({ durationMs: duration }, timer.context, structuredContext));
  return duration;
}

// ═══════════════════════════════════════════════
// Metrics counters
// ═══════════════════════════════════════════════

interface Metrics {
  pipeline: {
    success: number;
    insufficient_data: number;
    fallback: number;
    error: number;
  };
  api: {
    agent: { success: number; error: number };
    upload: { success: number; error: number };
    loop: { success: number; error: number };
  };
  knowledge: {
    injectionSuccess: number;
    injectionFailed: number;
    webSearchTriggered: number;
  };
}

const metrics: Metrics = {
  pipeline: { success: 0, insufficient_data: 0, fallback: 0, error: 0 },
  api: { agent: { success: 0, error: 0 }, upload: { success: 0, error: 0 }, loop: { success: 0, error: 0 } },
  knowledge: { injectionSuccess: 0, injectionFailed: 0, webSearchTriggered: 0 },
};

export function incrementMetric(path: string, value = 1): void {
  const parts = path.split(".");
  if (parts.length < 2) return;
  const section = parts[0] as keyof Metrics;
  const key = parts[1] as string;
  const target = (metrics as any)[section];
  if (target && typeof target === "object" && key in target) {
    target[key] = (target[key] || 0) + value;
  }
}

export function getMetrics(): Metrics {
  return JSON.parse(JSON.stringify(metrics));
}

export function resetMetrics(): void {
  metrics.pipeline = { success: 0, insufficient_data: 0, fallback: 0, error: 0 };
  metrics.api = { agent: { success: 0, error: 0 }, upload: { success: 0, error: 0 }, loop: { success: 0, error: 0 } };
  metrics.knowledge = { injectionSuccess: 0, injectionFailed: 0, webSearchTriggered: 0 };
}

// ═══════════════════════════════════════════════
// Enhanced log wrappers（自动注入 context）
// ═══════════════════════════════════════════════

export function logWithContext(level: Level, msg: string, data?: unknown): void {
  if (level === "error") logger.error(msg, mergeContext(data));
  else if (level === "warn") logger.warn(msg, mergeContext(data));
  else if (level === "info") logger.info(msg, mergeContext(data));
  else logger.debug(msg, mergeContext(data));
}

export function debug(msg: string, data?: unknown): void { logWithContext("debug", msg, data); }
export function info(msg: string, data?: unknown): void { logWithContext("info", msg, data); }
export function warn(msg: string, data?: unknown): void { logWithContext("warn", msg, data); }
export function error(msg: string, data?: unknown): void { logWithContext("error", msg, data); }

// ═══════════════════════════════════════════════
// Specialized log helpers
// ═══════════════════════════════════════════════

export function logPipelineResult(type: "decision_chain" | "insufficient_data" | "fallback_agent" | "agent_error", durationMs: number, data?: Record<string, unknown>): void {
  incrementMetric("pipeline." + (type === "decision_chain" ? "success" : type === "insufficient_data" ? "insufficient_data" : type === "fallback_agent" ? "fallback" : "error"));
  info("pipeline.result", Object.assign({ type, durationMs }, data || {}, structuredContext));
}

export function logApiCall(route: string, ok: boolean, data?: Record<string, unknown>): void {
  const path = route.startsWith("/api/agent") ? "agent" : route.startsWith("/api/upload") ? "upload" : route.startsWith("/api/loop") ? "loop" : route;
  incrementMetric("api." + path + "." + (ok ? "success" : "error"));
  info("api.call", Object.assign({ route, ok }, data || {}, structuredContext));
}

export function logKnowledgeInjection(success: boolean, webSearchTriggered = false): void {
  if (success) {
    incrementMetric("knowledge.injectionSuccess");
  } else {
    incrementMetric("knowledge.injectionFailed");
  }
  if (webSearchTriggered) {
    incrementMetric("knowledge.webSearchTriggered");
  }
  info("knowledge.injection", Object.assign({ success, webSearchTriggered }, structuredContext));
}
