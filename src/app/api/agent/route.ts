import { NextRequest, NextResponse } from "next/server";
import { getDataset, listDatasets } from "@/lib/db";
import { getFromServerStore } from "@/lib/server-store";
import { computeStats } from "@/lib/parser";
import { logger } from "@/lib/logger";
import { routeAgent } from "@/lib/agent";
import { injectKnowledge, injectKnowledgeV3 } from "@/lib/rag";
import { detectRelations } from "@/lib/semantic";
import type { DatasetRelation } from "@/lib/semantic/types";
import { executeDecisionPipeline } from "@/lib/pipeline/decision-pipeline";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body.input || "";
    const datasetId = body.datasetId || "";

    const ds = await getDataset(datasetId);
    // Fall back to in-memory store if Supabase is unavailable
    const fallbackDs = ds || getFromServerStore(datasetId);
    if (!fallbackDs) return NextResponse.json({ error: "dataset not found" }, { status: 400 });

    const cols: string[] = Array.isArray(fallbackDs.columns) ? fallbackDs.columns : JSON.parse(fallbackDs.columns as string);
    const rows: any[] = Array.isArray(fallbackDs.rows) ? fallbackDs.rows : [];
    const stats = computeStats(rows, cols);

    let dataSummary = "Dataset: " + (fallbackDs.original_name || fallbackDs.originalName || "") + "\n";
    dataSummary += "Rows: " + rows.length + ", Cols: " + cols.length + "\n";
    dataSummary += "All columns: " + cols.join(", ") + "\n";

    const numericStats = Object.entries(stats.stats).slice(0, 8);
    if (numericStats.length > 0) {
      dataSummary += "\nNumeric stats:\n";
      for (const [col, s] of numericStats) {
        dataSummary += "  " + col + " - avg: " + (s as any).avg.toFixed(2) + ", min: " + (s as any).min + ", max: " + (s as any).max + "\n";
      }
    }

    const distKeys = Object.keys(stats.distributions).slice(0, 4);
    if (distKeys.length > 0) {
      dataSummary += "\nDistribution:\n";
      for (const dk of distKeys) {
        const top5 = Object.entries(stats.distributions[dk]).slice(0, 5)
          .map(([k, v]) => k + "(" + v + ")").join(", ");
        dataSummary += "  " + dk + ": " + top5 + "\n";
      }
    }

    if (rows.length > 0) {
      const sample = rows.slice(0, 3);
      dataSummary += "\nSample rows: " + JSON.stringify(sample).substring(0, 800);
    }

    // Platform detection from column names
    const hasOrder = cols.some((c: string) => /order|订单|订单号|订单编号/i.test(c));
    const hasProduct = cols.some((c: string) => /product|name|title|item|goods|sku|desc|商品|宝贝|产品/i.test(c));
    const hasAmount = cols.some((c: string) => /amount|price|pay|total|money|sum|payment|revenue|金额|价格|售价/i.test(c));

    // Detect platform from column name patterns
    let platformHint = "";
    if (cols.some((c: string) => /tmall|天猫|淘宝|taobao|买家会员|买家实际支付/i.test(c))) platformHint = "tmall";
    else if (cols.some((c: string) => /京东|jd|自营|pop/i.test(c))) platformHint = "jd";
    else if (cols.some((c: string) => /拼多多|pdd|拼团|百亿补贴/i.test(c))) platformHint = "pdd";
    else if (cols.some((c: string) => /抖音|douyin|达人|直播|千川|罗盘/i.test(c))) platformHint = "douyin";

    let ecomCtx = "";
    if (hasAmount && hasProduct) {
      ecomCtx = "[电商订单数据] 你正在分析电商订单数据。关注：销售趋势、畅销商品、平均订单价值、退款异常、商品集中度。提供有商业价值的分析。\n\n";
    }

    // Cross-dataset relations
    var crossCtx = "";
    var rels: DatasetRelation[] = [];
    try {
      var allDs = await listDatasets();
      var dsMeta = allDs.map(function(d: any) { return { id: d.id, originalName: d.originalName, semanticRoles: d.semanticRoles }; });
      rels = detectRelations(dsMeta);
      if (rels.length > 0) {
        crossCtx = "跨数据集关联上下文：检测到以下关联关系:\n";
        for (var ri = 0; ri < rels.length; ri++) {
          crossCtx += "- " + rels[ri].description + " (关联字段: " + rels[ri].joinKey + ")\n";
        }
        crossCtx += "利用这些关联提供跨数据集洞察。但仅声称可以验证的数据。\n\n";
      }
    } catch (e) {}

    // ⭐ 核心：AI主体架构知识注入（v3）
    let knowledgeCtx = "";
    try {
      const injectionResult = await injectKnowledgeV3(input, dataSummary, {
        columns: cols,
        sampleRows: rows.slice(0, 5),
        platformHint: platformHint || undefined,
      });
      knowledgeCtx = injectionResult.knowledgeBlock;
      logger.info("Knowledge injected (v3 AI-primary architecture)", {
        injected: injectionResult.stats.injected,
        warned: injectionResult.stats.warned,
        rejected: injectionResult.stats.rejected,
        freshnessScore: injectionResult.stats.freshnessScore,
        industry: injectionResult.stats.industry,
        industryConfidence: injectionResult.stats.industryConfidence,
        webSearchTriggered: injectionResult.stats.webSearchTriggered,
        webSearchResults: injectionResult.stats.webSearchResults,
        platformHint: platformHint || "none",
      });
    } catch(e) {
      // v3失败时回退到v2（向后兼容）
      logger.warn("Knowledge injection v3 failed, falling back to v2", { message: e instanceof Error ? e.message : String(e) });
      try {
        const fallbackResult = injectKnowledge(input, dataSummary, platformHint || undefined);
        knowledgeCtx = fallbackResult.knowledgeBlock;
      } catch(e2) {
        logger.warn("Knowledge injection v2 also failed, continuing without knowledge");
      }
    }

    var ctx = {
      dataSummary: crossCtx + ecomCtx + knowledgeCtx + dataSummary,
      columns: cols,
      rowCount: rows.length,
      stats: stats,
      datasetName: fallbackDs.original_name || fallbackDs.originalName || (fallbackDs as any).name || "Unnamed Dataset",
    };

    // ⭐ 提取跨数据集关联ID（供Pipeline执行跨数据集对比）
    var crossDatasetIds: string[] = [];
    if (rels.length > 0) {
      for (var ri2 = 0; ri2 < rels.length; ri2++) {
        if (rels[ri2].type === "profit_analysis" || rels[ri2].type === "entity_overlap") {
          // 取与当前数据集不相同的那个ID
          var relatedId = rels[ri2].datasetA === datasetId ? rels[ri2].datasetB : rels[ri2].datasetA;
          if (!crossDatasetIds.includes(relatedId)) {
            crossDatasetIds.push(relatedId);
          }
        }
      }
    }

    // ⭐ 尝试使用 DecisionPipeline（经营决策链路贯通）
    // 如果成功，返回结构化的 DecisionChain
    // 如果失败，回退到原有的 routeAgent（向后兼容）
    try {
      const chain = await executeDecisionPipeline(
        input || "请分析这些数据",
        datasetId,
        crossDatasetIds.length > 0 ? crossDatasetIds : undefined,
      );
      if (chain && chain.evidenceCards.length > 0) {
        logger.info("Decision pipeline executed successfully", {
          datasetId,
          evidenceCards: chain.evidenceCards.length,
          actions: chain.actions.length,
          diagnoses: chain.diagnoses.length,
          crossDatasets: chain.crossDataset?.length || 0,
          industry: chain.meta.industry.name,
          pipelineLatency: chain.meta.pipelineLatency,
        });
        return NextResponse.json({
          type: "decision_chain",
          content: chain.aiExplanation.summary,
          evidenceCards: chain.evidenceCards,
          diagnoses: chain.diagnoses,
          actions: chain.actions,
          applicableRules: chain.applicableRules,
          reasoningChain: chain.aiExplanation.reasoningChain,
          crossDataset: chain.crossDataset,
          meta: chain.meta,
        });
      }
    } catch (pipelineErr) {
      logger.warn("Decision pipeline failed, falling back to routeAgent", {
        message: pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr),
      });
    }

    // RAG enrichment for fallback routeAgent (already has knowledgeCtx in ctx.dataSummary)
    var enrichedInput = input;

    // 回退到原有 Agent 路由（向后兼容）
    const result = await routeAgent(enrichedInput || "请分析这些数据", ctx);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Agent API failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "agent failed" }, { status: 500 });
  }
}
