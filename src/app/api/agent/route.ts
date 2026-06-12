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
    var dataSummary = Object.entries(stats.stats).map(function(e) { return e[0] + ": avg=" + e[1].avg.toFixed(2) + ", min=" + e[1].min + ", max=" + e[1].max; }).join("; ");

    var ctx = { dataSummary: dataSummary, columns: columns, rowCount: rows.length, stats: stats, datasetName: ds.original_name || ds.name };
    var result = await routeAgent(input || "help", ctx);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: "agent failed" }, { status: 500 });
  }
}
