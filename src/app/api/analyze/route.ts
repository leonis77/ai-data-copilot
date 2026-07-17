import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, getDataset, saveAnalysis, getAnalysis } from "@/lib/db";
import { getFromServerStore, getLatestFromServerStore } from "@/lib/server-store";
import { analyzeData } from "@/lib/ai";
import { computeStats } from "@/lib/parser";
import { ApiErrorCode, apiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("datasetId");
    const body = await request.json().catch(() => ({}));
    const question = body.question || "";

    let ds;
    if (datasetId) {
      ds = await getDataset(datasetId);
      if (!ds) ds = getFromServerStore(datasetId);
    } else {
      ds = await getLatestDataset();
      if (!ds) ds = getLatestFromServerStore();
    }
    if (!ds) {
      return NextResponse.json(apiError(ApiErrorCode.DATASET_NOT_FOUND, "未找到数据，请先上传文件", { recoverable: true }), { status: 400 });
    }

    const dsId = (ds as any).id;
    const columns = (ds as any).columns;
    const rows = (ds as any).rows;

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
      apiError(ApiErrorCode.INTERNAL_ERROR, error instanceof Error ? error.message : "分析失败", { recoverable: true }),
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
      if (!ds) ds = getFromServerStore(datasetId);
    } else {
      ds = await getLatestDataset();
      if (!ds) ds = getLatestFromServerStore();
    }
    if (!ds) return NextResponse.json(null);

    const analysis = await getAnalysis((ds as any).id);

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
  var p: string[] = [];
  p.push("Rows:" + stats.rowCount + " Cols:" + stats.columnCount);

  // Find key columns by name pattern
  var findCol = function(re: RegExp): string | undefined { return columns.find(function(c){return re.test(c)}); };
  var priceCol = findCol(/price|amount|价|金额|实付/);
  var nameCol = findCol(/name|product|名称|商品|产品|标题/);
  var dateCol = findCol(/date|time|时间|日期|下单/);
  var statCol = findCol(/status|状态/);
  var addrCol = findCol(/addr|地址|收货|省|市/);
  var buyerCol = findCol(/buyer|member|买家|会员/);

  // Numeric stats
  var entries = Object.entries(stats.stats);
  for (var i = 0; i < Math.min(entries.length, 4); i++) {
    var col = entries[i][0], s = entries[i][1];
    p.push(col + ": " + s.min + "-" + s.max + " avg=" + s.avg.toFixed(2));
  }

  // HOT PRODUCTS - top 5 by revenue
  if (nameCol && priceCol) {
    var prodMap: Record<string, number> = {};
    for (var ri = 0; ri < rows.length; ri++) {
      var nm = String(rows[ri][nameCol] || "");
      var amt = Number(rows[ri][priceCol]) || 0;
      prodMap[nm] = (prodMap[nm] || 0) + amt;
    }
    var topProd = Object.entries(prodMap).sort(function(a,b){return b[1]-a[1]}).slice(0,8);
    var topTotal = topProd.reduce(function(s,e){return s+e[1]},0);
    var allTotal = Object.values(prodMap).reduce(function(s,v){return s+v},0);
    var concentration = allTotal > 0 ? Math.round(topTotal/allTotal*100) : 0;
    p.push("HOT: top8 products = " + topProd.map(function(e){return e[0]+"("+Math.round(e[1])+")"}).join(", "));
    p.push("HOT: top8 revenue share = " + concentration + "%");
  }

  // TREND - date aggregation
  if (dateCol && priceCol) {
    var dateMap: Record<string, number> = {};
    for (var di = 0; di < rows.length; di++) {
      var dt = String(rows[di][dateCol] || "").substring(0,10);
      dateMap[dt] = (dateMap[dt] || 0) + (Number(rows[di][priceCol]) || 0);
    }
    var dates = Object.keys(dateMap).sort();
    if (dates.length >= 2) {
      var first = Math.round(dateMap[dates[0]] || 0);
      var last = Math.round(dateMap[dates[dates.length-1]] || 0);
      var trend = last > first ? "UP" : last < first ? "DOWN" : "FLAT";
      p.push("TREND: " + dates.length + " days, first=" + first + " last=" + last + " direction=" + trend);
    }
  }

  // CUSTOMER INSIGHTS
  if (buyerCol) {
    var buyerCounts: Record<string, number> = {};
    for (var bi = 0; bi < rows.length; bi++) {
      var bn = String(rows[bi][buyerCol] || "");
      buyerCounts[bn] = (buyerCounts[bn] || 0) + 1;
    }
    var repeatBuyers = Object.values(buyerCounts).filter(function(v){return v > 1}).length;
    p.push("CUSTOMER: " + Object.keys(buyerCounts).length + " unique buyers, " + repeatBuyers + " repeat");
  }

  // REGIONAL distribution
  if (addrCol) {
    var regionMap: Record<string, number> = {};
    for (var ai = 0; ai < rows.length; ai++) {
      var ad = String(rows[ai][addrCol] || "").substring(0,2);
      regionMap[ad] = (regionMap[ad] || 0) + 1;
    }
    var topRegions = Object.entries(regionMap).sort(function(a,b){return b[1]-a[1]}).slice(0,6);
    p.push("REGION: " + topRegions.map(function(e){return e[0]+"("+e[1]+")"}).join(", "));
  }

  // STATUS / ISSUES
  if (statCol) {
    var statusCounts: Record<string, number> = {};
    for (var si = 0; si < rows.length; si++) {
      var st = String(rows[si][statCol] || "");
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }
    p.push("STATUS: " + Object.entries(statusCounts).map(function(e){return e[0]+"("+e[1]+")"}).join(", "));
  }

  // Distributions
  var dk = Object.keys(stats.distributions);
  for (var j = 0; j < Math.min(dk.length, 2); j++) {
    var top = Object.entries(stats.distributions[dk[j]]).slice(0,6).map(function(e){return e[0]+"("+e[1]+")"}).join(",");
    p.push(dk[j] + ": " + top);
  }

  // Sample
  if (rows.length > 0) {
    var sample = rows.slice(0,3).map(function(r){var o:any={};for(var k in r){if(!/^__/.test(k)&&k!=="sheet_name")o[k]=r[k]}return JSON.stringify(o)}).join("\n");
    p.push("Sample:\n" + sample.substring(0,500));
  }

  return p.join("\n");
}