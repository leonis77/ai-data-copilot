import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, getDataset, saveAnalysis, getAnalysis } from "@/lib/db";
import { analyzeWithContext, analyzeData, buildAnalysisContext } from "@/lib/ai";
import { computeStats } from "@/lib/parser";
import { classifyByRoles } from "@/lib/classifier";
import { mapBusinessConcepts } from "@/lib/business-concepts";
import { detectRoles } from "@/lib/semantic";
import { logger } from "@/lib/logger";
import { computeUserBenchmarks, saveUserBenchmarks } from "@/lib/rag";
import { injectRAG } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    var url = new URL(request.url);
    var searchParams = url.searchParams;
    var datasetId = searchParams.get("datasetId");
    var body = await request.json().catch(function () { return {}; });
    var question = body.question || "";

    var ds: any;
    if (datasetId) ds = await getDataset(datasetId);
    else ds = await getLatestDataset();
    if (!ds) return NextResponse.json({ error: "未找到数据，请先上传文件" }, { status: 400 });

    var dsId = ds.id;
    var columns: string[] = ds.columns || [];
    var rows: any[] = ds.rows || [];

    // ── Layered pipeline (纯服务端计算，不依赖浏览器 localStorage) ──
    try {
      // Step 1: 从数据直接检测语义角色（服务端可用）
      var semanticRoles = detectRoles(columns, rows.slice(0, 50));

      // Step 2: 表格分类
      var classification = classifyByRoles(semanticRoles);

      // Step 3: 业务概念映射
      var businessProfile = mapBusinessConcepts(semanticRoles, classification.class, columns);

      // Step 4: 预计算指标
      var stats = computeStats(rows, columns);

      // Top 实体提取
      var topEntities: { name: string; revenue?: number; share?: number }[] = [];
      var entityCol = businessProfile.getColumn("product_name") ||
        businessProfile.getColumn("supplier_name") ||
        businessProfile.getColumn("customer_name");
      var moneyCol = businessProfile.getColumn("selling_price") ||
        businessProfile.getColumn("procurement_cost");

      if (entityCol && moneyCol) {
        var entityMap: Record<string, number> = {};
        var totalMoney = 0;
        for (var i = 0; i < rows.length; i++) {
          var name = String(rows[i][entityCol] || "").trim();
          var money = Number(rows[i][moneyCol]);
          if (!name || isNaN(money)) continue;
          entityMap[name] = (entityMap[name] || 0) + money;
          totalMoney += money;
        }
        var sorted = Object.entries(entityMap).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
        for (var j = 0; j < sorted.length; j++) {
          topEntities.push({
            name: sorted[j][0],
            revenue: Math.round(sorted[j][1] * 100) / 100,
            share: totalMoney > 0 ? Math.round(sorted[j][1] / totalMoney * 10000) / 100 : 0,
          });
        }
      }

      // Step 5: 构建分层上下文
      var contextText = buildAnalysisContext(
        classification.class,
        classification.confidence,
        businessProfile,
        rows.length,
        columns.length,
        topEntities,
        undefined,
        undefined
      );

      // Step 5.5: RAG 注入（用户历史 + 行业知识）
      try {
        var ragCtx = await injectRAG(question || "分析数据", dsId, contextText);
        if (ragCtx.combined) {
          contextText = ragCtx.combined + "\n\n---\n" + contextText;
        }
      } catch (ragErr) { /* non-blocking */ }

      // Step 6: AI 分析
      var result = await analyzeWithContext(contextText, classification.class, question);

      // Step 6.5: 保存用户基准（非阻塞）
      try {
        var benchmarks = computeUserBenchmarks(dsId, stats, rows.length, columns.length, classification.class);
        saveUserBenchmarks(dsId, benchmarks);
      } catch (bmErr) { /* non-blocking */ }

      // Step 7: 保存
      await saveAnalysis({
        id: "analysis_" + dsId, datasetId: dsId,
        summary: result.summary, insights: JSON.stringify(result.insights),
        risks: JSON.stringify(result.risks), suggestions: JSON.stringify(result.suggestions),
      });

      return NextResponse.json(result);
    } catch (pipelineErr) {
      logger.warn("Layered pipeline failed, fallback to legacy", { message: String(pipelineErr) });

      var stats2 = computeStats(rows, columns);
      var dataSummary = buildLegacySummary(stats2, columns, rows);
      var result2 = await analyzeData(dataSummary, question);

      await saveAnalysis({
        id: "analysis_" + dsId, datasetId: dsId,
        summary: result2.summary, insights: JSON.stringify(result2.insights),
        risks: JSON.stringify(result2.risks), suggestions: JSON.stringify(result2.suggestions),
      });

      return NextResponse.json(result2);
    }
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    var url = new URL(request.url);
    var searchParams = url.searchParams;
    var datasetId = searchParams.get("datasetId");

    var ds: any;
    if (datasetId) ds = await getDataset(datasetId);
    else ds = await getLatestDataset();
    if (!ds) return NextResponse.json(null);

    var analysis = await getAnalysis(ds.id);
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

function buildLegacySummary(stats: ReturnType<typeof computeStats>, columns: string[], rows: any[]): string {
  var p: string[] = [];
  p.push("Rows:" + stats.rowCount + " Cols:" + stats.columnCount);

  var findCol = function (re: RegExp): string | undefined { return columns.find(function (c) { return re.test(c); }); };
  var priceCol = findCol(/price|amount|价|金额|实付/);
  var nameCol = findCol(/name|product|名称|商品|产品|标题/);
  var dateCol = findCol(/date|time|时间|日期|下单/);

  var entries = Object.entries(stats.stats);
  for (var i = 0; i < Math.min(entries.length, 4); i++) {
    var col = entries[i][0], s = entries[i][1];
    p.push(col + ": " + s.min + "-" + s.max + " avg=" + s.avg.toFixed(2));
  }

  if (nameCol && priceCol) {
    var prodMap: Record<string, number> = {};
    for (var ri = 0; ri < rows.length; ri++) {
      var nm = String(rows[ri][nameCol] || "");
      var amt = Number(rows[ri][priceCol]) || 0;
      prodMap[nm] = (prodMap[nm] || 0) + amt;
    }
    var topProd = Object.entries(prodMap).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    p.push("HOT: top8 = " + topProd.map(function (e) { return e[0] + "(" + Math.round(e[1]) + ")"; }).join(", "));
  }

  if (dateCol && priceCol) {
    var dateMap: Record<string, number> = {};
    for (var di = 0; di < rows.length; di++) {
      var dt = String(rows[di][dateCol] || "").substring(0, 10);
      dateMap[dt] = (dateMap[dt] || 0) + (Number(rows[di][priceCol]) || 0);
    }
    var dates = Object.keys(dateMap).sort();
    if (dates.length >= 2) p.push("TREND: " + dates.length + " days");
  }

  return p.join("\n");
}
