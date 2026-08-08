import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ApiErrorCode, apiError } from "@/lib/errors";
import { validateLoginRequest } from "@/lib/schemas";

// ═══ POST /api/auth/login ═══

export async function POST(request: NextRequest) {
  const rateResult = applyRateLimit(request, { strategy: "auth" });
  if (!rateResult.allowed) {
    return rateLimitResponse(rateResult);
  }

  try {
    const raw = await request.json().catch(function () { return null; });
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "请求体必须是 JSON"), { status: 400 });
    }

    let body: { email: string; password: string };
    try {
      body = validateLoginRequest(raw);
    } catch (e: any) {
      return NextResponse.json(apiError(ApiErrorCode.VALIDATION_FAILED, e?.message || "参数校验失败"), { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        apiError(ApiErrorCode.INTERNAL, "Supabase 未配置，无法登录", { recoverable: false, details: "missing SUPABASE_URL or SUPABASE_ANON_KEY" }),
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session) {
      return NextResponse.json(apiError(ApiErrorCode.AUTH_FAILED, "邮箱或密码错误"), { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: { id: data.user.id, email: data.user.email },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(apiError(ApiErrorCode.VALIDATION_FAILED, "参数校验失败"), { status: 400 });
    }
    return NextResponse.json(
      apiError(ApiErrorCode.INTERNAL, "登录失败，请稍后重试"),
      { status: 500 }
    );
  }
}
