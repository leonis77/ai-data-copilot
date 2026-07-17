import { NextRequest, NextResponse } from "next/server";
import { getDataset, listDatasets } from "@/lib/db";
import { getFromServerStore, listFromServerStore } from "@/lib/server-store";
import { computeStats } from "@/lib/parser";
import { logger } from "@/lib/logger";
import { routeAgent } from "@/lib/agent";
import { injectKnowledge, injectKnowledgeV3 } from "@/lib/rag";
import { detectRelations, detectRoles } from "@/lib/semantic";
import type { DatasetRelation } from "@/lib/semantic/types";
import { executeDecisionPipeline } from "@/lib/pipeline/decision-pipeline";
import { detectPlatform } from "@/lib/platform/detect";
import { serializeDecisionChain } from "@/lib/agent/api-types";
import { validateAgentRequest } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(function () { return null; });
    if (!body || typeof body !== "object") {
      return NextResponse.json({ type: "agent_error", content: "请求体必须是 JSON 对象", error: { code: "INVALID_BODY", message: "missing json body", recoverable: true } }, { status: 400 });
    }
    var parsed: any;
    try {
      parsed = validateAgentRequest(body);
    } catch (e: any) {
      return NextResponse.json({ type: "agent_error", content: "请求参数不合法：" + (e?.message || ""), error: { code: "VALIDATION_FAILED", message: e?.message || "", recoverable: true } }, { status: 400 });
    }
    const input = parsed.input;
    const datasetId = parsed.datasetId;
    const frontendRelatedIds: string[] = parsed.relatedDatasetIds || [];
    // ⭐ 客户端内联数据集（localStorage 直传，绕过 serverless 存储不共享）
    const inlineDatasets: Record<string, { columns: string[]; rows: any[]; originalName?: string; platform?: string }> =
      parsed.inlineDatasets && typeof parsed.inlineDatasets === "object" ? parsed.inlineDatasets : {};

    const ds = await getDataset(datasetId);
    // Fall back to in-memory store, then to client-provided inline data
    let fallbackDs: any = ds || getFromServerStore(datasetId);
    if (!fallbackDs && inlineDatasets[datasetId] && inlineDatasets[datasetId].rows?.length > 0) {
      const inl = inlineDatasets[datasetId];
      fallbackDs = { columns: inl.columns, rows: inl.rows, originalName: inl.originalName || "", original_name: inl.originalName || "", platform: inl.platform || "" };
    }
    if (!fallbackDs) {
      return NextResponse.json({
        type: "agent_error",
        content: "未找到可分析的数据集，请重新上传数据。",
        error: { code: "DATASET_NOT_FOUND", message: "dataset not found", recoverable: true },
      }, { status: 404 });
    }

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

    // Prefer persisted platform metadata; use shared column detection only as fallback.
    const platformHint = detectPlatform(cols, fallbackDs.platform as string | undefined);

    let ecomCtx = "";
    if (hasAmount && hasProduct) {
      ecomCtx = "[电商订单数据] 你正在分析电商订单数据。关注：销售趋势、畅销商品、平均订单价值、退款异常、商品集中度。提供有商业价值的分析。\n\n";
    }

    // Cross-dataset relations — robust detection using on-the-fly role computation
    // (does NOT rely on stored semanticRoles, which may be null in serverless cold starts)
    var crossCtx = "";
    var rels: DatasetRelation[] = [];
    try {
      var allDs: any[] = await listDatasets();
      // ⭐ 回退：Supabase 不可用时从 server-store 获取数据集列表
      if (!allDs || allDs.length < 2) {
        var serverStoreDs = listFromServerStore();
        if (serverStoreDs.length > 0) {
          logger.info("listDatasets returned " + (allDs?.length || 0) + " datasets, falling back to server-store with " + serverStoreDs.length);
          // 合并两个来源（去重），优先使用 Supabase 数据（含 semanticRoles）
          var supabaseIds = new Set((allDs || []).map(function(d: any) { return d.id; }));
          for (var ssi = 0; ssi < serverStoreDs.length; ssi++) {
            if (!supabaseIds.has(serverStoreDs[ssi].id)) {
              allDs.push({
                id: serverStoreDs[ssi].id,
                originalName: serverStoreDs[ssi].originalName,
                columns: serverStoreDs[ssi].columns,
                semanticRoles: serverStoreDs[ssi].semanticRoles || null,
                platform: serverStoreDs[ssi].platform || null,
              });
            }
          }
        }
      }
      if (allDs.length >= 2) {
        // Compute semantic roles on-the-fly from column names for ALL datasets
        // This ensures cross-dataset detection works even when stored semanticRoles is null
        var allDsMeta = allDs.map(function(d: any) {
          // Try stored semanticRoles first (full profile with sample-value verification)
          if (d.semanticRoles && d.semanticRoles.columns && d.semanticRoles.columns.length > 0) {
            return { id: d.id, originalName: d.originalName, semanticRoles: d.semanticRoles };
          }
          // Fallback: compute roles from column names using regex pattern matching
          // (confidence ≥0.6 from patterns alone — sufficient for relation detection)
          var dsColumns: string[] = Array.isArray(d.columns)
            ? d.columns
            : (typeof d.columns === "string" ? JSON.parse(d.columns as string) : []);
          if (dsColumns.length === 0) {
            return { id: d.id, originalName: d.originalName, semanticRoles: undefined };
          }
          var detectedRoles = detectRoles(dsColumns, []); // empty rows → pattern-only (confidence 0.7)
          return {
            id: d.id,
            originalName: d.originalName,
            semanticRoles: {
              datasetId: d.id,
              columns: detectedRoles,
              summary: "",
              availableDecisions: [],
            },
          };
        });
        rels = detectRelations(allDsMeta);
      }
      if (rels.length > 0) {
        crossCtx = "跨数据集关联上下文：检测到以下关联关系:\n";
        for (var ri = 0; ri < rels.length; ri++) {
          crossCtx += "- " + rels[ri].description + " (关联字段: " + rels[ri].joinKey + ")\n";
        }
        crossCtx += "利用这些关联提供跨数据集洞察。但仅声称可以验证的数据。\n\n";
        logger.info("Cross-dataset relations detected", {
          count: rels.length,
          types: rels.map(function(r) { return r.type; }),
          computedOnTheFly: allDs.some(function(d: any) { return !d.semanticRoles || !d.semanticRoles.columns; }),
          source: (allDs || []).length > 0 ? "supabase+serverstore" : "none",
        });
      }
    } catch (e) {
      logger.warn("Cross-dataset relation detection failed", { message: e instanceof Error ? e.message : String(e) });
    }

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
    // 优先使用前端传来的关联数据集ID（最可靠，因为浏览器端已做过检测）
    for (var fri = 0; fri < frontendRelatedIds.length; fri++) {
      if (frontendRelatedIds[fri] && frontendRelatedIds[fri] !== datasetId && !crossDatasetIds.includes(frontendRelatedIds[fri])) {
        crossDatasetIds.push(frontendRelatedIds[fri]);
      }
    }
    // 补充后端检测到的关联关系
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
    logger.info("Cross-dataset IDs resolved", {
      frontendProvided: frontendRelatedIds.length,
      backendDetected: rels.length,
      finalIds: crossDatasetIds,
    });

    // ⭐ 尝试使用 DecisionPipeline（经营决策链路贯通）
    // 如果成功，返回结构化的 DecisionChain
    // 如果失败，回退到原有的 routeAgent（向后兼容）
    try {
      const chain = await executeDecisionPipeline(
        input || "请分析这些数据",
        datasetId,
        crossDatasetIds.length > 0 ? crossDatasetIds : undefined,
        Object.keys(inlineDatasets).length > 0 ? inlineDatasets : undefined,
      );
      if (chain) {
        logger.info("Decision pipeline executed successfully", {
          datasetId,
          evidenceCards: chain.evidenceCards.length,
          actions: chain.actions.length,
          diagnoses: chain.diagnoses.length,
          crossDatasets: chain.crossDataset?.length || 0,
          crossPlatforms: chain.metrics.crossPlatform?.length || 0,
          industry: chain.meta.industry.name,
          pipelineLatency: chain.meta.pipelineLatency,
        });
        return NextResponse.json(serializeDecisionChain(chain));
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
    return NextResponse.json({ ...result, degraded: true, fallbackReason: "decision_pipeline_unavailable" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Agent API failed", { message });
    return NextResponse.json({
      type: "agent_error",
      content: "AI 分析暂时不可用，请稍后重试。",
      error: {
        code: "AGENT_FAILED",
        message,
        recoverable: true,
      },
    }, { status: 500 });
  }
}
