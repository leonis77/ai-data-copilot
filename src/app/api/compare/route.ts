import { NextRequest, NextResponse } from "next/server";
import { getDataset } from "@/lib/db";
import { analyzeData } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { datasetIdA, datasetIdB } = body;
    if (!datasetIdA || !datasetIdB) return NextResponse.json({ error: "need two dataset IDs" }, { status: 400 });

    const [dsA, dsB] = await Promise.all([getDataset(datasetIdA), getDataset(datasetIdB)]);
    if (!dsA || !dsB) return NextResponse.json({ error: "dataset not found" }, { status: 404 });

    const colsA = Array.isArray(dsA.columns) ? dsA.columns : JSON.parse(dsA.columns as string);
    const colsB = Array.isArray(dsB.columns) ? dsB.columns : JSON.parse(dsB.columns as string);
    const rowsA = Array.isArray(dsA.rows) ? dsA.rows : [];
    const rowsB = Array.isArray(dsB.rows) ? dsB.rows : [];

    // Find common numeric columns
    const common = colsA.filter(function(c: string) { return colsB.includes(c); });
    const numCols = common.filter(function(c: string) {
      return rowsA.some(function(r: any) { return typeof r[c] === "number"; }) &&
             rowsB.some(function(r: any) { return typeof r[c] === "number"; });
    });

    // Compute diffs
    const diffs: Record<string, { a: number; b: number; delta: number }> = {};
    for (const col of numCols) {
      const avgA = rowsA.reduce(function(s: number, r: any) { return s + (Number(r[col]) || 0); }, 0) / rowsA.length;
      const avgB = rowsB.reduce(function(s: number, r: any) { return s + (Number(r[col]) || 0); }, 0) / rowsB.length;
      diffs[col] = { a: Math.round(avgA * 100) / 100, b: Math.round(avgB * 100) / 100, delta: Math.round((avgB - avgA) * 100) / 100 };
    }

    // Build summary for AI
    let sum = "表A: " + dsA.original_name + " (" + rowsA.length + "行) vs 表B: " + dsB.original_name + " (" + rowsB.length + "行)\n";
    for (const [col, d] of Object.entries(diffs)) {
      sum += col + ": A=" + d.a + " B=" + d.b + " 变化=" + (d.delta >= 0 ? "+" : "") + d.delta + "\n";
    }

    let narrative = "";
    if (Object.keys(diffs).length > 0) {
      try {
        const result = await analyzeData(sum, "请分析两张表的差异");
        narrative = result.summary;
      } catch { narrative = "对比分析完成"; }
    }

    return NextResponse.json({ commonColumns: common, numColumns: numCols, differences: diffs, narrative,
      metaA: { name: dsA.original_name, rows: rowsA.length }, metaB: { name: dsB.original_name, rows: rowsB.length } });
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json({ error: "compare failed" }, { status: 500 });
  }
}
