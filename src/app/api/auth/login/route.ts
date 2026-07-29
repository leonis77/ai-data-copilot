import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ApiErrorCode, apiError } from "@/lib/errors";

// ═══ POST /api/auth/login ═══

export async function POST(request: NextRequest) {
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

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        apiError(ApiErrorCode.INTERNAL, "Supabase 未配置，无法登录", { recoverable: false, details: "missing SUPABASE_URL or SUPABASE_ANON_KEY" }),
        { status: 500 }
      );
    }

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.signInWithPassword({ email, password });

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
    return NextResponse.json(
      apiError(ApiErrorCode.INTERNAL, "登录失败", { details: String(error) }),
      { status: 500 }
    );
  }
}
