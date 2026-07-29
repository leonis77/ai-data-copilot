import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ApiErrorCode, apiError } from "@/lib/errors";

// ═══ POST /api/auth/register ═══
// 创建 Supabase Auth 用户（需要 Supabase Auth 配置）

export async function POST(request: NextRequest) {
  // 限流：注册接口 1 分钟 5 次
  const rateResult = applyRateLimit(request, { strategy: "auth" });
  if (!rateResult.allowed) {
    return rateLimitResponse(rateResult);
  }

  try {
    const body = await request.json().catch(function () { return null; });
    if (!body || typeof body !== "object") {
      return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "请求体必须是 JSON"), { status: 400 });
    }

    const email = String(body.email || "").trim();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(apiError(ApiErrorCode.VALIDATION_FAILED, "email 和 password 不能为空"), { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(apiError(ApiErrorCode.VALIDATION_FAILED, "密码至少 8 位"), { status: 400 });
    }

    // 使用 Supabase Admin API 创建用户（需要 service_role key）
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        apiError(ApiErrorCode.INTERNAL, "Supabase 未配置，无法注册", { recoverable: false }),
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自动确认，演示用
    });

    if (error) {
      return NextResponse.json(apiError(ApiErrorCode.AUTH_FAILED, error.message), { status: 400 });
    }

    // 创建用户 profile
    await adminClient.from("profiles").insert({
      id: data.user.id,
      email,
      role: "user",
      created_at: new Date().toISOString(),
    }).catch(function (e) {
      // profile 创建失败不影响注册流程
      console.warn("Profile creation failed:", e);
    });

    return NextResponse.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (error) {
    return NextResponse.json(
      apiError(ApiErrorCode.INTERNAL, "注册失败", { message: String(error) }),
      { status: 500 }
    );
  }
}
