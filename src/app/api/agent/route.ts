import { NextRequest, NextResponse } from "next/server";
import { getDataset } from "@/lib/db";
import { computeStats } from "@/lib/parser";
import { routeAgent } from "@/lib/agent";

export async function POST(request: NextRequest) {
  try {
    var body = await request.json();
    var input = body.input || "";
    var datasetId = body.datasetId || "";

    var ds = await getDataset(datasetId);
    if (!ds) return NextResponse.json({ error: "dataset not found" }, { status: 400 });

    var cols = Array.isArray(ds.columns) ? ds.columns : JSON.parse(ds.columns as string);
    var rows: any[] = Array.isArray(ds.rows) ? ds.rows : [];
    var stats = computeStats(rows, cols);

    // Build rich data context
    var dataSummary = "DS: " + (ds.original_name || "") + "\n";
    dataSummary += "Rows: " + rows.length + " Cols: " + cols.length + "\n";
    dataSummary += "Stats: " + Object.entries(stats.stats).slice(0, 6).map(function(e) { return e[0] + " avg=" + e[1].avg.toFixed(2); }).join(", ") + "\n";

    // Category distributions
    for (var _i = 0; _i < Math.min(3, Object.keys(stats.distributions).length); _i++) {
      var dk = Object.keys(stats.distributions)[_i];
      if (dk) {
        var top5 = Object.entries(stats.distributions[dk]).slice(0, 5).map(function(e) { return e[0] + "(" + e[1] + ")"; }).join(", ");
        dataSummary += dk + ": " + top5 + "\n";
      }
    }

    // Sample rows for context
    if (rows.length > 0) {
      var sample = rows.slice(0, 3);
      dataSummary += "\nFirst 3 rows: " + JSON.stringify(sample).substring(0, 500);
    }

    // E-commerce domain context injection
    var ecomCtx = "";
    if (cols.includes("amount") && cols.includes("order_time")) {
      ecomCtx = "你是电商运营分析专家。重点关注：销售额趋势、爆品识别、客单价波动、退款异常。";
    }

    var ctx = {
      dataSummary: ecomCtx + "\n" + dataSummary,
      columns: cols,
      rowCount: rows.length,
      stats: stats,
      datasetName: ds.original_name || ds.name,
    };

    var result = await routeAgent(input || "help", ctx);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: "agent failed" }, { status: 500 });
  }
}
