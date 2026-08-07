import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// ═══ GET /api/auth/session ═══
// 验证当前 token 是否有效，返回用户信息

export async function GET(request: NextRequest) {
  const rateResult = applyRateLimit(request, { strategy: "auth" });
  if (!rateResult.allowed) {
    return rateLimitResponse(rateResult);
  }

  const authHeader = request.headers.get("authorization");
  const result = await authenticateRequest(authHeader);

  if (!result.ok || !result.user) {
    return NextResponse.json({ authenticated: false, error: result.error || "未授权" }, { status: 401 });
  }

  // 精简返回：只返回必要字段，不泄露完整 user object
  return NextResponse.json({
    authenticated: true,
    user: {
      id: result.user.id,
      email: result.user.email,
    },
  });
}
