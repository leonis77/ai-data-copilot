/**
 * POST /api/auth/login 单测
 *
 * 覆盖：
 * - 非法 JSON / 非法 body / 校验失败返回 400
 * - Supabase 未配置返回 500
 * - 密码错误返回 401
 * - 合法登录返回 session
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignInWithPassword = vi.hoisted(function () {
  return vi.fn();
});

vi.mock("@supabase/supabase-js", function () {
  return {
    createClient: function () {
      return {
        auth: {
          signInWithPassword: mockSignInWithPassword,
        },
      };
    },
  };
});

import { POST } from "@/app/api/auth/login/route";
import { resetRateLimitStore } from "@/lib/rate-limit";

function createRequest(body: any, ip = "127.0.0.1") {
  return {
    json: async () => body,
    headers: {
      get: function () { return null; },
    },
    ip,
    method: "POST",
    nextUrl: { pathname: "/api/auth/login" },
  } as any;
}

describe("POST /api/auth/login", () => {
  beforeEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockSignInWithPassword.mockReset();
    resetRateLimitStore();
  });

  it("非法 body 类型应返回 400", async () => {
    const request = createRequest(null) as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_BODY");
  });

  it("缺少必填字段应返回 400", async () => {
    const request = createRequest({ email: "a@b.com" }, "ip-2") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_FAILED");
  });

  it("Supabase 未配置时应返回 500", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const request = createRequest({ email: "a@b.com", password: "abc12345" }, "ip-3") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL");
  });

  it("密码错误时应返回 401", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });

    const request = createRequest({ email: "a@b.com", password: "wrongpass123" }, "ip-4") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error.code).toBe("AUTH_FAILED");
  });

  it("合法登录应返回 session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
        },
        user: { id: "user-1", email: "a@b.com" },
      },
      error: null,
    });

    const request = createRequest({ email: "a@b.com", password: "abc12345" }, "ip-5") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.session.access_token).toBe("access-token");
    expect(data.session.user.email).toBe("a@b.com");
  });
});
