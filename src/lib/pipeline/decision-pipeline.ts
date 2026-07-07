/**
 * ProcureWise Decision Pipeline v1.0
 *
 * 经营决策链路编排器 — 把7个独立模块串成一条完整的决策链路。
 *
 * 当前项目状态（代码审查确认）：
 *   - 7个引擎模块完整且独立
 *   - 0个被 Agent 管线调用
 *   - Agent route 只做 computeStats → injectKnowledge → single LLM call
 *
 * 本模块解决的问题：
 *   把已经做好的 metrics → diagnosis → evidence → rules → AI → actions 串起来，
 *   让每个模块各司其职，每一层都有据可查。
 *
 * 链路：数据 → 指标 → 诊断 → 证据 → 规则 → AI解释 → 建议 → 预期收益 → 风险
 */

import { getDataset } from "@/lib/db";
import { getFromServerStore } from "@/lib/server-store";
import { computeStats } from "@/lib/parser";
import { logger } from "@/lib/logger";

// ═══ Existing engine modules ═══
import { computeProductMetrics, computeStoreMetrics } from "@/lib/engines/metrics-engine";
import { diagnoseProducts } from "@/lib/engines/diagnosis-engine";
import { generateActions } from "@/lib/engines/decision-engine";
import { calculateProfit, PLATFORM_FEES_2026 } from "@/lib/profit/engine";
import { injectKnowledgeV3, KNOWLEDGE } from "@/lib/rag";
import { detectIndustry, assessKnowledgeCoverage } from "@/lib/rag/industry-detector";
import { detectRoles } from "@/lib/semantic/roles";
import { computeCrossTableMetrics } from "@/lib/semantic/relations";
import type { CrossTableInput } from "@/lib/semantic/relations";

// ═══ Cross-platform matching ═══
import {
  matchProductsAcrossPlatforms,
  buildCrossPlatformComparison,
  extractProductIdentity,
} from "@/lib/cross-platform";
import type { CrossPlatformComparison } from "@/lib/cross-platform";

// ═══ Pipeline modules ═══
import { generateAIExplanation } from "./ai-explanation";
import type {
  DecisionChain,
  EvidenceCard,
  ApplicableRule,
  PrioritizedAction,
  NormalizedDataset,
  CostAttributionItem,
  CrossDatasetSummary,
} from "./types";
import type { ProfitResult } from "@/lib/profit/engine";
import type { ColumnRole } from "@/lib/semantic/types";
import type { ProductMetrics } from "@/lib/engines/metrics-engine";
import type { Diagnosis } from "@/lib/engines/diagnosis-engine";
import type { Action } from "@/lib/engines/decision-engine";

// ═══════════════════════════════════════════════
// 主入口：执行完整经营决策链路
// ═══════════════════════════════════════════════

export async function executeDecisionPipeline(
  input: string,
  datasetId: string,
  crossDatasetIds?: string[],
): Promise<DecisionChain> {
  const startTime = Date.now();

  // ═══ Layer 0: 数据加载 ═══
  const ds = await loadDataset(datasetId);
  if (!ds) {
    throw new Error(`Dataset not found: ${datasetId}`);
  }
  const { columns, rows } = normalizeData(ds);

  // ═══ Layer 0.5: 行业检测 ═══
  const industry = detectIndustry(columns, rows.slice(0, 5));

  // ═══ Layer 1: 语义角色 + 指标计算 ═══
  const roles = detectRoles(columns, rows.slice(0, 50));
  const nameField = findRoleField(roles, "entity_name");
  const priceField = findRoleField(roles, "money");
  const qtyField = findRoleField(roles, "quantity");
  const platform = detectPlatformFromColumns(columns);

  // 基础统计
  const stats = computeStats(rows, columns);

  // 商品指标（仅当检测到名称和价格字段时）
  const productMetrics: ProductMetrics[] =
    nameField && priceField
      ? computeProductMetrics(rows, nameField, priceField, qtyField || undefined)
      : [];
  const storeMetrics = computeStoreMetrics(productMetrics, rows.length);

  // 利润计算（如果检测到价格字段和平台）
  const profitResults: ProfitResult[] = [];
  if (priceField && platform) {
    for (const p of productMetrics.slice(0, 50)) {
      // 尝试从数据中推断进货成本
      const purchaseCost = estimatePurchaseCost(p.name, rows, priceField);
      profitResults.push(
        calculateProfit({
          productName: p.name,
          platform: platform as "tmall" | "taobao" | "jd" | "pdd" | "douyin",
          sellPrice: p.avgPrice,
          purchaseCost,
          monthlySales: p.sales,
        }),
      );
    }
  }

  // ═══ Layer 2: 诊断 ═══
  const diagnoses: Diagnosis[] =
    productMetrics.length > 0 ? diagnoseProducts(productMetrics) : [];

  // ═══ Layer 3: 证据卡构建 ═══
  const evidenceCards = buildEvidenceCards(profitResults, platform);

  // ═══ Layer 4: 适用规则提取 ═══
  const applicableRules = extractApplicableRules(evidenceCards, platform, diagnoses);

  // ═══ Layer 4.5: 跨数据集对比（Cross-Dataset Comparison）═══
  const crossDatasetSummaries: CrossDatasetSummary[] = [];
  if (crossDatasetIds && crossDatasetIds.length > 0 && nameField && priceField) {
    const currentRoles = detectRoles(columns, rows.slice(0, 50));
    for (const relatedId of crossDatasetIds) {
      try {
        const relatedDs = await loadDataset(relatedId);
        if (!relatedDs) continue;
        const related = normalizeData(relatedDs);
        const relatedRoles = detectRoles(related.columns, related.rows.slice(0, 50));

        const crossInput: CrossTableInput = {
          id: datasetId,
          originalName: ds.original_name as string || (ds as any).originalName || "当前数据集",
          columns,
          rows,
          semanticRoles: currentRoles,
        };
        const crossInputB: CrossTableInput = {
          id: relatedId,
          originalName: related.originalName,
          columns: related.columns,
          rows: related.rows,
          semanticRoles: relatedRoles,
        };

        const metrics = computeCrossTableMetrics(crossInput, crossInputB);

        crossDatasetSummaries.push({
          relatedDatasetName: related.originalName,
          relatedDatasetId: relatedId,
          relationType: "profit_analysis",
          entityOverlap: {
            matched: metrics.entityOverlap.matched,
            totalCurrent: metrics.entityOverlap.totalA,
            totalRelated: metrics.entityOverlap.totalB,
            overlapRate: metrics.entityOverlap.rate,
          },
          priceComparisons: metrics.priceComparison.slice(0, 10).map((pc) => ({
            entity: pc.entity,
            priceCurrent: pc.priceA,
            priceRelated: pc.priceB,
            diff: pc.diff,
            diffPercent: pc.diffPercent,
          })),
          quantityComparisons: metrics.quantityComparison.slice(0, 10).map((qc) => ({
            entity: qc.entity,
            qtyCurrent: qc.qtyA,
            qtyRelated: qc.qtyB,
            gap: qc.gap,
          })),
        });

        logger.info("Cross-dataset comparison computed", {
          currentDataset: datasetId,
          relatedDataset: relatedId,
          entityOverlap: metrics.entityOverlap,
          priceComparisons: metrics.priceComparison.length,
          quantityComparisons: metrics.quantityComparison.length,
        });
      } catch (e) {
        logger.warn("Cross-dataset comparison failed for " + relatedId, {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  // ═══ Layer 4.6: 跨平台利润对比（Cross-Platform Profit Comparison）═══
  // 当关联数据集来自不同平台时，对匹配商品进行利润级对比分析
  const crossPlatformComparisons: CrossPlatformComparison[] = [];
  if (crossDatasetSummaries.length > 0 && platform && profitResults.length > 0) {
    for (const cd of crossDatasetSummaries) {
      try {
        const relatedDs = await loadDataset(cd.relatedDatasetId);
        if (!relatedDs) continue;
        const related = normalizeData(relatedDs);
        const relatedPlatform = detectPlatformFromColumns(related.columns);

        // Only compare if platforms differ
        if (!relatedPlatform || relatedPlatform === platform) continue;

        const relatedRoles = detectRoles(related.columns, related.rows.slice(0, 50));
        const relatedNameField = findRoleField(relatedRoles, "entity_name");
        const relatedPriceField = findRoleField(relatedRoles, "money");

        if (!relatedNameField || !relatedPriceField) continue;

        // Build ProductIdentity list from current dataset's profit results
        const currentIdentities = profitResults.map(function(pr) {
          return {
            id: platform + "_" + pr.productName,
            name: pr.productName,
            platform: platform,
            price: pr.sellPrice,
            monthlySales: Math.abs(Math.round(pr.netProfitMonthly / Math.max(Math.abs(pr.netProfitPerItem), 0.01))),
          };
        });

        // Build ProductIdentity list from related dataset matched entities
        const relatedIdentities = cd.priceComparisons.map(function(pc) {
          // Find product rows in related dataset for this entity
          const entityRows = related.rows.filter(function(r) {
            return String(r[relatedNameField] || "").trim() === pc.entity;
          });
          const avgPrice = entityRows.length > 0
            ? entityRows.reduce(function(sum, r) { return sum + (Number(r[relatedPriceField]) || 0); }, 0) / entityRows.length
            : pc.priceRelated;
          return {
            id: relatedPlatform + "_" + pc.entity,
            name: pc.entity,
            platform: relatedPlatform,
            price: avgPrice,
            monthlySales: entityRows.length,
          };
        });

        // Match products across platforms using Jaccard similarity
        const allIdentities = currentIdentities.concat(relatedIdentities);
        const matches = matchProductsAcrossPlatforms(allIdentities, 0.30);

        // For each match group, compute profit on both platforms
        for (var mi = 0; mi < matches.length; mi++) {
          var match = matches[mi];
          var currentInMatch = match.products.filter(function(p) { return p.platform === platform; });
          var relatedInMatch = match.products.filter(function(p) { return p.platform === relatedPlatform; });

          if (currentInMatch.length === 0 || relatedInMatch.length === 0) continue;

          // Build profit results for this matched group
          var groupProfitResults: ProfitResult[] = [];

          for (var ci = 0; ci < currentInMatch.length; ci++) {
            var cp = currentInMatch[ci];
            var existingProfit = profitResults.find(function(pr) { return pr.productName === cp.name; });
            if (existingProfit) {
              groupProfitResults.push(existingProfit);
            } else {
              var cpCost = estimatePurchaseCost(cp.name, rows, priceField!);
              groupProfitResults.push(
                calculateProfit({
                  productName: cp.name,
                  platform: platform as "tmall" | "taobao" | "jd" | "pdd" | "douyin",
                  sellPrice: cp.price,
                  purchaseCost: cpCost,
                  monthlySales: cp.monthlySales,
                }),
              );
            }
          }

          for (var ri3 = 0; ri3 < relatedInMatch.length; ri3++) {
            var rp = relatedInMatch[ri3];
            var rpCost = estimatePurchaseCost(rp.name, related.rows, relatedPriceField);
            groupProfitResults.push(
              calculateProfit({
                productName: rp.name,
                platform: relatedPlatform as "tmall" | "taobao" | "jd" | "pdd" | "douyin",
                sellPrice: rp.price,
                purchaseCost: rpCost,
                monthlySales: rp.monthlySales,
              }),
            );
          }

          var comparison = buildCrossPlatformComparison(match, groupProfitResults);
          if (comparison) {
            crossPlatformComparisons.push(comparison);
          }
        }

        logger.info("Cross-platform profit comparison computed", {
          currentPlatform: platform,
          relatedPlatform: relatedPlatform,
          matches: matches.length,
          comparisons: crossPlatformComparisons.length,
        });
      } catch (e) {
        logger.warn("Cross-platform comparison failed for " + cd.relatedDatasetId, {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  // ═══ Layer 5: AI解释（DeepSeek为主体） ═══
  const knowledgeInjection = await injectKnowledgeV3(input, "", {
    columns,
    sampleRows: rows.slice(0, 5),
    platformHint: platform || undefined,
  });

  const aiExplanation = await generateAIExplanation({
    input,
    metrics: productMetrics,
    storeMetrics,
    profitResults,
    evidenceCards,
    diagnoses,
    applicableRules,
    knowledgeBlock: knowledgeInjection.knowledgeBlock,
    industry: industry.name,
    crossDatasets: crossDatasetSummaries.length > 0 ? crossDatasetSummaries : undefined,
    crossPlatformComparisons: crossPlatformComparisons.length > 0 ? crossPlatformComparisons : undefined,
  });

  // ═══ Layer 6: 行动建议 ═══
  const rawActions = generateActions(diagnoses);
  const actions = enrichActions(rawActions, evidenceCards, applicableRules);

  // ═══ Layer 7: 组装 ═══
  const pipelineLatency = Date.now() - startTime;

  logger.info("Decision pipeline executed", {
    datasetId,
    industry: industry.name,
    industryConfidence: industry.confidence,
    evidenceCards: evidenceCards.length,
    diagnoses: diagnoses.length,
    actions: actions.length,
    platform: platform || "unknown",
    pipelineLatency,
    webSearchTriggered: knowledgeInjection.stats.webSearchTriggered,
    crossPlatforms: crossPlatformComparisons.length,
    crossDatasets: crossDatasetSummaries.length,
  });

  return {
    metrics: {
      products: productMetrics,
      store: storeMetrics,
      profit: profitResults,
      crossPlatform: crossPlatformComparisons.length > 0 ? crossPlatformComparisons : undefined,
    },
    diagnoses,
    evidenceCards,
    applicableRules,
    aiExplanation,
    actions,
    crossDataset: crossDatasetSummaries.length > 0 ? crossDatasetSummaries : undefined,
    meta: {
      industry,
      knowledgeCoverage: assessKnowledgeCoverage(
        industry,
        knowledgeInjection.injectedEntries.length,
      ).message,
      freshnessScore: knowledgeInjection.stats.freshnessScore,
      webSearchTriggered: knowledgeInjection.stats.webSearchTriggered || false,
      webSearchResults: knowledgeInjection.stats.webSearchResults,
      pipelineLatency,
    },
  };
}

// ═══════════════════════════════════════════════
// Layer 0: Data Loading
// ═══════════════════════════════════════════════

async function loadDataset(
  datasetId: string,
): Promise<Record<string, unknown> | null> {
  // Try Supabase first
  try {
    const ds = await getDataset(datasetId);
    if (ds) return ds as unknown as Record<string, unknown>;
  } catch (e) {
    logger.info("Supabase unavailable for pipeline, trying in-memory store");
  }

  // Fall back to in-memory store
  const memDs = getFromServerStore(datasetId);
  if (memDs) return memDs as unknown as Record<string, unknown>;

  return null;
}

function normalizeData(
  ds: Record<string, unknown>,
): NormalizedDataset {
  // Handle different data shapes from Supabase vs in-memory store
  const columns: string[] = Array.isArray(ds.columns)
    ? (ds.columns as string[])
    : typeof ds.columns === "string"
      ? JSON.parse(ds.columns as string)
      : [];
  const rows: Record<string, unknown>[] = Array.isArray(ds.rows) ? (ds.rows as Record<string, unknown>[]) : [];
  const originalName =
    (ds.original_name as string) || (ds.originalName as string) || (ds.name as string) || "Unnamed Dataset";

  return { columns, rows, originalName };
}

// ═══════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════

/** 从语义角色中查找指定角色的字段名 */
function findRoleField(roles: ColumnRole[], targetRole: string): string | null {
  const match = roles.find((r) => r.role === targetRole && r.confidence >= 0.6);
  return match ? match.column : null;
}

/** 从列名检测所属平台（复用 upload route 的检测逻辑） */
function detectPlatformFromColumns(columns: string[]): string {
  if (columns.some((c) => /tmall|天猫|淘宝|taobao|买家会员|买家实际支付/i.test(c))) return "tmall";
  if (columns.some((c) => /京东|jd|自营|pop/i.test(c))) return "jd";
  if (columns.some((c) => /拼多多|pdd|拼团|百亿补贴/i.test(c))) return "pdd";
  if (columns.some((c) => /抖音|douyin|达人|直播|千川|罗盘/i.test(c))) return "douyin";
  return "";
}

/** 从数据中估算进货成本 */
function estimatePurchaseCost(
  productName: string,
  rows: Record<string, unknown>[],
  priceField: string,
): number {
  // 尝试找成本相关列（成本/进价/cost/purchase）
  const costPatterns = [/成本|进价|进货|purchase_cost|cost_price|批发价/i];
  for (const pattern of costPatterns) {
    const costCol = Object.keys(rows[0] || {}).find((k) => pattern.test(k));
    if (costCol) {
      const productRows = rows.filter((r) => String(r[findNameField(rows)] || "") === productName);
      if (productRows.length > 0) {
        const costVal = Number(productRows[0][costCol]);
        if (!isNaN(costVal) && costVal > 0) return costVal;
      }
    }
  }

  // 无成本数据时，估算为售价的55%（行业常用的毛利率45%倒推）
  const productRows = rows.filter((r) => String(r[findNameField(rows)] || "") === productName);
  if (productRows.length > 0) {
    const price = Number(productRows[0][priceField]);
    if (!isNaN(price) && price > 0) return Math.round(price * 0.55 * 100) / 100;
  }

  return 0;
}

function findNameField(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const nameMatch = keys.find((k) => /名称|商品|产品|name|title|product|item/i.test(k));
  return nameMatch || keys[0] || "";
}

// ═══════════════════════════════════════════════
// Layer 3: Evidence Card Builder
// ═══════════════════════════════════════════════

function buildEvidenceCards(
  profitResults: ProfitResult[],
  platform: string,
): EvidenceCard[] {
  if (profitResults.length === 0) return [];

  return profitResults.map((r, index) => {
    // 构建成本归因
    const costAttribution = buildCostAttribution(r);

    // 提取关联规则ID
    const ruleIds = inferRuleIds(r, platform);

    const knowledgeRefs = findRelatedKnowledgeRefs(r);
    return {
      productName: r.productName,
      platform: r.platform,
      platformKey: r.platformKey,
      costBreakdown: {
        commissionFee: r.costs.commissionFee,
        fixedFeePerItem: r.costs.fixedFeePerItem,
        shippingInsurance: r.costs.shippingInsurance,
        influencerCommission: r.costs.influencerCommission,
        shippingCost: r.costs.shippingCost,
        adCost: r.costs.adCost,
        returnLoss: r.costs.returnLoss,
        taxComplianceCost: r.costs.taxComplianceCost,
        purchaseCost: r.purchaseCost,
        totalCost: r.costs.totalCost,
      },
      sellPrice: r.sellPrice,
      profit: {
        netPerItem: r.netProfitPerItem,
        netMonthly: r.netProfitMonthly,
        margin: r.profitMargin,
        roi: r.roi,
      },
      verdict: r.verdict,
      verdictConfidence: r.verdictConfidence,
      verdictReason: r.verdictReason,
      costAttribution,
      ruleIds,
      knowledgeRefs,
      knowledgeConfidence: getKnowledgeConfidence(knowledgeRefs),
      cardIndex: index,
    };
  });
}

/** 构建成本归因：计算每项成本占总成本的比例 */
function buildCostAttribution(r: ProfitResult): CostAttributionItem[] {
  const total =
    r.costs.totalCost > 0 ? r.costs.totalCost : r.costs.commissionFee + r.costs.fixedFeePerItem +
    r.costs.shippingInsurance + r.costs.influencerCommission + r.costs.shippingCost +
    r.costs.adCost + r.costs.returnLoss + r.costs.taxComplianceCost + r.purchaseCost;

  if (total <= 0) return [];

  const items: Array<{ label: string; value: number; benchmark: string | null }> = [
    { label: "进货成本", value: r.purchaseCost, benchmark: null },
    { label: "平台佣金", value: r.costs.commissionFee, benchmark: null },
    { label: "达人佣金", value: r.costs.influencerCommission,
      benchmark: r.costs.influencerCommission > 0
        ? r.platformKey === "douyin"
          ? r.costs.influencerCommission / r.sellPrice >= 0.30
            ? "⚠️ 达人佣金占比过高（≥30%），建议降级达人等级"
            : "达人佣金在合理范围内"
          : null
        : null },
    { label: "运费险", value: r.costs.shippingInsurance, benchmark: null },
    { label: "退货损耗", value: r.costs.returnLoss,
      benchmark: r.costs.returnLoss > 0 && r.costs.returnLoss / r.sellPrice > 0.10
        ? "⚠️ 退货损耗占售价超10%，检查产品质量或详情页描述"
        : null },
    { label: "固定费用", value: r.costs.fixedFeePerItem, benchmark: null },
    { label: "运费", value: r.costs.shippingCost, benchmark: null },
    { label: "广告费", value: r.costs.adCost, benchmark: null },
    { label: "财税合规成本", value: r.costs.taxComplianceCost,
      benchmark: r.costs.taxComplianceCost > 0
        ? "拼多多未开票冻结30%资金的隐性成本"
        : null },
  ];

  return items
    .filter((item) => item.value > 0.001 || item.benchmark)
    .map((item) => ({
      item: item.label,
      amount: Math.round(item.value * 100) / 100,
      percentage: Math.round((item.value / total) * 10000) / 100,
      benchmarkDeviation: item.benchmark || undefined,
    }));
}

/** 从判决结果推断触发的规则ID */
function inferRuleIds(r: ProfitResult, platform: string): string[] {
  const ids: string[] = [];

  if (r.verdict === "drop") {
    ids.push("RULE_NEGATIVE_MARGIN_SEVERE");
  } else if (r.verdict === "reduce") {
    ids.push(r.profitMargin < 0 ? "RULE_NEGATIVE_MARGIN" : "RULE_LOW_PROFIT");
  } else if (r.verdict === "buy_more") {
    ids.push("RULE_HIGH_ROI");
  }

  // 平台特定规则
  if (r.platformKey === "douyin" && r.costs.influencerCommission > 0) {
    const influencerRatio = r.costs.influencerCommission / r.sellPrice;
    if (influencerRatio >= 0.30) ids.push("RULE_DOUYIN_GRADE_D_WARNING");
    else if (influencerRatio >= 0.20) ids.push("RULE_DOUYIN_GRADE_C");
  }

  if (r.platformKey === "pdd" && r.costs.taxComplianceCost > 0) {
    ids.push("RULE_PDD_TAX_COMPLIANCE");
  }

  if (r.platformKey === "jd" && r.costs.fixedFeePerItem > 0 && r.profitMargin < 0.05) {
    ids.push("RULE_JD_FIXED_FEE_BURDEN");
  }

  return ids;
}

/** 查找关联的知识库条目 */
function findRelatedKnowledgeRefs(r: ProfitResult): string[] {
  const refs: string[] = [];

  // 平台费率知识
  if (r.platformKey === "tmall" || r.platformKey === "taobao") refs.push("platform_tmall_fee_2026");
  if (r.platformKey === "jd") refs.push("platform_jd_fee_2026");
  if (r.platformKey === "pdd") refs.push("platform_pdd_fee_2026");
  if (r.platformKey === "douyin") refs.push("platform_douyin_fee_2026");

  // 利润基准
  if (r.profitMargin < 0.05) refs.push("benchmark_profit_margin_by_category");
  if (r.costs.returnLoss > 0) refs.push("benchmark_return_rate_by_category");
  if (r.costs.influencerCommission > 0) refs.push("platform_douyin_influencer");

  return refs;
}

/** 获取知识库条目的置信度（用于EvidenceCard的knowledgeConfidence字段） */
function getKnowledgeConfidence(refs: string[]): Array<{ refId: string; confidence: number }> {
  const result: Array<{ refId: string; confidence: number }> = [];
  for (var r = 0; r < refs.length; r++) {
    var entry = KNOWLEDGE.find(function(k) { return k.id === refs[r]; });
    if (entry) {
      result.push({ refId: refs[r], confidence: entry.confidence });
    }
  }
  return result;
}

// ═══════════════════════════════════════════════
// Layer 4: Applicable Rule Extractor
// ═══════════════════════════════════════════════

function extractApplicableRules(
  evidenceCards: EvidenceCard[],
  platform: string,
  diagnoses: Diagnosis[],
): ApplicableRule[] {
  const rules: ApplicableRule[] = [];
  const seenIds = new Set<string>();

  // 平台费率规则（始终触发）
  if (platform && PLATFORM_FEES_2026[platform]) {
    const config = PLATFORM_FEES_2026[platform];
    const ruleId = `RULE_PLATFORM_${platform.toUpperCase()}_FEE_2026`;
    if (!seenIds.has(ruleId)) {
      seenIds.add(ruleId);
      rules.push({
        ruleId,
        ruleName: `${config.platformName}2026年费率规则`,
        ruleContent: `佣金${config.commissionRateMin * 100}-${config.commissionRateMax * 100}%（典型${config.commissionRateTypical * 100}%），结算周期：${config.settlementDays}。${config.policy2026}`,
        source: "platform_fee_engine",
        sourceId: platform,
        confidence: 0.95,
        appliedToCardIndices: evidenceCards.map((c) => c.cardIndex),
      });
    }

    // 抖音达人分级规则
    if (platform === "douyin" && config.influencerGradeRates) {
      const gradeRuleId = "RULE_DOUYIN_INFLUENCER_GRADE_2026";
      if (!seenIds.has(gradeRuleId)) {
        seenIds.add(gradeRuleId);
        rules.push({
          ruleId: gradeRuleId,
          ruleName: "抖音达人佣金分级制（2026年6月生效）",
          ruleContent: `A级${config.influencerGradeRates.A * 100}%+返现、B+级${config.influencerGradeRates.B_plus * 100}%、C级${config.influencerGradeRates.C * 100}%、D级${config.influencerGradeRates.D * 100}%。选择达人等级直接影响利润3-4倍差距。`,
          source: "platform_fee_engine",
          sourceId: "douyin",
          confidence: 0.90,
          appliedToCardIndices: evidenceCards.map((c) => c.cardIndex),
        });
      }
    }
  }

  // 从证据卡提取的规则
  for (const card of evidenceCards) {
    for (const ruleId of card.ruleIds) {
      if (!seenIds.has(ruleId)) {
        seenIds.add(ruleId);
        const ruleDef = getRuleDefinition(ruleId);
        if (ruleDef) {
          rules.push({
            ...ruleDef,
            appliedToCardIndices: [card.cardIndex],
          });
        }
      } else {
        // 追加适用卡索引
        const existing = rules.find((r) => r.ruleId === ruleId);
        if (existing && !existing.appliedToCardIndices.includes(card.cardIndex)) {
          existing.appliedToCardIndices.push(card.cardIndex);
        }
      }
    }
  }

  // 从诊断提取的规则
  for (const d of diagnoses) {
    const ruleId = `RULE_DIAGNOSIS_${d.type.toUpperCase()}`;
    if (!seenIds.has(ruleId)) {
      seenIds.add(ruleId);
      rules.push({
        ruleId,
        ruleName: d.title,
        ruleContent: d.detail,
        source: "diagnosis_engine",
        confidence: d.level === "critical" ? 0.9 : d.level === "warning" ? 0.75 : 0.65,
        appliedToCardIndices: [],
      });
    }
  }

  return rules;
}

/** 规则定义字典 */
function getRuleDefinition(
  ruleId: string,
): Pick<ApplicableRule, "ruleId" | "ruleName" | "ruleContent" | "source" | "confidence"> | null {
  const definitions: Record<string, Pick<ApplicableRule, "ruleId" | "ruleName" | "ruleContent" | "source" | "confidence">> = {
    RULE_NEGATIVE_MARGIN_SEVERE: {
      ruleId: "RULE_NEGATIVE_MARGIN_SEVERE",
      ruleName: "严重亏损预警",
      ruleContent: "单品利润率低于-10%，属于严重亏损。建议立即停止采购、大幅提价、或与供应商谈判降价。持续亏损将直接影响整体经营现金流。",
      source: "verdict_engine",
      confidence: 0.90,
    },
    RULE_NEGATIVE_MARGIN: {
      ruleId: "RULE_NEGATIVE_MARGIN",
      ruleName: "微亏预警",
      ruleContent: "单品利润为负但亏损幅度较小。建议减量观察、尝试小幅提价、或寻找更低成本的进货渠道。",
      source: "verdict_engine",
      confidence: 0.75,
    },
    RULE_LOW_PROFIT: {
      ruleId: "RULE_LOW_PROFIT",
      ruleName: "低利润品预警",
      ruleContent: "单品利润率低于健康水平（<5%）。虽未亏损，但扣除隐性成本（人工/仓储/资金占用）后实际可能已接近盈亏线。建议评估优化空间。",
      source: "verdict_engine",
      confidence: 0.60,
    },
    RULE_HIGH_ROI: {
      ruleId: "RULE_HIGH_ROI",
      ruleName: "高利润品机会",
      ruleContent: "单品利润率>20%且ROI>30%，属于高利润优质品。建议加量采购、多平台铺货、适当增加推广预算以放大利润。",
      source: "verdict_engine",
      confidence: 0.85,
    },
    RULE_DOUYIN_GRADE_D_WARNING: {
      ruleId: "RULE_DOUYIN_GRADE_D_WARNING",
      ruleName: "抖音D级达人高佣警告",
      ruleContent: "达人佣金占售价≥30%，可能使用了D级达人（40%佣金率）。建议降级至B+级（15%）或C级（20%），或转为自播以节省佣金成本。A级达人10%+返现是最优选择。",
      source: "platform_fee_engine",
      confidence: 0.85,
    },
    RULE_DOUYIN_GRADE_C: {
      ruleId: "RULE_DOUYIN_GRADE_C",
      ruleName: "抖音达人佣金基准提醒",
      ruleContent: "达人佣金占售价≥20%，处于C级或以上。建议评估达人带来的销量是否足以覆盖佣金成本，考虑升级至A级（10%+返现）或降级达人。",
      source: "platform_fee_engine",
      confidence: 0.75,
    },
    RULE_PDD_TAX_COMPLIANCE: {
      ruleId: "RULE_PDD_TAX_COMPLIANCE",
      ruleName: "拼多多财税合规成本",
      ruleContent: "因未开票导致资金被冻结30%，产生隐性资金成本。建议尽快完成税务登记和开票资质，释放被冻结资金。按年销售额¥100万计算，冻结资金¥30万的年化资金成本约¥1,500-3,000。",
      source: "platform_fee_engine",
      confidence: 0.80,
    },
    RULE_JD_FIXED_FEE_BURDEN: {
      ruleId: "RULE_JD_FIXED_FEE_BURDEN",
      ruleName: "京东月费分摊负担",
      ruleContent: "京东月费¥1,000分摊到低销量单品上导致单位成本偏高。如月销量<100件，月费分摊>¥10/件，对低利润品影响显著。建议评估是否值得在京东继续销售该品，或提升销量以摊薄固定成本。",
      source: "platform_fee_engine",
      confidence: 0.70,
    },
  };

  return definitions[ruleId] || null;
}

// ═══════════════════════════════════════════════
// Layer 6: Action Enricher
// ═══════════════════════════════════════════════

function enrichActions(
  actions: Action[],
  evidenceCards: EvidenceCard[],
  applicableRules: ApplicableRule[],
): PrioritizedAction[] {
  return actions.map((action, index) => {
    // 找到关联的证据卡 — 使用精确匹配策略
    // action.target 来自 generateActions: d.products.join(",")，可能包含多个商品名
    const targetProducts = action.target
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const relatedCards = evidenceCards.filter((c) => {
      // 策略1: action.target 精确包含证据卡的商品名
      if (targetProducts.some((tp) => c.productName === tp || tp.includes(c.productName))) {
        return true;
      }
      // 策略2: 诊断reason的前20字符匹配证据卡的verdictReason（同一商品→同一原因链）
      if (
        action.reason.length > 5 &&
        c.verdictReason.length > 0 &&
        (c.verdictReason.includes(action.reason.substring(0, Math.min(20, action.reason.length))) ||
          action.reason.includes(c.productName))
      ) {
        return true;
      }
      return false;
    });

    const evidenceRefs = relatedCards.map((c) => c.cardIndex);

    // 找到关联的规则
    const relatedRuleIds = applicableRules
      .filter((r) =>
        evidenceRefs.some((ci) => r.appliedToCardIndices.includes(ci)),
      )
      .map((r) => r.ruleId);

    // 估算预期收益 — 从诊断原文解析，不使用时汇总月利润的误导性回退
    let expectedProfitImpact = 0;
    const impactMatch = action.expected_impact?.match(/¥?(\d[\d,.]*)/);
    if (impactMatch) {
      expectedProfitImpact = parseFloat(impactMatch[1].replace(/,/g, ""));
    }

    // 回退策略：仅当诊断原文中有明确数字且关联证据卡时，使用保守估算
    if (expectedProfitImpact === 0 && relatedCards.length > 0) {
      // 按诊断类型采用不同的保守估算
      // 不是取"总月利润"（那会误导），而是估算行动的边际影响
      for (const card of relatedCards) {
        if (card.verdict === "buy_more") {
          // 加量采购：预期收益 ≈ 扩量后的边际利润（保守估算为当前月利润的20%）
          expectedProfitImpact += Math.abs(card.profit.netMonthly) * 0.2;
        } else if (card.verdict === "drop") {
          // 止损：预期收益 ≈ 停止亏损节省的金额（等于当前月亏损额）
          expectedProfitImpact += Math.abs(Math.min(0, card.profit.netMonthly));
        } else {
          // hold/reduce：保守估算变动10%
          expectedProfitImpact += Math.abs(card.profit.netMonthly) * 0.1;
        }
      }
    }

    // 风险等级
    const riskLevel = action.priority === "P0"
      ? "high"
      : action.priority === "P1"
        ? "medium"
        : "low";

    return {
      ...action,
      evidenceRefs,
      diagnosisRef: action.reason,
      ruleIds: relatedRuleIds,
      expectedProfitImpact: Math.round(expectedProfitImpact * 100) / 100,
      riskLevel,
    };
  });
}
