export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import { analyzeData } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dataSummary = body.dataSummary || "";
    const question = body.question || "";

    if (!dataSummary) {
      return NextResponse.json({ error: "请提供数据摘要" }, { status: 400 });
    }

    const result = await analyzeData(dataSummary, question);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 }
    );
  }
}