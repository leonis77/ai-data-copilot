/**
 * Rate Limiter 单测
 *
 * 覆盖：
 * - checkRateLimit 基本限流逻辑
 * - 滑动窗口重置
 * - 多 IP 独立计数
 * - getRateLimitHeaders
 */

import { describe, it, expect } from "vitest";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS, resetRateLimitStore } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  const config = { windowMs: 60_000, maxRequests: 3 };

  it("首次请求应允许", () => {
    const result = checkRateLimit("192.168.1.1", config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("达到上限后应拒绝", () => {
    const ip = "192.168.1.2";
    // 前 3 次允许
    checkRateLimit(ip, config);
    checkRateLimit(ip, config);
    checkRateLimit(ip, config);
    // 第 4 次拒绝
    const result = checkRateLimit(ip, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("不同 IP 应独立计数", () => {
    const ip1 = "192.168.1.3";
    const ip2 = "192.168.1.4";

    // 用完 ip1
    checkRateLimit(ip1, config);
    checkRateLimit(ip1, config);
    checkRateLimit(ip1, config);

    // ip2 应该还能请求
    const result = checkRateLimit(ip2, config);
    expect(result.allowed).toBe(true);
  });

  it("窗口过期后应重置计数", async () => {
    const ip = "192.168.1.5";
    const shortConfig = { windowMs: 100, maxRequests: 2 };

    checkRateLimit(ip, shortConfig);
    checkRateLimit(ip, shortConfig);
    // 第 3 次应拒绝
    const blocked = checkRateLimit(ip, shortConfig);
    expect(blocked.allowed).toBe(false);

    // 等待窗口过期
    await new Promise(function (resolve) { setTimeout(resolve, 150); });
    const afterReset = checkRateLimit(ip, shortConfig);
    expect(afterReset.allowed).toBe(true);
  });

  it("remaining 应随请求递减", () => {
    const ip = "192.168.1.6";
    const cfg = { windowMs: 60_000, maxRequests: 5 };

    const r1 = checkRateLimit(ip, cfg);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(ip, cfg);
    expect(r2.remaining).toBe(3);
  });
});

describe("RATE_LIMITS", () => {
  it("应包含 4 种策略", () => {
    expect(Object.keys(RATE_LIMITS)).toHaveLength(4);
    expect(RATE_LIMITS.default).toBeDefined();
    expect(RATE_LIMITS.agent).toBeDefined();
    expect(RATE_LIMITS.auth).toBeDefined();
    expect(RATE_LIMITS.upload).toBeDefined();
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

    checkRateLimit(ip, cfg);
    checkRateLimit(ip, cfg);
    expect(checkRateLimit(ip, cfg).allowed).toBe(true);

    resetRateLimitStore();
    const afterReset = checkRateLimit(ip, cfg);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(cfg.maxRequests - 1);
  });
});
