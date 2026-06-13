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
      ds = await getDataset(datasetId);
    } else {
      ds = await getLatestDataset();
    }
    if (!ds) {
      return NextResponse.json({ error: "未找到数据，请先上传文件" }, { status: 400 });
    }

    const dsId = ds.id;
    const columns = ds.columns;
    const rows = ds.rows;

    const stats = computeStats(rows, columns);
    const dataSummary = buildDataSummary(stats, columns as string[], rows as any[]);

    const result = await analyzeData(dataSummary, question);

    await saveAnalysis({
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
      ds = await getDataset(datasetId);
    } else {
      ds = await getLatestDataset();
    }
    if (!ds) return NextResponse.json(null);

    const analysis = await getAnalysis(ds.id);

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

function buildDataSummary(stats: ReturnType<typeof computeStats>, columns: string[], rows: any[]): string {
  var parts: string[] = [];
  parts.push("Rows:" + stats.rowCount + " Cols:" + stats.columnCount);
  // Numeric stats with range
  var entries = Object.entries(stats.stats);
  for (var i = 0; i < Math.min(entries.length, 5); i++) {
    var col = entries[i][0], s = entries[i][1];
    parts.push(col + ": " + s.min + "-" + s.max + " avg=" + s.avg.toFixed(2) + " total=" + s.sum.toFixed(2));
  }
  // Category distributions
  var dk = Object.keys(stats.distributions);
  for (var j = 0; j < Math.min(dk.length, 3); j++) {
    var top = Object.entries(stats.distributions[dk[j]]).slice(0,6).map(function(e){return e[0]+"("+e[1]+")"}).join(",");
    parts.push(dk[j] + ": " + top);
  }
  // Price analysis
  if (rows.length > 0) {
    var priceCol = columns.find(function(c){return /price|金额|价格|价/.test(c)});
    if (priceCol) { var pc: string = priceCol;
      var prices = rows.map(function(r){return Number(r[pc])||0}).filter(function(v){return v>0});
      if (prices.length > 0) {
        prices.sort(function(a,b){return a-b});
        parts.push("Price: med=" + prices[Math.floor(prices.length*0.5)] + " 25p=" + prices[Math.floor(prices.length*0.25)] + " 75p=" + prices[Math.floor(prices.length*0.75)]);
      }
    }
  }
  // Sample rows (first 3, filtered)
  if (rows.length > 0) {
    var sample = rows.slice(0,3).map(function(r){var o: any = {};for(var k in r){if(!/^__/.test(k)&&k!=="sheet_name")o[k]=r[k]}return JSON.stringify(o)}).join("\n");
    parts.push("Sample:\n" + sample.substring(0,500));
  }
  return parts.join("\n");
}