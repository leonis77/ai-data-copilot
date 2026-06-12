import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset } from "@/lib/db";
import { computeStats } from "@/lib/parser";
import { routeAgent } from "@/lib/agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body.input || "";
    const ds = await getLatestDataset();

    if (!ds) return NextResponse.json({ error: "??????" }, { status: 400 });

    const columns = Array.isArray(ds.columns) ? ds.columns : JSON.parse(ds.columns as string);
    const rows = Array.isArray(ds.rows) ? ds.rows : [];
    const stats = computeStats(rows, columns);
    const dataSummary = Object.entries(stats.stats).map(([k, v]) =>
      k + ": avg=" + v.avg.toFixed(2) + ", min=" + v.min + ", max=" + v.max
    ).join("; ");

    const ctx = { dataSummary, columns, rowCount: rows.length, stats, datasetName: ds.original_name || ds.name };
    const result = await routeAgent(input || "??????", ctx);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: "Agent ????" }, { status: 500 });
  }
}
