/**
 * M4 Authenticated Fetch Helper
 *
 * 职责：为前端 API 调用自动附加 Authorization header。
 * 从 Supabase session 中提取 access_token，
 * 如果 session 过期则静默刷新后重试。
 */

import { supabase } from "@/lib/supabase-client";

// 内存缓存：避免每次调用都 await getSession()
var cachedToken: string | null = null;
var cachedAt = 0;
const TOKEN_TTL_MS = 30_000; // 30 秒缓存

async function getCachedToken(): Promise<string | null> {
  var now = Date.now();
  if (cachedToken && now - cachedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    cachedToken = session?.access_token ?? null;
    cachedAt = now;
    return cachedToken;
  } catch {
    return null;
  }
}

function invalidateTokenCache(): void {
  cachedToken = null;
  cachedAt = 0;
}

/**
 * 获取当前有效的 access token。
 * 如果 session 过期，尝试静默刷新。
 */
export async function getAuthToken(): Promise<string | null> {
  return getCachedToken();
}

/**
 * 发起带认证的 fetch 请求。
 * 自动附加 `Authorization: Bearer <token>` header。
 * 如果收到 401，自动尝试刷新 session 后重试一次。
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  var token = await getCachedToken();

  var headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", "Bearer " + token);
  }
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  var response = await fetch(input, {
    ...init,
    headers,
  });

  // 401 → try refresh and retry once
  if (response.status === 401) {
    invalidateTokenCache();
    try {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        token = await getCachedToken();
        if (token) {
          headers.set("Authorization", "Bearer " + token);
          response = await fetch(input, {
            ...init,
            headers,
          });
        }
      }
    } catch {
      // Refresh failed, return original 401
    }
  }

  return response;
}

/**
 * 主动使 token 缓存失效（如登出时调用）。
 */
export function invalidateAuthTokenCache(): void {
  invalidateTokenCache();
}

/**
 * 发起带认证的 fetch 请求并解析 JSON。
 * 便捷包装，自动处理 JSON 解析。
 */
export async function authFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<{ data: T | null; response: Response }> {
  const response = await authFetch(input, init);
  let data: T | null = null;
  try {
    data = await response.json();
  } catch { /* not json */ }
  return { data, response };
}
