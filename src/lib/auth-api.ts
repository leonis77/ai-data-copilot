/**
 * M4 Auth API Helpers
 *
 * 职责：为服务端 API 路由提供统一的 auth 守卫和错误响应。
 * 使用 authenticateRequest 验证 Bearer token，验证失败返回 401。
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { ApiErrorCode, apiError } from "@/lib/errors";

/**
 * 验证请求的 Bearer token，验证失败返回 NextResponse (401)。
 * 验证成功返回 AuthUser。
 *
 * 用法：
 *   const auth = await requireAuth(request);
 *   // auth.user.id, auth.user.email 可用
 */
export async function requireAuth(request: NextRequest): Promise<
  | { ok: true; user: { id: string; email: string; role?: string } }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization");
  const result = await authenticateRequest(authHeader);

  if (!result.ok || !result.user) {
    return {
      ok: false,
      response: NextResponse.json(
        apiError(ApiErrorCode.AUTH_FAILED, "未授权访问，请先登录", { recoverable: true }),
        { status: 401 }
      ),
    };
  }

  return { ok: true, user: result.user };
}

/**
 * 可选认证：验证 token 但不过度拦截。
 * 返回 user 或 null（未登录时）。
 */
export async function optionalAuth(request: NextRequest): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const result = await authenticateRequest(authHeader);
  if (!result.ok || !result.user) return null;
  return { id: result.user.id, email: result.user.email };
}
