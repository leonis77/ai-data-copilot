/**
 * M2 Unified Error Handling — client-side error parsing
 *
 * 职责：让前端统一解析 API 错误，而不是每个页面各自判断 `error?.message` 或 `data?.error`。
 */

import type { ApiErrorEnvelope } from "@/lib/errors/api-error";

export interface AppApiError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: unknown;
}

export function parseApiError(input: unknown): AppApiError | null {
  if (!input || typeof input !== "object") return null;
  const env = input as Partial<ApiErrorEnvelope>;
  if (!env.error || typeof env.error !== "object") return null;
  const e = env.error;
  return {
    code: typeof e.code === "string" ? e.code : "UNKNOWN_ERROR",
    message: typeof e.message === "string" ? e.message : "未知错误",
    recoverable: typeof e.recoverable === "boolean" ? e.recoverable : false,
    ...(e.details !== undefined ? { details: e.details } : {}),
  };
}

export function isAppApiError(input: unknown): input is { error: AppApiError } {
  return parseApiError(input) !== null;
}
