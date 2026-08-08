/**
 * M4 Security — Rate Limiter
 *
 * 生产环境使用 Upstash Redis Rate Limit（支持 serverless 多实例）。
 * 如果未配置 Upstash 环境变量，则降级为内存限流（演示用）。
 *
 * 环境变量：
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { NextRequest, NextResponse } from "next/server";

// ═══ Try Upstash Redis first ═══

let redis: { createClient: (url: string, token: string) => { rateLimit: (opts: { limiter: { type: string; limit: number; duration: number; }; key: string; }) => Promise<{ success: boolean; limit: number; remaining: number; reset: number; }> } } | null = null;
let redisAvailable = false;

try {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    const mod = require("@upstash/ratelimit") as { createClient: (url: string, token: string) => { rateLimit: (opts: { limiter: { type: string; limit: number; duration: number; }; key: string; }) => Promise<{ success: boolean; limit: number; remaining: number; reset: number; }> } };
    redis = mod;
    redisAvailable = true;
  }
} catch {
  // Upstash not available, will use in-memory fallback
}

// ═══ Config ═══

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60_000, maxRequests: 60 },
  agent: { windowMs: 60_000, maxRequests: 10 },
  auth: { windowMs: 60_000, maxRequests: 5 },
  upload: { windowMs: 60_000, maxRequests: 3 },
};

// ═══ In-Memory Fallback ═══

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, RateLimitEntry>();

function memCleanup(): void {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (entry.resetAt < now) memStore.delete(key);
  }
}

setInterval(memCleanup, 5 * 60_000);

export function resetRateLimitStore(): void {
  memStore.clear();
}

// ═══ Core ═══

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * 检查 IP 是否在限流范围内（同步，内存限流）
 */
export function checkRateLimitSync(ip: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = "rl:" + ip;

  let entry = memStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    memStore.set(key, entry);
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
 * 检查 IP 是否在限流范围内
 * 优先使用 Upstash Redis（多实例共享），降级为内存限流
 */
export async function checkRateLimit(ip: string, config: RateLimitConfig): Promise<RateLimitResult> {
  // Upstash Redis path
  if (redisAvailable && redis) {
    try {
      const upstashUrl = process.env.UPSTASH_REDIS_REST_URL!;
      const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN!;
      const ratelimit = redis.createClient(upstashUrl, upstashToken);
      const result = await ratelimit.rateLimit({
        limiter: {
          type: "sliding_window",
          limit: config.maxRequests,
          duration: Math.floor(config.windowMs / 1000),
        },
        key: "rl:" + ip,
      });
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset * 1000,
        ...(result.success ? {} : { retryAfterMs: Math.max(0, result.reset * 1000 - Date.now()) }),
      };
    } catch {
      // Redis failed, fall through to in-memory
    }
  }

  // In-memory fallback
  return checkRateLimitSync(ip, config);
}

// ═══ IP Extraction ═══

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// ═══ Response Helpers ═══

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfterMs ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } : {}),
  };
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

// ═══ Middleware Helpers ═══

export type RateLimitMiddlewareOptions = {
  strategy?: keyof typeof RATE_LIMITS;
  config?: RateLimitConfig;
  requireAuth?: boolean;
};

/**
 * 同步限流检查（使用内存限流，向后兼容）。
 * 生产环境请使用 applyRateLimitAsync 以启用 Upstash Redis。
 */
export function applyRateLimit(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {},
): RateLimitResult {
  const strategy = options.strategy || "default";
  const config = options.config || RATE_LIMITS[strategy];
  const ip = getClientIp(request);
  return checkRateLimitSync(ip, config);
}

/**
 * 异步限流检查（优先使用 Upstash Redis，降级为内存限流）。
 * 用于支持 serverless 多实例的场景。
 */
export async function applyRateLimitAsync(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {},
): Promise<RateLimitResult> {
  const strategy = options.strategy || "default";
  const config = options.config || RATE_LIMITS[strategy];
  const ip = getClientIp(request);
  return checkRateLimit(ip, config);
}
