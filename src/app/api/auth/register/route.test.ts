/**
 * POST /api/auth/register 单测
 *
 * 覆盖：
 * - 非法 JSON / 非法 body / 校验失败返回 400
 * - Supabase 未配置返回 500
 * - Supabase 返回错误时应返回 400
 * - 合法注册应返回用户信息
 * - 提供 name 时应写入 user_metadata
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateUser = vi.hoisted(function () {
  return vi.fn();
});

const mockFromInsert = vi.hoisted(function () {
  return vi.fn().mockResolvedValue({ error: null });
});

vi.mock("@supabase/supabase-js", function () {
  return {
    createClient: function () {
      return {
        auth: {
          admin: {
            createUser: mockCreateUser,
          },
        },
        from: function () {
          return {
            insert: mockFromInsert,
          };
        },
      };
    },
  };
});

import { POST } from "@/app/api/auth/register/route";
import { resetRateLimitStore } from "@/lib/rate-limit";

function createRequest(body: any, ip = "127.0.0.1") {
  return {
    json: async () => body,
    headers: {
      get: function () { return null; },
    },
    ip,
    method: "POST",
    nextUrl: { pathname: "/api/auth/register" },
  } as any;
}

describe("POST /api/auth/register", () => {
  beforeEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockCreateUser.mockReset();
    mockFromInsert.mockReset();
    mockFromInsert.mockResolvedValue({ error: null });
    resetRateLimitStore();
  });

  it("非法 body 类型应返回 400", async () => {
    const request = createRequest(null, "ip-reg-1") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_BODY");
  });

  it("缺少必填字段应返回 400", async () => {
    const request = createRequest({ email: "a@b.com" }, "ip-reg-2") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_FAILED");
  });

  it("Supabase 未配置时应返回 500", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const request = createRequest({ email: "a@b.com", password: "abc12345" }, "ip-reg-3") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL");
  });

  it("Supabase 返回错误时应返回 400", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");

    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const request = createRequest({ email: "a@b.com", password: "abc12345" }, "ip-reg-4") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.code).toBe("AUTH_FAILED");
  });

  it("合法注册应返回用户信息", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "a@b.com" } },
      error: null,
    });

    const request = createRequest({ email: "a@b.com", password: "abc12345", name: "Zhang San" }, "ip-reg-5") as any;
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user.id).toBe("user-1");
    expect(data.user.email).toBe("a@b.com");
  });

  it("提供 name 时应写入 user_metadata", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "a@b.com" } },
      error: null,
    });

    const request = createRequest({ email: "a@b.com", password: "abc12345", name: "Zhang San" }, "ip-reg-6") as any;
    await POST(request);

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "abc12345",
      email_confirm: true,
      user_metadata: { full_name: "Zhang San" },
    });
  });
});
