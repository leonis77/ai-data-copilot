import { NextResponse } from "next/server";

export function apiHandler(fn: (req: Request, ctx?: any) => Promise<NextResponse>) {
  return async function(req: Request, ctx?: any) {
    try {
      return await fn(req, ctx);
    } catch (error: any) {
      console.error("[API]", error?.message || error);
      return NextResponse.json({
        error: error?.message || "服务异常",
      }, { status: error?.status || 500 });
    }
  };
}
