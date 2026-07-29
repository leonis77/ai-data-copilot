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

  if (!result.ok) {
    return NextResponse.json({ authenticated: false, error: result.error }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: result.user,
  });
}
