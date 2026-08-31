/**
 * Rate Limiter 单测
 *
 * 覆盖：
 * - checkRateLimitSync 基本限流逻辑（同步内存限流）
 * - checkRateLimit 异步限流逻辑（Upstash Redis + 降级）
 * - 滑动窗口重置
 * - 多 IP 独立计数
 * - getRateLimitHeaders
 */

import { describe, it, expect } from "vitest";
import { checkRateLimit, checkRateLimitSync, getRateLimitHeaders, RATE_LIMITS, resetRateLimitStore } from "@/lib/rate-limit";

describe("checkRateLimitSync", () => {
  const config = { windowMs: 60_000, maxRequests: 3 };

  it("首次请求应允许", () => {
    const result = checkRateLimitSync("192.168.1.1", config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("达到上限后应拒绝", () => {
    const ip = "192.168.1.2";
    checkRateLimitSync(ip, config);
    checkRateLimitSync(ip, config);
    checkRateLimitSync(ip, config);
    const result = checkRateLimitSync(ip, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("不同 IP 应独立计数", () => {
    const ip1 = "192.168.1.3";
    const ip2 = "192.168.1.4";

    checkRateLimitSync(ip1, config);
    checkRateLimitSync(ip1, config);
    checkRateLimitSync(ip1, config);

    const result = checkRateLimitSync(ip2, config);
    expect(result.allowed).toBe(true);
  });

  it("窗口过期后应重置计数", async () => {
    const ip = "192.168.1.5";
    const shortConfig = { windowMs: 100, maxRequests: 2 };

    checkRateLimitSync(ip, shortConfig);
    checkRateLimitSync(ip, shortConfig);
    const blocked = checkRateLimitSync(ip, shortConfig);
    expect(blocked.allowed).toBe(false);

    await new Promise(function (resolve) { setTimeout(resolve, 150); });
    const afterReset = checkRateLimitSync(ip, shortConfig);
    expect(afterReset.allowed).toBe(true);
  });

  it("remaining 应随请求递减", () => {
    const ip = "192.168.1.6";
    const cfg = { windowMs: 60_000, maxRequests: 5 };

    const r1 = checkRateLimitSync(ip, cfg);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimitSync(ip, cfg);
    expect(r2.remaining).toBe(3);
  });
});

describe("checkRateLimit (async)", () => {
  it("首次请求应允许（降级为内存限流）", async () => {
    resetRateLimitStore();
    const result = await checkRateLimit("192.168.1.10", { windowMs: 60_000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("达到上限后应拒绝（降级为内存限流）", async () => {
    const ip = "192.168.1.11";
    await checkRateLimit(ip, { windowMs: 60_000, maxRequests: 3 });
    await checkRateLimit(ip, { windowMs: 60_000, maxRequests: 3 });
    await checkRateLimit(ip, { windowMs: 60_000, maxRequests: 3 });
    const result = await checkRateLimit(ip, { windowMs: 60_000, maxRequests: 3 });
    expect(result.allowed).toBe(false);
  });
});

describe("RATE_LIMITS", () => {
  it("应包含 5 种策略", () => {
    expect(Object.keys(RATE_LIMITS)).toHaveLength(5);
    expect(RATE_LIMITS.default).toBeDefined();
    expect(RATE_LIMITS.agent).toBeDefined();
    expect(RATE_LIMITS.auth).toBeDefined();
    expect(RATE_LIMITS.upload).toBeDefined();
    expect(RATE_LIMITS.loop).toBeDefined();
  });

  it("agent 策略应更严格", () => {
    expect(RATE_LIMITS.agent.maxRequests).toBeLessThan(RATE_LIMITS.default.maxRequests);
  });

  it("upload 策略应最严格", () => {
    expect(RATE_LIMITS.upload.maxRequests).toBeLessThanOrEqual(RATE_LIMITS.auth.maxRequests);
  });
});

describe("getRateLimitHeaders", () => {
  it("应返回正确的限流头", () => {
    const result = {
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60_000,
    };
    const headers = getRateLimitHeaders(result);
    expect(headers["X-RateLimit-Remaining"]).toBe("5");
    expect(headers["X-RateLimit-Reset"]).toBeTruthy();
  });

  it("被拒绝时应包含 Retry-After", () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfterMs: 30_000,
    };
    const headers = getRateLimitHeaders(result);
    expect(headers["Retry-After"]).toBeTruthy();
  });
});

describe("resetRateLimitStore", () => {
  it("清空后同一 IP 应重新获得配额", () => {
    const ip = "10.0.0.1";
    const cfg = RATE_LIMITS.auth;

    checkRateLimitSync(ip, cfg);
    checkRateLimitSync(ip, cfg);
    expect(checkRateLimitSync(ip, cfg).allowed).toBe(true);

    resetRateLimitStore();
    const afterReset = checkRateLimitSync(ip, cfg);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(cfg.maxRequests - 1);
  });
});
