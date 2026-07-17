/**
 * M2 Unified Error Handling — API error envelope
 *
 * 职责：为所有 API route 提供统一的错误/成功响应格式，
 * 避免每个 route 手写 `{ error: "..." }` 或 `{ reply: "..." }`。
 *
 * 设计原则：
 * - 成功响应保持原样，不强行包装成 `{ ok: true, data }`，避免破坏现有前端
 * - 错误响应统一为 `{ error: { code, message, recoverable?, details? } }`
 * - 错误码可枚举、可搜索、可国际化
 * - recoverable 告诉前端是否值得重试
 */

// ═══ Error codes ═══

export const ApiErrorCode = {
  // 客户端输入问题
  INVALID_BODY: "INVALID_BODY",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  MISSING_FIELD: "MISSING_FIELD",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",

  // 数据问题
  DATASET_NOT_FOUND: "DATASET_NOT_FOUND",
  DATASET_EMPTY: "DATASET_EMPTY",
  DATASET_LIMIT_EXCEEDED: "DATASET_LIMIT_EXCEEDED",

  // 上游依赖
  SUPABASE_UNAVAILABLE: "SUPABASE_UNAVAILABLE",
  AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  LLM_TIMEOUT: "LLM_TIMEOUT",

  // Pipeline 内部
  PIPELINE_FAILED: "PIPELINE_FAILED",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  KNOWLEDGE_INJECTION_FAILED: "KNOWLEDGE_INJECTION_FAILED",

  // 系统错误
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];

// ═══ Error envelope ═══

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    recoverable: boolean;
    details?: unknown;
  };
}

// ═══ Helpers ═══

export function apiError(
  code: ApiErrorCode,
  message: string,
  opts: { recoverable?: boolean; details?: unknown } = {}
): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      recoverable: opts.recoverable ?? false,
      ...(opts.details !== undefined ? { details: opts.details } : {}),
    },
  };
}

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

// ═══ Zod error bridging ═══

export function zodErrorToDetails(error: unknown): unknown {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as any).issues || [];
    return issues.map(function (issue: any) {
      return {
        path: issue.path || [],
        message: issue.message || "invalid",
        code: issue.code,
      };
    });
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
