import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, getDataset, saveAnalysis, getAnalysis } from "@/lib/db";
import { analyzeWithContext, analyzeData, buildAnalysisContext } from "@/lib/ai";
import { computeStats } from "@/lib/parser";
import { classifyByRoles } from "@/lib/classifier";
import { mapBusinessConcepts } from "@/lib/business-concepts";
import { computeCrossTableMetrics } from "@/lib/semantic/relations";
import type { CrossTableInput, CrossTableMetrics } from "@/lib/semantic/relations";
import { getStore } from "@/lib/store";
import { logger } from "@/lib/logger";

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

    // ── New layered pipeline ──
    try {
      var storeData = getStore();
      var datasetMeta = storeData.datasets.find(function (d: any) { return d.id === dsId; });
      var semanticRoles = datasetMeta?.semanticRoles?.columns || [];

      var classification = classifyByRoles(semanticRoles);
      var businessProfile = mapBusinessConcepts(semanticRoles, classification.class, columns);
      var stats = computeStats(rows, columns);

      // Top entities
      var topEntities: { name: string; revenue?: number; share?: number }[] = [];
      var entityCol = businessProfile.getColumn("product_name") || businessProfile.getColumn("supplier_name") || businessProfile.getColumn("customer_name");
      var moneyCol = businessProfile.getColumn("selling_price") || businessProfile.getColumn("procurement_cost");

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

      // Cross-table metrics
      var crossTableContext: any = undefined;
      try {
        var allDatasets = storeData.datasets;
        if (allDatasets && allDatasets.length > 1) {
          for (var k = 0; k < allDatasets.length; k++) {
            var other = allDatasets[k];
            if (other.id === dsId || !other.semanticRoles?.columns) continue;
            var hasEntity = other.semanticRoles.columns.some(function (r: any) { return r.role === "entity_name" && r.confidence >= 0.6; });
            if (!hasEntity) continue;
            crossTableContext = {
              entityMatchRate: 0, unmatchedCount: 0,
              note: "关联表 " + other.originalName + " 已检测到，切换到该表后将进行完整跨表分析",
            };
            break;
          }
        }
      } catch (crossErr) {
        logger.warn("Cross-table context skipped", { message: String(crossErr) });
      }

      var contextText = buildAnalysisContext(
        classification.class, classification.confidence, businessProfile,
        rows.length, columns.length, topEntities, undefined, crossTableContext
      );

      var result = await analyzeWithContext(contextText, classification.class, question);

      await saveAnalysis({
        id: "analysis_" + dsId, datasetId: dsId,
        summary: result.summary, insights: JSON.stringify(result.insights),
        risks: JSON.stringify(result.risks), suggestions: JSON.stringify(result.suggestions),
      });

      return NextResponse.json(result);
    } catch (pipelineErr) {
      logger.warn("Layered pipeline failed, fallback to legacy", { message: String(pipelineErr) });

      // Fallback
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
  var statCol = findCol(/status|状态/);
  var addrCol = findCol(/addr|地址|收货|省|市/);
  var buyerCol = findCol(/buyer|member|买家|会员/);

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
    var topTotal = topProd.reduce(function (s, e) { return s + e[1]; }, 0);
    var allTotal = Object.values(prodMap).reduce(function (s, v) { return s + v; }, 0);
    var concentration = allTotal > 0 ? Math.round(topTotal / allTotal * 100) : 0;
    p.push("HOT: top8 = " + topProd.map(function (e) { return e[0] + "(" + Math.round(e[1]) + ")"; }).join(", "));
    p.push("HOT: top8 share = " + concentration + "%");
  }

  if (dateCol && priceCol) {
    var dateMap: Record<string, number> = {};
    for (var di = 0; di < rows.length; di++) {
      var dt = String(rows[di][dateCol] || "").substring(0, 10);
      dateMap[dt] = (dateMap[dt] || 0) + (Number(rows[di][priceCol]) || 0);
    }
    var dates = Object.keys(dateMap).sort();
    if (dates.length >= 2) {
      var first = Math.round(dateMap[dates[0]] || 0);
      var last = Math.round(dateMap[dates[dates.length - 1]] || 0);
      p.push("TREND: " + (last > first ? "UP" : last < first ? "DOWN" : "FLAT"));
    }
  }

  return p.join("\n");
}
