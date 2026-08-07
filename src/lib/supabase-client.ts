/**
 * M4 Client-side Supabase Client
 *
 * 职责：为浏览器端提供 Supabase 客户端实例。
 * 使用 anon key（可安全暴露在客户端），仅执行 auth 和基础查询。
 * 服务端写操作仍走 /api/* 路由（使用 service_role_key）。
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
} else {
  console.log("[Supabase] client initialized", { url: supabaseUrl, hasKey: !!supabaseAnonKey });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
