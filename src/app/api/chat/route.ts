import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, saveChatMessage } from "@/lib/db";
import { getLatestFromServerStore } from "@/lib/server-store";
import { chatWithData } from "@/lib/ai";
import { computeStats } from "@/lib/parser";
import { ApiErrorCode, apiError } from "@/lib/errors";
import { logger, withRequestId } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const rid = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  return withRequestId(rid, async function () {
    try {
      const body = await request.json().catch(function () { return {}; });
      const messages = Array.isArray(body.messages) ? body.messages : [];

      if (messages.length === 0) {
        return NextResponse.json(apiError(ApiErrorCode.MISSING_FIELD, "消息不能为空", { recoverable: true }), { status: 400 });
      }

      const ds = await getLatestDataset();
      const fallbackDs = ds || getLatestFromServerStore();
      if (!fallbackDs) {
        return NextResponse.json({ reply: "请先上传数据文件，我才能帮你分析。" });
      }

      const columns = fallbackDs.columns;
      const rows = fallbackDs.rows;
      const stats = computeStats(rows, columns);

      let dataContext = `数据集: ${(fallbackDs as any).original_name || (fallbackDs as any).originalName}\n`;
      dataContext += `共 ${stats.rowCount} 条记录, ${stats.columnCount} 个字段\n\n`;

      for (const [col, s] of Object.entries(stats.stats).slice(0, 5)) {
        dataContext += `${col}: 平均 ${s.avg.toFixed(2)}, 最小 ${s.min}, 最大 ${s.max}, 共 ${s.count} 条\n`;
      }

      for (const [col, dist] of Object.entries(stats.distributions).slice(0, 3)) {
        const top5 = Object.entries(dist).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(", ");
        dataContext += `${col} 分布: ${top5}\n`;
      }

      const reply = await chatWithData(dataContext, messages);

      saveChatMessage(fallbackDs.id, "user", messages[messages.length - 1].content);
      saveChatMessage(fallbackDs.id, "assistant", reply);

      return NextResponse.json({ reply });
    } catch (error) {
      logger.error("Chat API failed", { requestId: rid, message: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        apiError(ApiErrorCode.AI_SERVICE_UNAVAILABLE, "抱歉，AI 服务暂时不可用，请稍后重试。", { recoverable: true }),
        { status: 500 }
      );
    }
  });
}