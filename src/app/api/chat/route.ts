export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import { chatWithData } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = body.messages || [];
    const dataContext = body.dataContext || "暂无数据上下文。";

    if (messages.length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    const reply = await chatWithData(dataContext, messages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { reply: "抱歉，AI 服务暂时不可用，请稍后重试。" }
    );
  }
}