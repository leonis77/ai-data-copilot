/**
 * Auth Helper 单测
 *
 * 覆盖：
 * - authenticateRequest 对合法/非法/缺失 token 的处理
 * - isAdmin 在 Supabase 不可用时的降级行为
 */

import { describe, it, expect } from "vitest";
import { authenticateRequest, isAdmin } from "@/lib/auth";

describe("authenticateRequest", () => {
  it("缺失 auth header 应返回失败", async () => {
    const result = await authenticateRequest(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_auth_header");
  });

  it("非法格式应返回失败", async () => {
    const result = await authenticateRequest("Basic abc123");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_auth_format");
  });

  it("空 token 应返回失败", async () => {
    const result = await authenticateRequest("Bearer ");
    expect(result.ok).toBe(false);
    // "Bearer " 没有 token 内容，正则不匹配 → invalid_auth_format
    expect(result.error).toBe("invalid_auth_format");
  });

  it("随机 token 应返回失败（Supabase 不可用时）", async () => {
    const result = await authenticateRequest("Bearer random_token_12345");
    // Supabase 可能返回 invalid_token 或 auth_service_error
    expect(result.ok).toBe(false);
  });
});

describe("isAdmin", () => {
  it("Supabase 不可用时应返回 false", async () => {
    const result = await isAdmin("any_user_id");
    expect(result).toBe(false);
  });
});
