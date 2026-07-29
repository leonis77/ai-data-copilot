/**
 * M4 Security — Supabase Auth Helper
 *
 * 提供：
 * - 验证 JWT token
 * - 获取当前用户
 * - 密码哈希/验证（注册时使用）
 *
 * 注意：这是最小可行 Auth 实现，用于演示和后续扩展。
 * 生产环境应使用 Supabase Auth 的完整 SDK + RLS。
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    supabase = createClient(url, key);
  }
  return supabase;
}

// ═══════════════════════════════════════════════
// Token 验证
// ═══════════════════════════════════════════════

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * 从 Authorization header 提取并验证用户
 */
export async function authenticateRequest(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader) {
    return { ok: false, error: "missing_auth_header" };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, error: "invalid_auth_format" };
  }

  const token = match[1];
  try {
    const client = getClient();
    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      logger.warn("Auth token invalid", { error: error?.message });
      return { ok: false, error: "invalid_token" };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email || "",
        role: data.user.role || "authenticated",
      },
    };
  } catch (e: any) {
    logger.error("Auth verification failed", { message: e.message });
    return { ok: false, error: "auth_service_error" };
  }
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const client = getClient();
    const { data } = await client.from("profiles").select("role").eq("id", userId).single();
    return data?.role === "admin";
  } catch {
    return false;
  }
}
