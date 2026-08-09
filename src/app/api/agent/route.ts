import { NextRequest, NextResponse } from "next/server";
import { getDataset, listDatasets } from "@/lib/db";
import { getFromServerStore, listFromServerStore } from "@/lib/server-store";
import { computeStats } from "@/lib/parser";
import { logger, withRequestId } from "@/lib/logger";
import { routeAgent } from "@/lib/agent";
import { injectKnowledge, injectKnowledgeV3 } from "@/lib/rag";
import { detectRelations, detectRoles } from "@/lib/semantic";
import type { DatasetRelation } from "@/lib/semantic/types";
import { executeDecisionPipeline } from "@/lib/pipeline/decision-pipeline";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import type { InsufficientDataResult } from "@/lib/pipeline/types";
import { detectPlatform } from "@/lib/platform/detect";
import { serializeDecisionChain } from "@/lib/agent/api-types";
import { validateAgentRequest } from "@/lib/schemas";
import { ApiErrorCode, apiError } from "@/lib/errors";
import {
  saveAnalysisRun,
  extractDecisionSummary,
  saveDecision,
  saveActionTask,
} from "@/lib/loop";
import { startTimer, endTimer, logPipelineResult, logApiCall } from "@/lib/observability";
import { applyRateLimitAsync, rateLimitResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const rid = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  return withRequestId(rid, async function () {
    // Auth guard
    const authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.ok) {
      return NextResponse.json(apiError(ApiErrorCode.AUTH_FAILED, "未授权访问，请先登录"), { status: 401 });
    }
    const userId = authResult.user!.id;

    // ⭐ 限流：Agent 分析接口 1 分钟 10 次（Upstash Redis 多实例共享）
    const rateResult = await applyRateLimitAsync(request, { strategy: "agent" });
    if (!rateResult.allowed) {
      return rateLimitResponse(rateResult);
    }

    var pipelineType: string = "unknown";
    var timerId = startTimer("agent.pipeline", { route: "/api/agent" });
    try {
      const body = await readJsonBody(request);
      if (body instanceof NextResponse) return body;
      if (!body || typeof body !== "object") {
        logApiCall("/api/agent", false, { reason: "invalid_body" });
        return NextResponse.json({ type: "agent_error", content: "请求体必须是 JSON 对象", error: { code: "INVALID_BODY", message: "missing json body", recoverable: true } }, { status: 400 });
      }
      var parsed: any;
      try {
        parsed = validateAgentRequest(body);
      } catch (e: any) {
        logApiCall("/api/agent", false, { reason: "validation_failed" });
        return NextResponse.json({ type: "agent_error", content: "请求参数不合法：" + (e?.message || ""), error: { code: "VALIDATION_FAILED", message: e?.message || "", recoverable: true } }, { status: 400 });
      }
      const input = parsed.input;
      const datasetId = parsed.datasetId;
      const frontendRelatedIds: string[] = parsed.relatedDatasetIds || [];
      // ⭐ 客户端内联数据集（localStorage 直传，绕过 serverless 存储不共享）
      const inlineDatasets: Record<string, { columns: string[]; rows: any[]; originalName?: string; platform?: string }> =
        parsed.inlineDatasets && typeof parsed.inlineDatasets === "object" ? parsed.inlineDatasets : {};

    const ds = await getDataset(userId, datasetId);
    // Fall back to in-memory store, then to client-provided inline data
    let fallbackDs: any = ds || getFromServerStore(userId, datasetId);
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
      var allDs: any[] = await listDatasets(userId);
      // ⭐ 回退：Supabase 不可用时从 server-store 获取数据集列表
      if (!allDs || allDs.length < 2) {
        var serverStoreDs = listFromServerStore(userId);
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
    var chain: any;
    try {
      const result = await executeDecisionPipeline(
        input || "请分析这些数据",
        userId,
        datasetId,
        crossDatasetIds.length > 0 ? crossDatasetIds : undefined,
        Object.keys(inlineDatasets).length > 0 ? inlineDatasets : undefined,
      );

      // ⭐ 显式处理数据不足情况（不进入 legacy fallback）
      const insufficient = result as InsufficientDataResult | null;
      if (insufficient && insufficient.type === "insufficient_data") {
        logPipelineResult("insufficient_data", 0, { datasetId, reason: "insufficient_data" });
        endTimer(timerId, "warn");
        return NextResponse.json({
          type: "insufficient_data",
          content: "当前数据不足以生成完整经营分析。",
          limitations: insufficient.limitations,
          recoverable: true,
        });
      }

      chain = result as any;
      if (chain) {
        const runId = "run_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        const chainSnapshot = JSON.parse(JSON.stringify(chain)) as Record<string, unknown>;

        // 非阻塞持久化 AnalysisRun
        try {
          await saveAnalysisRun(userId, {
            id: runId,
            datasetId,
            input: input || "请分析这些数据",
            chainSnapshot,
            pipelineLatency: chain.meta.pipelineLatency,
            platform: platformHint,
            industry: chain.meta.industry.name,
            freshnessScore: chain.meta.freshnessScore,
            webSearchTriggered: chain.meta.webSearchTriggered,
          });
        } catch (persistErr) {
          logger.warn("AnalysisRun persist failed (non-fatal)", {
            message: persistErr instanceof Error ? persistErr.message : String(persistErr),
          });
        }

        // 非阻塞持久化 Decision + ActionTask
        try {
          const decisionId = "dec_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
          const extracted = extractDecisionSummary(chainSnapshot);

          await saveDecision(userId, {
            id: decisionId,
            analysisRunId: runId,
            datasetId,
            summary: extracted.summary,
            verdict: extracted.verdict,
            confidence: extracted.confidence,
            status: "pending",
            productNames: extracted.productNames,
            evidenceCardIndices: extracted.evidenceCardIndices,
            expectedProfitImpact: extracted.expectedProfitImpact,
            riskLevel: extracted.riskLevel,
          });

          const actions = Array.isArray(chainSnapshot.actions) ? chainSnapshot.actions as Record<string, unknown>[] : [];
          for (let ai = 0; ai < Math.min(actions.length, 20); ai++) {
            const a = actions[ai];
            const taskId = "task_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8) + "_" + ai;
            await saveActionTask(userId, {
              id: taskId,
              decisionId,
              title: String(a.title || a.action || "未命名行动"),
              description: String(a.description || a.reason || ""),
              priority: String(a.priority || "P1"),
              evidenceRefs: Array.isArray(a.evidenceRefs) ? a.evidenceRefs.map(Number) : [],
              ruleIds: Array.isArray(a.ruleIds) ? a.ruleIds.map(String) : [],
              expectedProfitImpact: Number(a.expectedProfitImpact) || 0,
              riskLevel: (a.riskLevel as "low" | "medium" | "high") || "medium",
            });
            // ⭐ 把持久化的 actionTaskId 回写到 chain snapshot，供前端执行/结果录入使用
            actions[ai] = Object.assign({}, a, { actionTaskId: taskId });
          }

          const response = serializeDecisionChain(chain);
          const responseAny = response as unknown as Record<string, unknown>;
          responseAny.decisionId = decisionId;
          responseAny.analysisRunId = runId;
          logger.info("Decision pipeline executed and persisted", {
            requestId: rid,
            datasetId,
            evidenceCards: chain.evidenceCards.length,
            actions: chain.actions.length,
            decisionId,
            analysisRunId: runId,
            pipelineLatency: chain.meta.pipelineLatency,
          });
          logPipelineResult("decision_chain", chain.meta.pipelineLatency, { datasetId, evidenceCards: chain.evidenceCards.length, actions: chain.actions.length });
          logApiCall("/api/agent", true, { pipelineLatency: chain.meta.pipelineLatency });
          endTimer(timerId, "info");
          return NextResponse.json(responseAny);
        } catch (loopErr) {
          logger.warn("Business loop persist failed, returning chain without loop IDs", {
            message: loopErr instanceof Error ? loopErr.message : String(loopErr),
          });
          logApiCall("/api/agent", true, { pipelineLatency: 0, warning: "loop_persist_failed" });
          endTimer(timerId, "warn");
          return NextResponse.json(serializeDecisionChain(chain));
        }
      }
    } catch (pipelineErr) {
      logger.warn("Decision pipeline failed, falling back to routeAgent", {
        requestId: rid,
        message: pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr),
      });
      logPipelineResult("fallback_agent", 0, { datasetId, reason: pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr) });
    }

    // RAG enrichment for fallback routeAgent (already has knowledgeCtx in ctx.dataSummary)
    var enrichedInput = input;

    // 回退到原有 Agent 路由（向后兼容）
    const result = await routeAgent(enrichedInput || "请分析这些数据", ctx);
    logApiCall("/api/agent", true, { degraded: true });
    endTimer(timerId, "warn");

    // 关键修复：将 routeAgent 返回的 { type: "interpret"|"query"|"report"|"general" }
    // 规范化为 { type: "decision_chain" }，使 Dashboard 能正确识别并渲染回退分析结果。
    // 若 pipeline 部分成功产生了 chain，保留其结构；否则以 agent 结果的内容作为摘要。
    var fallbackContent = result.content || "分析完成（降级模式）";
    var fallbackCrossPlatform: CrossPlatformComparison[] = [];
    var fallbackResponse: any;
    try {
      var serialized = serializeDecisionChain(chain);
      fallbackResponse = Object.assign({}, serialized, { content: fallbackContent, crossPlatform: fallbackCrossPlatform, degraded: true, fallbackReason: "decision_pipeline_unavailable" });
    } catch {
      fallbackResponse = { type: "decision_chain", content: fallbackContent, crossPlatform: fallbackCrossPlatform, degraded: true, fallbackReason: "decision_pipeline_unavailable" };
    }
    return NextResponse.json(fallbackResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Agent API failed", { requestId: rid, message });
    logPipelineResult("agent_error", 0, { message });
    logApiCall("/api/agent", false, { message });
    endTimer(timerId, "error");
    return NextResponse.json({
      type: "agent_error",
      content: "AI 分析暂时不可用，请稍后重试。",
      error: {
        code: "AGENT_FAILED",
        message: "服务暂时不可用",
        recoverable: true,
      },
    }, { status: 500 });
  }
  });
}
