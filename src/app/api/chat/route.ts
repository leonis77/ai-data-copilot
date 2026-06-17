import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, saveChatMessage } from "@/lib/db";
import { chatWithData } from "@/lib/ai";
import { computeStats } from "@/lib/parser";
import { injectRAG } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    var body = await request.json();
    var messages = body.messages || [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    var ds = await getLatestDataset();
    if (!ds) {
      return NextResponse.json({ reply: "请先上传数据文件，我才能帮你分析。" });
    }

    var columns = ds.columns;
    var rows = ds.rows;
    var stats = computeStats(rows, columns);

    var dataContext = "数据集: " + ds.originalName + "\n";
    dataContext += "共 " + stats.rowCount + " 条记录, " + stats.columnCount + " 个字段\n\n";

    var statEntries = Object.entries(stats.stats).slice(0, 5);
    for (var i = 0; i < statEntries.length; i++) {
      var col = statEntries[i][0], s = statEntries[i][1];
      dataContext += col + ": 平均 " + s.avg.toFixed(2) + ", 最小 " + s.min + ", 最大 " + s.max + ", 共 " + s.count + " 条\n";
    }

    var distEntries = Object.entries(stats.distributions).slice(0, 3);
    for (var j = 0; j < distEntries.length; j++) {
      var dCol = distEntries[j][0], dist = distEntries[j][1];
      var top5 = Object.entries(dist).slice(0, 5).map(function (e) { return e[0] + "(" + e[1] + ")"; }).join(", ");
      dataContext += dCol + " 分布: " + top5 + "\n";
    }

    // RAG 注入
    var userQuestion = messages.length > 0 ? messages[messages.length - 1].content : "";
    try {
      var ragCtx = await injectRAG(userQuestion, ds.id, dataContext);
      if (ragCtx.combined) {
        dataContext = ragCtx.combined + "\n\n---\n" + dataContext;
      }
    } catch (e) { /* RAG failure is non-blocking */ }

    var reply = await chatWithData(dataContext, messages);

    saveChatMessage(ds.id, "user", messages[messages.length - 1].content);
    saveChatMessage(ds.id, "assistant", reply);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ reply: "抱歉，AI 服务暂时不可用，请稍后重试。" });
  }
}
