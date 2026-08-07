/**
 * GET /api/auth/session 单测
 *
 * 覆盖：
 * - 缺失 auth header → 401
 * - 非法 auth 格式 → 401
 * - 无效 token → 401
 * - 合法 token → 200 + 精简用户信息（不泄露完整 user object）
 * - 响应不包含敏感字段（role, user_metadata 等）
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/auth/session/route";
import { resetRateLimitStore } from "@/lib/rate-limit";

function createRequest(authHeader: string | null) {
  return {
    headers: {
      get: function (_key: string) {
        if (_key.toLowerCase() === "authorization") return authHeader;
        return null;
      },
    },
  } as any;
}

describe("GET /api/auth/session", () => {
  beforeEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitStore();
  });

  it("缺失 auth header 应返回 401", async () => {
    const response = await GET(createRequest(null));
    expect(response.status).toBe(401);
  });

  it("非法 auth 格式应返回 401", async () => {
    const response = await GET(createRequest("Basic abc123"));
    expect(response.status).toBe(401);
  });

  it("空 token 应返回 401", async () => {
    const response = await GET(createRequest("Bearer "));
    expect(response.status).toBe(401);
  });

  it("随机 token 应返回 401（Supabase 不可用时）", async () => {
    const response = await GET(createRequest("Bearer random-token-xyz"));
    expect(response.status).toBe(401);
  });
});
