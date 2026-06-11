import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, getDataset, saveAnalysis, getAnalysis } from "@/lib/db";
import { analyzeData } from "@/lib/ai";
import { computeStats } from "@/lib/parser";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("datasetId");
    const body = await request.json().catch(() => ({}));
    const question = body.question || "";

    let ds;
    if (datasetId) {
      ds = getDataset(datasetId);
    } else {
      ds = getLatestDataset();
    }
    if (!ds) {
      return NextResponse.json({ error: "未找到数据，请先上传文件" }, { status: 400 });
    }

    const dsId = ds.id;
    const columns = ds.columns;
    const rows = ds.rows;

    const stats = computeStats(rows, columns);
    const dataSummary = buildDataSummary(stats);

    const result = await analyzeData(dataSummary, question);

    saveAnalysis({
      id: `analysis_${dsId}`,
      datasetId: dsId,
      summary: result.summary,
      insights: JSON.stringify(result.insights),
      risks: JSON.stringify(result.risks),
      suggestions: JSON.stringify(result.suggestions),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("datasetId");

    let ds;
    if (datasetId) {
      ds = getDataset(datasetId);
    } else {
      ds = getLatestDataset();
    }
    if (!ds) return NextResponse.json(null);

    const analysis = getAnalysis(ds.id);

    if (!analysis) return NextResponse.json(null);

    return NextResponse.json({
      summary: analysis.summary,
      insights: JSON.parse(analysis.insights || "[]"),
      risks: JSON.parse(analysis.risks || "[]"),
      suggestions: JSON.parse(analysis.suggestions || "[]"),
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    return NextResponse.json(null);
  }
}

function buildDataSummary(stats: ReturnType<typeof computeStats>): string {
  const parts: string[] = [];
  parts.push(`数据集共 ${stats.rowCount} 条记录，${stats.columnCount} 个字段。`);

  for (const [col, s] of Object.entries(stats.stats).slice(0, 5)) {
    parts.push(
      `${col}: 共 ${s.count} 条, 平均值 ${s.avg.toFixed(2)}, 总和 ${s.sum.toFixed(2)}, 最小值 ${s.min}, 最大值 ${s.max}。`
    );
  }

  for (const [col, dist] of Object.entries(stats.distributions).slice(0, 3)) {
    const top = Object.entries(dist).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(", ");
    parts.push(`${col} 分类分布: ${top}。`);
  }

  return parts.join("\n");
}