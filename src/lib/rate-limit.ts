/**
 * M4 Security — 简单内存限流器
 *
 * 用于演示目的的最小限流实现。
 * 生产环境应替换为 Upstash Redis Rate Limit 或类似方案。
 *
 * 策略：
 * - 每个 IP 独立计数
 * - 滑动窗口：windowMs 内最多 maxRequests 次请求
 * - 超出后返回 429 并附带 Retry-After
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp ms
}

// ═══════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════

export interface RateLimitConfig {
  /** 窗口大小（ms） */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

/** 预定义策略 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  /** 普通 API：1 分钟 60 次 */
  default: { windowMs: 60_000, maxRequests: 60 },
  /** Agent 分析：1 分钟 10 次（ heavier 计算） */
  agent: { windowMs: 60_000, maxRequests: 10 },
  /** Auth 接口：1 分钟 5 次（防暴力破解） */
  auth: { windowMs: 60_000, maxRequests: 5 },
  /** 上传接口：1 分钟 3 次（文件上传较重） */
  upload: { windowMs: 60_000, maxRequests: 3 },
};

// ═══════════════════════════════════════════════
// In-Memory Store
// ═══════════════════════════════════════════════

const store = new Map<string, RateLimitEntry>();

/** 清理过期条目（防止内存泄漏） */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// 每 5 分钟清理一次
setInterval(cleanup, 5 * 60_000);

/** 重置限流器状态（仅测试用） */
export function resetRateLimitStore(): void {
  store.clear();
}

// ═══════════════════════════════════════════════
// Core
// ═══════════════════════════════════════════════

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * 检查 IP 是否在限流范围内
 *
 * @param ip - 客户端 IP
 * @param config - 限流配置
 * @returns 限流结果
 */
export function checkRateLimit(ip: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = ip;

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: Math.max(0, entry.resetAt - now),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * 从 Next.js request 提取 IP
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * 限流响应头
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfterMs ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } : {}),
  };
}

// ═══════════════════════════════════════════════
// Next.js Middleware Helper
// ═══════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

export type RateLimitMiddlewareOptions = {
  /** 限流策略名 */
  strategy?: keyof typeof RATE_LIMITS;
  /** 自定义限流配置 */
  config?: RateLimitConfig;
  /** 是否要求认证 */
  requireAuth?: boolean;
};

/**
 * 应用限流中间件逻辑
 *
 * 用法：
 *   const result = applyRateLimit(request, { strategy: "agent" });
 *   if (!result.allowed) return rateLimitResponse(result);
 */
export function applyRateLimit(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {},
): RateLimitResult {
  const strategy = options.strategy || "default";
  const config = options.config || RATE_LIMITS[strategy];
  const ip = getClientIp(request);
  return checkRateLimit(ip, config);
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const body = {
    error: "rate_limit_exceeded",
    message: "请求过于频繁，请稍后重试",
    retryAfterMs: result.retryAfterMs,
  };
  return NextResponse.json(body, {
    status: 429,
    headers: getRateLimitHeaders(result),
  });
}
