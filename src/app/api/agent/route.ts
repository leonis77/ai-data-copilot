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

    var columns = Array.isArray(ds.columns) ? ds.columns : JSON.parse(ds.columns as string);
    var rows = Array.isArray(ds.rows) ? ds.rows : [];
    var stats = computeStats(rows, columns);
    var dataSummary = "DS: " + (ds.original_name || "") + "\n";
    dataSummary += "Rows: " + rows.length + " Cols: " + columns.length + "\n";
    // Numeric stats
    dataSummary += "Stats: " + Object.entries(stats.stats).map(function(e) { return e[0] + " avg=" + e[1].avg.toFixed(2); }).join(", ") + "\n";
    // Category distributions (top values)
    for (var _i = 0; _i < 3; _i++) {
      var dk = Object.keys(stats.distributions)[_i];
      if (dk) {
        var top5 = Object.entries(stats.distributions[dk]).slice(0, 5).map(function(e) { return e[0] + "(" + e[1] + ")"; }).join(", ");
        dataSummary += dk + ": " + top5 + "\n";
      }
    }
    // Sample rows
    if (rows.length > 0) {
      var sample = rows.slice(0, 3);
      dataSummary += "Sample: " + JSON.stringify(sample).substring(0, 500);
    }

    // Inject e-commerce domain context if template matched
    var ecomCtx = "";
    var cols = columns;
    if (cols.includes("amount") && cols.includes("order_time")) {
      ecomCtx = "你是电商运营分析专家。重点关注：销售额趋势、爆品识别、客单价波动、退款异常。";
    }
    var ctx = { dataSummary: ecomCtx +  dataSummary, columns: columns, rowCount: rows.length, stats: stats, datasetName: ds.original_name || ds.name };
    var result = await routeAgent(input || "help", ctx);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: "agent failed" }, { status: 500 });
  }
}
