/**
 * ProcureWise AI解释层 v1.0
 *
 * 关键变化（v1→v2）：
 *   不再把"原始数据+知识"一股脑扔给DeepSeek。
 *   而是给DeepSeek一个结构化的、分层级的分析上下文，
 *   让它基于已经计算好的指标/诊断/证据/规则来做解释和判断。
 *
 * 角色：DeepSeek V4 是"首席采购决策分析师"
 *      已有的指标/诊断/证据/规则是"分析师的参考资料"
 *      AI的任务是：综合、解释、判断、建议
 */

import type { ProductMetrics, StoreMetrics } from "@/lib/engines/metrics-engine";
import type { Diagnosis } from "@/lib/engines/diagnosis-engine";
import type { ProfitResult } from "@/lib/profit/engine";
import { getClient, withRetry } from "@/lib/agent/llm";
import type {
  AIExplanation,
  AIExplanationContext,
  EvidenceCard,
  ApplicableRule,
  ReasoningStep,
  CrossDatasetSummary,
} from "./types";
import type { CrossPlatformComparison } from "@/lib/cross-platform";

// ═══════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════

export async function generateAIExplanation(
  context: AIExplanationContext,
): Promise<AIExplanation> {
  const systemPrompt = buildStructuredSystemPrompt(context);

  const client = getClient();
  const res = await withRetry(
    () =>
      client.chat.completions.create({
        model: "deepseek-v4-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context.input || "请分析这些数据，给出经营决策建议" },
        ],
        temperature: 0.2,
        max_tokens: 8000,
      }),
    2,
    "ai-explanation",
  );

  const reply = res.choices[0]?.message?.content || "";

  return {
    summary: reply,
    reasoningChain: extractReasoningSteps(reply, context),
    confidence: estimateOverallConfidence(context),
  };
}

// ═══════════════════════════════════════════════
// 结构化System Prompt构建
// ═══════════════════════════════════════════════

function buildStructuredSystemPrompt(context: AIExplanationContext): string {
  const parts: string[] = [];

  // ═══ 角色定义 ═══
  parts.push(`## 🤖 你的角色：ProcureWise首席采购决策分析师

你本身就是覆盖千行百业的电商利润分析专家。你的训练数据涵盖了工业品、消费品、
农产品、医疗器械等数千个行业的利润结构和经营逻辑。

当前用户行业：**${context.industry}**

你的任务是：基于以下已经精确计算好的指标、诊断、证据和规则，
给出专业的综合解释和可执行的经营建议。

**关键原则**：下面的所有数据都是经过规则引擎精确计算的，你可以信任它们。
你的价值不在于"算数字"（那已经做好了），而在于"解释数字背后的含义"
和"告诉用户下一步该怎么做"。`);

  // ═══ Layer 1: 指标 ═══
  parts.push(formatMetricsSection(context.metrics, context.storeMetrics, context.profitResults));

  // ═══ Layer 2: 诊断 ═══
  parts.push(formatDiagnosesSection(context.diagnoses));

  // ═══ Layer 3: 证据卡 ═══
  parts.push(formatEvidenceCardsSection(context.evidenceCards));

  // ═══ Layer 4: 适用规则 ═══
  parts.push(formatRulesSection(context.applicableRules));

  // ═══ Layer 4.5: 跨数据集对比 ═══
  if (context.crossDatasets && context.crossDatasets.length > 0) {
    parts.push(formatCrossDatasetSection(context.crossDatasets));
  }

  // ═══ Layer 4.6: 跨平台利润对比 ═══
  if (context.crossPlatformComparisons && context.crossPlatformComparisons.length > 0) {
    parts.push(formatCrossPlatformSection(context.crossPlatformComparisons));
  }

  // ═══ Layer 5: 参考知识 ═══
  parts.push(context.knowledgeBlock);

  // ═══ 分析指令 ═══
  parts.push(formatAnalysisInstructions(context));

  return parts.join("\n\n");
}

// ═══════════════════════════════════════════════
// 各层格式化函数
// ═══════════════════════════════════════════════

function formatMetricsSection(
  products: ProductMetrics[],
  store: StoreMetrics,
  profitResults: ProfitResult[],
): string {
  let section = "## 📊 第一层：指标（已精确计算，可直接引用）\n\n";

  // ═══ 店铺级指标 ═══
  section += "### 店铺总览\n";
  section += `- GMV：¥${store.gmv.toLocaleString()}\n`;
  section += `- 订单数：${store.orderCount}\n`;
  section += `- 客单价：¥${store.avgOrderValue.toFixed(2)}\n`;
  section += `- 商品总数：${products.length} 个\n`;
  section += `- TOP3 SKU占比：${store.topSkuRatio}%（${store.topSkuRatio > 60 ? "⚠️ 爆款依赖风险" : store.topSkuRatio > 40 ? "适度集中" : "分散"}）\n`;
  section += `- 长尾SKU占比：${store.longTailRatio}%（${store.longTailRatio > 60 ? "⚠️ 长尾冗余" : "健康"}）\n`;

  // 营收集中度分析
  if (products.length >= 5) {
    const top1Share = products[0]?.contribution || 0;
    const top5Share = products.slice(0, 5).reduce(function(s, p) { return s + p.contribution; }, 0);
    const bottom5Share = products.slice(-5).reduce(function(s, p) { return s + p.contribution; }, 0);
    section += `- 营收集中度：TOP1占${top1Share}% · TOP5占${top5Share}% · 末5位仅占${bottom5Share}%\n`;
  }

  // 库存健康概览
  const withStock = products.filter(function(p) { return p.stock !== undefined && p.stock > 0; });
  if (withStock.length > 0) {
    const lowStock = withStock.filter(function(p) { return p.stock! < 10 && (p.turnover || 0) > 3; });
    const deadStock = withStock.filter(function(p) { return (p.turnover || 0) < 0.5 && p.stock! > 20; });
    const totalInventoryValue = withStock.reduce(function(s, p) { return s + (p.avgPrice * (p.stock || 0)); }, 0);
    section += `- 库存总价值：约¥${Math.round(totalInventoryValue).toLocaleString()} · `;
    section += `缺货风险品：${lowStock.length}个 · 滞销品：${deadStock.length}个\n`;
  }
  section += "\n";

  // ═══ 商品级指标 ═══
  // Top 10 营收排行
  const topProducts = products.slice(0, Math.min(10, products.length));
  section += "### 商品营收排行 TOP" + topProducts.length + "\n\n";
  section += "| 排名 | 商品 | 营收(¥) | 销量 | 均价(¥) | 贡献度 | 库存 | 周转率 |\n";
  section += "|------|------|---------|------|---------|--------|------|--------|\n";
  for (var ti = 0; ti < topProducts.length; ti++) {
    var p = topProducts[ti];
    var stockStr = p.stock !== undefined ? String(p.stock) : "-";
    var turnoverStr = p.turnover !== undefined ? p.turnover.toFixed(1) : "-";
    section += `| ${ti + 1} | ${p.name} | ${p.revenue.toLocaleString()} | ${p.sales} | ${p.avgPrice.toFixed(2)} | ${p.contribution}% | ${stockStr} | ${turnoverStr} |\n`;
  }
  section += "\n";

  // 底部5名（低贡献品）
  if (products.length > 5) {
    const bottomProducts = products.slice(-5).reverse();
    section += "### 营收末5位（低贡献品）\n\n";
    section += "| 排名 | 商品 | 营收(¥) | 销量 | 均价(¥) | 贡献度 |\n";
    section += "|------|------|---------|------|---------|--------|\n";
    for (var bi = 0; bi < bottomProducts.length; bi++) {
      var bp = bottomProducts[bi];
      section += `| ${products.length - 5 + bi + 1} | ${bp.name} | ${bp.revenue.toLocaleString()} | ${bp.sales} | ${bp.avgPrice.toFixed(2)} | ${bp.contribution}% |\n`;
    }
    section += "\n";
  }

  // ═══ 产品分级 ═══
  // 按营收-贡献度将产品分为4个象限
  if (products.length >= 4) {
    var avgContribution = 100 / products.length;
    var stars = products.filter(function(p) { return p.contribution > avgContribution * 1.5 && p.contribution > 5; });
    var cashCows = products.filter(function(p) { return p.contribution > avgContribution && p.contribution <= avgContribution * 1.5; });
    var questionMarks = products.filter(function(p) { return p.contribution <= avgContribution && p.contribution > 1; });
    var dogs = products.filter(function(p) { return p.contribution <= 1; });

    section += "### 产品矩阵分级（基于营收贡献度）\n\n";
    section += "> 用于理解产品组合健康度。贡献度 = 单品营收 ÷ 总营收 × 100%\n\n";
    section += `- 🌟 **明星产品**（贡献度>${(avgContribution * 1.5).toFixed(1)}%）：${stars.length}个 — ${stars.map(function(s) { return s.name; }).join("、") || "无"}\n`;
    section += `- 💰 **现金牛**（贡献度${avgContribution.toFixed(1)}%-${(avgContribution * 1.5).toFixed(1)}%）：${cashCows.length}个 — ${cashCows.map(function(c) { return c.name; }).join("、") || "无"}\n`;
    section += `- ❓ **问题产品**（贡献度1%-${avgContribution.toFixed(1)}%）：${questionMarks.length}个\n`;
    section += `- 🐕 **瘦狗产品**（贡献度<1%）：${dogs.length}个 — ${dogs.map(function(d) { return d.name; }).join("、") || "无"}\n`;
    section += "\n";
  }

  // ═══ 利润结果摘要 ═══
  if (profitResults.length > 0) {
    // 利润总览
    var totalMonthlyProfit = profitResults.reduce(function(s, r) { return s + r.netProfitMonthly; }, 0);
    var profitCount = profitResults.filter(function(r) { return r.netProfitPerItem > 0; }).length;
    var lossCount = profitResults.filter(function(r) { return r.netProfitPerItem <= 0; }).length;
    var totalMonthlyLoss = profitResults.filter(function(r) { return r.netProfitMonthly < 0; }).reduce(function(s, r) { return s + Math.abs(r.netProfitMonthly); }, 0);
    var avgMargin = profitResults.length > 0 ? profitResults.reduce(function(s, r) { return s + r.profitMargin; }, 0) / profitResults.length : 0;

    section += "### 利润总览\n\n";
    section += `- 合计月利润：${totalMonthlyProfit >= 0 ? "+" : "−"}¥${Math.abs(Math.round(totalMonthlyProfit)).toLocaleString()}\n`;
    section += `- 盈利品：${profitCount}个 · 亏损品：${lossCount}个\n`;
    section += `- 平均利润率：${avgMargin >= 0 ? "+" : "−"}${Math.abs(avgMargin).toFixed(1)}%\n`;
    section += `- 月亏损总额：−¥${Math.round(totalMonthlyLoss).toLocaleString()}\n`;
    section += `- 利润率分布：最高 ${Math.max.apply(null, profitResults.map(function(r) { return r.profitMargin; })).toFixed(1)}% · 最低 ${Math.min.apply(null, profitResults.map(function(r) { return r.profitMargin; })).toFixed(1)}%\n\n`;

    // 利润排行表（含判决）
    section += "### 商品利润排行\n\n";
    section += "| 商品 | 平台 | 售价(¥) | 单品利润(¥) | 利润率 | 月利润(¥) | 判决 |\n";
    section += "|------|------|---------|------------|--------|----------|------|\n";
    var sortedByProfit = profitResults.slice().sort(function(a, b) { return b.netProfitMonthly - a.netProfitMonthly; });
    for (var ri = 0; ri < Math.min(sortedByProfit.length, 12); ri++) {
      var r = sortedByProfit[ri];
      var vIcon = r.verdict === "buy_more" ? "📈" : r.verdict === "hold" ? "✅" : r.verdict === "reduce" ? "⚠️" : "🛑";
      section += `| ${r.productName} | ${r.platform} | ${r.sellPrice.toFixed(2)} | ${r.netProfitPerItem >= 0 ? "+" : "−"}${Math.abs(r.netProfitPerItem).toFixed(2)} | ${r.profitMargin >= 0 ? "+" : "−"}${Math.abs(r.profitMargin).toFixed(1)}% | ${r.netProfitMonthly >= 0 ? "+" : "−"}${Math.abs(Math.round(r.netProfitMonthly)).toLocaleString()} | ${vIcon} ${r.verdict} |\n`;
    }
    section += "\n";
  }

  return section;
}

function formatDiagnosesSection(diagnoses: Diagnosis[]): string {
  if (diagnoses.length === 0) {
    return "## 🔬 第二层：诊断\n\n✅ 未检测到需要关注的问题。所有指标在健康范围内。";
  }

  let section = "## 🔬 第二层：诊断（自动检测到的问题）\n\n";

  const critical = diagnoses.filter((d) => d.level === "critical");
  const warnings = diagnoses.filter((d) => d.level === "warning");
  const opportunities = diagnoses.filter((d) => d.level === "opportunity");

  if (critical.length > 0) {
    section += "### 🔴 紧急\n";
    for (const d of critical) {
      section += `- **${d.title}**：${d.detail}`;
      if (d.action) section += `\n  → 建议行动：${d.action}`;
      if (d.impact) section += `\n  → 预期影响：${d.impact}`;
      if (d.reference) section += `\n  → 📎 ${d.reference}`;
      section += "\n";
    }
    section += "\n";
  }

  if (warnings.length > 0) {
    section += "### 🟡 警告\n";
    for (const d of warnings) {
      section += `- **${d.title}**：${d.detail}`;
      if (d.action) section += `\n  → 建议行动：${d.action}`;
      if (d.reference) section += `\n  → 📎 ${d.reference}`;
      section += "\n";
    }
    section += "\n";
  }

  if (opportunities.length > 0) {
    section += "### 🟢 机会\n";
    for (const d of opportunities) {
      section += `- **${d.title}**：${d.detail}`;
      if (d.action) section += `\n  → 建议行动：${d.action}`;
      if (d.impact) section += `\n  → 预期影响：${d.impact}`;
      section += "\n";
    }
    section += "\n";
  }

  return section;
}

function formatEvidenceCardsSection(cards: EvidenceCard[]): string {
  if (cards.length === 0) {
    return "## 📋 第三层：证据卡\n\n（当前数据不足以构建证据卡——可能缺少价格或成本字段）";
  }

  // 汇总统计：检测系统性问题
  const lossCards = cards.filter(function(c) { return c.profit.netPerItem < 0; });
  const jdCards = cards.filter(function(c) { return c.platformKey === "jd"; });
  const jdLossCards = jdCards.filter(function(c) { return c.profit.netPerItem < 0; });

  let section = "## 📋 第三层：证据卡（每件商品×平台 的成本明细）\n\n";
  section += "> 以下是规则引擎精确计算的成本和利润数据。每个数字都可以追溯到具体成本项。\n";
  section += `> 共 ${cards.length} 张证据卡：盈利 ${cards.length - lossCards.length} 个 · 亏损 ${lossCards.length} 个\n\n`;

  // 系统性问题预警
  if (jdLossCards.length > 0 && jdLossCards.length === jdCards.length) {
    const avgFixedFee = jdCards.reduce(function(s, c) { return s + c.costBreakdown.fixedFeePerItem; }, 0) / jdCards.length;
    section += `### ⚠️ 系统性问题预警\n\n`;
    section += `**京东平台全部 ${jdCards.length} 个商品均亏损。**根本原因：京东月费 ¥1,000 分摊到低销量单品，平均每件负担 ¥${avgFixedFee.toFixed(0)} 的固定费用。\n`;
    section += `这不是个别商品的问题，而是**平台固定成本结构 × 低销量** 导致的系统性亏损。\n`;
    section += `→ 月销量需达到 100 件以上才能将固定费用摊薄至 ¥10/件以下。\n`;
    section += `→ 或者评估是否需要用京东POP模式销售该品类，考虑转向无月费的淘宝/拼多多。\n\n`;
  }

  for (var ci = 0; ci < cards.length; ci++) {
    var card = cards[ci];
    section += `### 证据卡 #${card.cardIndex}：${card.productName} · ${card.platform}\n\n`;

    // 基本信息
    section += `- 售价：¥${card.sellPrice.toFixed(2)}\n`;
    section += `- 进货成本：¥${card.costBreakdown.purchaseCost.toFixed(2)}${card.purchaseCostEstimated ? " ⚠️ 估算值（数据中无进价列，按售价55%估算）" : ""}\n`;
    section += `- 判决：${card.verdict}（置信度${Math.round(card.verdictConfidence * 100)}%）\n`;
    section += `- 单品利润：${card.profit.netPerItem >= 0 ? "+" : "−"}¥${Math.abs(card.profit.netPerItem).toFixed(2)}\n`;
    section += `- 利润率：${card.profit.margin >= 0 ? "+" : "−"}${Math.abs(card.profit.margin).toFixed(1)}%\n`;
    section += `- 月利润：${card.profit.netMonthly >= 0 ? "+" : "−"}¥${Math.abs(card.profit.netMonthly).toFixed(0)}\n`;
    // 月销量反推
    var monthlySales = 0;
    if (Math.abs(card.profit.netPerItem) > 0.01) {
      monthlySales = Math.round(Math.abs(card.profit.netMonthly / card.profit.netPerItem));
      section += `- 月销量：约 ${monthlySales} 件\n`;
    }
    section += "\n";

    // 成本归因表
    section += "**成本归因（每项占总成本的百分比）：**\n\n";
    section += "| 成本项 | 金额(¥) | 占比 | 说明 |\n";
    section += "|--------|---------|------|------|\n";
    var maxAttr = card.costAttribution.length > 0 ? card.costAttribution[0] : null;
    for (var ai = 0; ai < card.costAttribution.length; ai++) {
      var attr = card.costAttribution[ai];
      if (!maxAttr || attr.percentage > maxAttr.percentage) {
        maxAttr = attr;
      }
      var note = attr.benchmarkDeviation ? " " + attr.benchmarkDeviation : "";
      section += `| ${attr.item} | ${attr.amount.toFixed(2)} | ${attr.percentage.toFixed(1)}% |${note} |\n`;
    }

    // 🔑 关键：标注最大成本驱动项
    if (maxAttr && maxAttr.percentage > 30) {
      section += `\n> 🔑 **最大成本驱动：${maxAttr.item}** — 占总成本的 ${maxAttr.percentage.toFixed(1)}%，金额 ¥${maxAttr.amount.toFixed(2)}/件。`;
      if (maxAttr.item.includes("固定费用") && card.platformKey === "jd") {
        var feePerItem = card.costBreakdown.fixedFeePerItem;
        section += `\n> 📌 这是京东月费 ¥1,000 分摊到 ${monthlySales || "?"} 件的单品负担。若月销提升至 100 件，该项将降至 ¥10.00/件。`;
      }
      if (maxAttr.item.includes("进货") && card.purchaseCostEstimated) {
        section += `\n> ⚠️ 注意：进货成本为估算值（按售价55%倒推），可能与实际有偏差。建议在数据中补充"进价"列以获取精确利润。`;
      }
      section += "\n";
    }

    // 关联规则
    if (card.ruleIds.length > 0) {
      section += `\n关联规则：${card.ruleIds.join("、")}\n`;
    }

    // 知识库参考（含置信度）
    if (card.knowledgeRefs.length > 0) {
      section += `知识参考：`;
      var refDetails: string[] = [];
      for (var ri2 = 0; ri2 < card.knowledgeRefs.length; ri2++) {
        var ref = card.knowledgeRefs[ri2];
        var confEntry = card.knowledgeConfidence
          ? card.knowledgeConfidence.find(function(k) { return k.refId === ref; })
          : undefined;
        var confStr = confEntry
          ? " (置信度" + Math.round(confEntry.confidence * 100) + "%)"
          : "";
        refDetails.push(ref + confStr);
      }
      section += refDetails.join("、") + "\n";
    }

    section += "\n---\n\n";
  }

  return section;
}

function formatRulesSection(rules: ApplicableRule[]): string {
  if (rules.length === 0) {
    return "## 📐 第四层：适用规则\n\n（暂无特殊规则被触发）";
  }

  let section = "## 📐 第四层：适用规则（被触发的经营规则）\n\n";

  for (const rule of rules) {
    const sourceLabel =
      rule.source === "platform_fee_engine"
        ? "平台费率引擎"
        : rule.source === "knowledge_entry"
          ? "知识库"
          : rule.source === "verdict_engine"
            ? "判决引擎"
            : "诊断引擎";
    section += `- **${rule.ruleId}**：${rule.ruleName}\n`;
    section += `  ${rule.ruleContent}\n`;
    section += `  来源：${sourceLabel} · 置信度：${Math.round(rule.confidence * 100)}%\n`;
    if (rule.appliedToCardIndices.length > 0) {
      section += `  适用证据卡：#${rule.appliedToCardIndices.join("、#")}\n`;
    }
    section += "\n";
  }

  return section;
}

/** 格式化跨数据集对比数据 */
function formatCrossDatasetSection(crossDatasets: CrossDatasetSummary[]): string {
  let section = "## 🔗 跨数据集对比（检测到关联数据）\n\n";

  for (const cd of crossDatasets) {
    section += `### 关联数据集：${cd.relatedDatasetName}\n\n`;
    section += `- 关系类型：利润对比分析\n`;
    section += `- 实体重叠：${cd.entityOverlap.matched} 个商品匹配（覆盖率 ${cd.entityOverlap.overlapRate}%）\n`;
    section += `  - 当前数据集独有：${cd.entityOverlap.totalCurrent - cd.entityOverlap.matched} 个商品\n`;
    section += `  - 关联数据集独有：${cd.entityOverlap.totalRelated - cd.entityOverlap.matched} 个商品\n\n`;

    // 价格对比表
    if (cd.priceComparisons.length > 0) {
      section += "**价格对比（匹配商品在两份数据中的均价差异）：**\n\n";
      section += "| 商品 | 当前均价(¥) | 关联均价(¥) | 价差(¥) | 价差% |\n";
      section += "|------|------------|------------|---------|-------|\n";
      for (const pc of cd.priceComparisons) {
        const arrow = pc.diff > 0 ? "📈" : pc.diff < 0 ? "📉" : "➡️";
        section += `| ${pc.entity} | ${pc.priceCurrent.toFixed(2)} | ${pc.priceRelated.toFixed(2)} | ${arrow} ${pc.diff >= 0 ? "+" : ""}${pc.diff.toFixed(2)} | ${pc.diffPercent >= 0 ? "+" : ""}${pc.diffPercent}% |\n`;
      }
      section += "\n";
    }

    // 销量对比表
    if (cd.quantityComparisons.length > 0) {
      section += "**销量对比（匹配商品在两份数据中的销量差异）：**\n\n";
      section += "| 商品 | 当前销量 | 关联销量 | 销量差 |\n";
      section += "|------|---------|---------|--------|\n";
      for (const qc of cd.quantityComparisons) {
        const arrow = qc.gap > 0 ? "📈" : qc.gap < 0 ? "📉" : "➡️";
        section += `| ${qc.entity} | ${qc.qtyCurrent} | ${qc.qtyRelated} | ${arrow} ${qc.gap >= 0 ? "+" : ""}${qc.gap} |\n`;
      }
      section += "\n";
    }

    section += "> 关键分析任务：比较同一商品在不同平台的定价和销量差异，识别跨平台价格不一致风险和利润优化机会。\n\n";
  }

  return section;
}

/** 格式化跨平台利润对比数据 */
function formatCrossPlatformSection(comparisons: CrossPlatformComparison[]): string {
  let section = "## 🏪 跨平台利润对比（相同商品在不同平台的利润差异）\n\n";

  for (const cmp of comparisons) {
    section += `### 商品：${cmp.productName}\n\n`;

    // 利润排名表
    section += "| 平台 | 售价(¥) | 单品利润(¥) | 利润率 | 月利润(¥) | 判决 |\n";
    section += "|------|---------|------------|--------|----------|------|\n";
    for (const pr of cmp.platformResults) {
      const vIcon =
        pr.verdict === "buy_more" ? "📈" :
        pr.verdict === "hold" ? "✅" :
        pr.verdict === "reduce" ? "⚠️" : "🛑";
      section += `| ${pr.platform} | ${pr.sellPrice.toFixed(2)} | ${pr.netProfitPerItem >= 0 ? "+" : ""}${pr.netProfitPerItem.toFixed(2)} | ${pr.profitMargin >= 0 ? "+" : ""}${pr.profitMargin}% | ${pr.netProfitMonthly >= 0 ? "+" : "−"}${Math.abs(Math.round(pr.netProfitMonthly))} | ${vIcon} ${pr.verdict} |\n`;
    }
    section += "\n";

    // 关键发现
    section += `- **最佳平台**：${cmp.bestPlatform}（单品利润最高）\n`;
    section += `- **最差平台**：${cmp.worstPlatform}（单品利润最低）\n`;
    section += `- **跨平台价差**：¥${cmp.priceSpread.toFixed(2)}（${(cmp.priceSpreadRatio * 100).toFixed(1)}%）`;

    if (cmp.priceSpreadAlert) {
      section += ` ⚠️ 价差超过30%，存在窜货和消费者信任风险！`;
    }
    section += "\n";

    // 平台利润差值分析
    if (cmp.platformResults.length >= 2) {
      const sorted = cmp.platformResults.slice().sort(function(a, b) { return b.netProfitPerItem - a.netProfitPerItem; });
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const profitGap = best.netProfitPerItem - worst.netProfitPerItem;
      section += `- **利润差值**：${best.platform}比${worst.platform}单品多赚 ¥${profitGap.toFixed(2)}\n`;

      // 如果最差平台亏损但最佳平台盈利，分析原因
      if (worst.netProfitPerItem < 0 && best.netProfitPerItem > 0) {
        section += `- 🔴 **关键发现**：${worst.platform}亏损 ¥${Math.abs(worst.netProfitPerItem).toFixed(2)}/件，而${best.platform}盈利 ¥${best.netProfitPerItem.toFixed(2)}/件。同一商品在不同平台的表现差异巨大。\n`;
      }
    }

    // AI建议
    if (cmp.aiRecommendation) {
      section += `\n**分析建议**：${cmp.aiRecommendation}\n`;
    }

    section += "\n---\n\n";
  }

  section += "> 关键分析任务：基于以上跨平台利润数据，告诉用户应该在哪个平台重点投入资源、哪个平台需要调整策略或退出。每项建议必须引用具体的平台利润数据。\n\n";

  return section;
}

function formatAnalysisInstructions(context: AIExplanationContext): string {
  const evidenceCount = context.evidenceCards.length;
  const diagnosisCount = context.diagnoses.length;
  const ruleCount = context.applicableRules.length;
  const productCount = context.metrics.length;
  const hasProfitData = context.profitResults.length > 0;
  const hasCrossDataset = context.crossDatasets && context.crossDatasets.length > 0;
  const hasCrossPlatform = context.crossPlatformComparisons && context.crossPlatformComparisons.length > 0;
  const hasInventoryData = context.metrics.some(function(p) { return p.stock !== undefined && p.stock > 0; });

  // 汇总统计数据，供分析指令中引用
  const totalRevenue = context.metrics.reduce(function(s, p) { return s + p.revenue; }, 0);
  const totalMonthlyProfit = context.profitResults.reduce(function(s, r) { return s + r.netProfitMonthly; }, 0);
  const lossCount = context.profitResults.filter(function(r) { return r.netProfitMonthly < 0; }).length;
  const profitCount = context.profitResults.filter(function(r) { return r.netProfitMonthly > 0; }).length;
  const dropCount = context.evidenceCards.filter(function(c) { return c.verdict === "drop"; }).length;
  const reduceCount = context.evidenceCards.filter(function(c) { return c.verdict === "reduce"; }).length;
  const buyMoreCount = context.evidenceCards.filter(function(c) { return c.verdict === "buy_more"; }).length;

  let instructions = `## 🎯 你的分析任务：多维度经营诊断

你是一位**电商经营分析师**。上面已经给了你精确计算好的指标、诊断、证据卡和规则。
你的任务不是重复这些数据，而是**从多个维度交叉分析，发现数据背后的经营规律和风险**。

**核心原则：每个结论必须有数据支撑。没有数据支持的观点 = 编造 = 不可接受。**

${hasProfitData && context.evidenceCards.some(function(c) { return c.purchaseCostEstimated; }) ? "**⚠️ 特别提醒：进货成本为估算值（数据中无进价列）。这意味着利润数据可能与实际有偏差。你必须在分析中明确告知用户这一局限性，并建议补充实际进价数据以获取精确利润。**\n" : ""}
---

### 必须覆盖的分析维度（6个维度，缺一不可）

对以下每个维度，你必须给出分析结论。如果某个维度因数据不足无法分析，**明确说明"数据不足"**，而不是跳过或编造。
每个有数据的维度，至少引用2个具体数据点（证据卡#、规则ID、指标表格中的数值）。

#### 维度1：营收结构健康度
分析要点：
- 营收集中度：是否过度依赖少数产品？TOP1/TOP3占比多少？单一产品风险多大？
- 长尾效率：末位产品是否在消耗资源（库存资金、运营精力）但贡献极低？
- 产品矩阵评价：明星/现金牛/问题/瘦狗四象限分布是否合理？
- 必须引用：产品营收排行表中的具体贡献度%，产品矩阵分级数据

#### 维度2：利润与成本效率${!hasProfitData ? " 【⚠️ 数据不足 — 缺少价格/成本字段，跳过此维度并说明】" : ""}
分析要点：
- 利润全景：总月利润多少？盈利品vs亏损品的利润贡献结构？
- **🔑 亏损根因链（最重要！对每个亏损品必须回答"亏在哪里"）**：
  - **首要成本驱动**：每个亏损品占成本比最高的那一项是什么？引用证据卡中标注的"最大成本驱动"
  - 是进货成本太高？平台佣金太重？固定费用分摊？达人佣金？还是多项叠加？
  - **区分系统性问题 vs 个别商品问题**：如果同平台全部商品都亏损且首因都是固定费用→这是平台成本结构问题，不是商品问题
  - 对比同平台盈利品的成本结构，找出差异
- 成本异常检测：哪些成本项偏离行业基准？（引用证据卡 costAttribution 中的 benchmarkDeviation）
- **⚠️ 进货成本估算说明**：如果证据卡标注了"进货成本为估算值"，必须告知用户实际利润可能与此有偏差，建议补充进货价数据
- 必须引用：证据卡#N的"最大成本驱动"标注，具体成本归因数据，规则ID，利润率数值

#### 维度3：产品组合风险
分析要点：
- 爆款依赖风险：如果TOP3占比>60%，一旦爆款出问题（断货/差评/平台限流），店铺GMV会跌多少？
- 亏损品拖累：${lossCount > 0 ? lossCount + "个亏损品每月合计吞噬多少利润？哪些亏损品在'补贴'盈利品？" : "当前无亏损品，产品组合健康"}
- 产品生命周期：哪些品在上升期（高增长低基数）？哪些在衰退期（持续下滑）？
- 必须引用：产品排行表、利润排行表、诊断中的 stockout/deadstock/hitdep 类型

#### 维度4：库存周转效率${!hasInventoryData ? " 【⚠️ 数据不足 — 缺少库存字段，跳过此维度并说明】" : ""}
分析要点：
- 资金占用：库存总价值多少？占月GMV的百分比？资金周转是否高效？
- 缺货风险：高周转+低库存的产品有哪些？断货会造成多少销售损失？
- 滞销积压：低周转+高库存的产品有哪些？建议如何处理（降价清仓/捆绑销售/退货）？
- 必须引用：产品表中的库存列和周转率列，诊断中的 stockout/deadstock 类型

#### 维度5：平台经营表现${!hasProfitData ? " 【⚠️ 数据不足 — 跳过】" : ""}
分析要点：
- 平台费率结构：当前平台的佣金率、固定费用、结算周期对利润的影响
- 平台特有成本：${context.industry}行业在${detectPlatformFromResults(context.profitResults)}的典型成本陷阱是什么？
- 如果平台是京东：月费¥1,000分摊到各品的负担是否合理？
- 如果平台是抖音：达人佣金是否过高？是否需要降级达人等级或转自播？
- 如果平台是拼多多：财税合规的隐性资金成本是否被忽视？
- 必须引用：平台费率规则ID（RULE_PLATFORM_*），证据卡中的相关成本项

#### 维度6：跨平台对比洞察${!hasCrossPlatform ? " 【⚠️ 无跨平台数据 — 跳过此维度并说明】" : ""}
分析要点：
- 同品不同平台利润差异的根本原因（费率？达人？定价？固定成本？）
- 哪个平台是"现金牛"（高利润+高销量）？哪个是"陷阱"（看似有销量实则亏损）？
- 平台资源如何重新分配？（如"A品在京东亏损但在抖音盈利，建议京东减量抖音加量"）
- 跨平台价差是否超过30%？是否有窜货和消费者信任风险？
- 必须引用：跨平台利润对比表中的具体平台利润数据

---

### 综合输出结构

按以下结构组织你的分析（每个部分都必须包含对应的维度和数据引用）：

### 1. 核心发现（至少3个，基于上述6个维度的交叉分析）
格式要求：
- **发现N**：[一句话结论]
  - 数据依据：引用至少2个数据点（证据卡#N / 规则ID / 指标表数值）
  - 影响量化：金额或百分比
  - 涉及维度：标注来自哪个分析维度（如"维度1+维度2交叉"）

### 2. 交叉维度洞察
从至少2个维度的交叉中提取更深层的发现。例如：
- "高营收+负利润"模式：某个品营收排名高但利润为负 → 营收陷阱
- "高库存+低利润"模式：资金被低效品占用 → 资本效率问题
- "跨平台+成本结构"模式：同一品在不同平台的成本结构差异

### 3. 诊断验证与补充
- 确认准确诊断：列出经你验证确认的诊断，引用规则ID和证据卡
- 修正可疑诊断：如果某个诊断与证据卡数据矛盾，说明矛盾点
- 补充遗漏：指出自动诊断未覆盖但你从数据中注意到的问题

### 4. 行动建议（按优先级排列：P0立即 > P1本周 > P2本月）
每条建议格式：
- **优先级**：[P0/P1/P2]
- **行动**：具体做什么（Who + What + When）
- **依据**：引用证据卡#N + 规则ID + 诊断类型（至少2个引用）
- **量化影响**：预期收益/止损金额（必须有计算逻辑，不能拍脑袋）
- **执行风险**：low/medium/high + 风险说明
- **验证指标**：执行后用什么指标判断是否成功？

### 5. 数据充分性评估
- 哪些分析维度数据充分（置信度高）？
- 哪些维度数据不足（置信度低）？缺少什么具体字段？
- 如果用户补充什么数据，可以让分析更精准？（具体到字段名）

---

## ⚠️ 硬性约束（违反任何一条 = 分析不合格）

1. **无数据不结论**：每个判断必须引用至少1个具体数据来源（证据卡#N、规则ID、指标表格数值、诊断类型）
2. **量化优先**：能用金额和百分比的地方，不能用模糊词汇（"较多""较少""可能""大概"）
3. **交叉验证**：重要结论（如"应该下架XX产品"）必须从至少2个维度交叉验证
4. **区分事实与推断**：规则引擎算出来的是事实（可直接引用），你推理出来的是推断（需标注置信度）
5. **不编造数据**：证据卡中没有的成本数字、行业基准、竞品价格——一律不能编造
6. **中文输出**：全部中文，专业术语保留英文（如GMV、SKU、ROI）
7. **标注置信度**：每个核心发现和行动建议标注你的置信度（高>80% / 中50-80% / 低<50%）

---

## 📊 当前分析上下文

| 数据维度 | 可用数据 | 充分度 |
|---------|---------|--------|
| 行业 | ${context.industry} | ✅ |
| 商品数 | ${productCount} 个 | ✅ |
| 营收数据 | GMV ¥${Math.round(totalRevenue).toLocaleString()} | ✅ |
| 利润数据 | ${hasProfitData ? profitCount + "盈/" + lossCount + "亏 · 合计" + (totalMonthlyProfit >= 0 ? "+" : "−") + "¥" + Math.abs(Math.round(totalMonthlyProfit)).toLocaleString() : "❌ 无"} | ${hasProfitData ? "✅" : "❌"} |
| 库存数据 | ${hasInventoryData ? "✅ " + context.metrics.filter(function(p) { return (p.stock || 0) > 0; }).length + "个品有库存记录" : "❌ 无"} | ${hasInventoryData ? "✅" : "❌"} |
| 成本归因 | ${hasProfitData ? "✅ " + evidenceCount + "张证据卡" : "❌ 无"} | ${hasProfitData ? "✅" : "❌"} |
| 进货成本来源 | ${hasProfitData ? (context.evidenceCards.some(function(c) { return c.purchaseCostEstimated; }) ? "⚠️ 估算值（按售价55%倒推）" : "✅ 从数据列提取") : "—"} | ${hasProfitData ? (context.evidenceCards.some(function(c) { return c.purchaseCostEstimated; }) ? "⚠️ 偏差风险" : "✅") : "—"} |
| 诊断结果 | ${diagnosisCount} 条（critical:${context.diagnoses.filter(function(d) { return d.level === "critical"; }).length} warning:${context.diagnoses.filter(function(d) { return d.level === "warning"; }).length}） | ${diagnosisCount > 0 ? "✅" : "⚠️"} |
| 规则触发 | ${ruleCount} 条 | ${ruleCount > 0 ? "✅" : "⚠️"} |
| 跨平台对比 | ${hasCrossPlatform ? "✅ " + context.crossPlatformComparisons!.length + "组商品" : "❌ 无"} | ${hasCrossPlatform ? "✅" : "❌"} |
| 跨数据集 | ${hasCrossDataset ? "✅ " + context.crossDatasets!.length + "组关联" : "❌ 无"} | ${hasCrossDataset ? "✅" : "❌"} |

**判决分布**：📈加量${buyMoreCount} · ✅持有${evidenceCount - dropCount - reduceCount - buyMoreCount} · ⚠️减量${reduceCount} · 🛑止损${dropCount}

${!hasProfitData ? "\n⚠️ **重要**：当前数据缺少价格字段，无法计算利润和成本。请基于营收、销量、库存等可用数据进行分析，**严禁编造任何利润数字**。在维度2和维度5中说明数据不足。\n" : ""}
${hasProfitData && lossCount > 0 ? "\n🔴 **注意**：有" + lossCount + "个亏损品合计月亏¥" + Math.abs(Math.round(context.profitResults.filter(function(r) { return r.netProfitMonthly < 0; }).reduce(function(s, r) { return s + r.netProfitMonthly; }, 0))).toLocaleString() + "。这是最需要关注的问题，必须在维度2和交叉维度洞察中深入分析。\n" : ""}
${hasProfitData && dropCount > evidenceCount * 0.5 ? "\n🚨 **严重警告**：超过半数商品被判为drop（止损），这可能意味着平台策略或定价策略存在系统性问题，而非个别商品问题。必须在维度5（平台表现）和交叉维度洞察中分析系统性原因。\n" : ""}`;

  return instructions;
}

/** 从利润结果中提取平台名 */
function detectPlatformFromResults(profitResults: ProfitResult[]): string {
  if (profitResults.length === 0) return "未知平台";
  var platforms: Record<string, number> = {};
  for (var i = 0; i < profitResults.length; i++) {
    var p = profitResults[i].platform;
    platforms[p] = (platforms[p] || 0) + 1;
  }
  var best = "";
  var bestCount = 0;
  for (var key in platforms) {
    if (platforms[key] > bestCount) {
      bestCount = platforms[key];
      best = key;
    }
  }
  return best || "未知平台";
}

// ═══════════════════════════════════════════════
// 推理步骤提取（从AI回复中解析结构化的推理链）
// ═══════════════════════════════════════════════

function extractReasoningSteps(
  reply: string,
  context: AIExplanationContext,
): ReasoningStep[] {
  const steps: ReasoningStep[] = [];
  let stepIndex = 0;

  // 尝试从回复中提取结构化的章节
  const sectionPatterns = [
    { regex: /###?\s*\d*\.?\s*核心发现[：:]/i, title: "核心发现" },
    { regex: /###?\s*\d*\.?\s*交叉维度[洞察分析]*[：:]/i, title: "交叉维度洞察" },
    { regex: /###?\s*\d*\.?\s*利润归因[分析]*[：:]/i, title: "利润归因分析" },
    { regex: /###?\s*\d*\.?\s*诊断验证[与補充]*[：:]/i, title: "诊断验证" },
    { regex: /###?\s*\d*\.?\s*行动建议[：:]/i, title: "行动建议" },
    { regex: /###?\s*\d*\.?\s*数据充分性[评估]*[：:]/i, title: "数据充分性评估" },
    { regex: /###?\s*\d*\.?\s*不确定性[声明]*[：:]/i, title: "不确定性声明" },
  ];

  // 找到各章节的起始位置
  const positions: Array<{ title: string; start: number }> = [];
  for (const pattern of sectionPatterns) {
    const match = reply.match(pattern.regex);
    if (match && match.index !== undefined) {
      positions.push({ title: pattern.title, start: match.index });
    }
  }
  positions.sort((a, b) => a.start - b.start);

  // 提取每段内容
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? positions[i + 1].start : reply.length;
    const content = reply.substring(start, end).trim();

    // 提取引用
    const evidenceRefs = extractEvidenceRefs(content, context.evidenceCards.length);
    const ruleRefs = extractRuleRefs(content);

    steps.push({
      step: ++stepIndex,
      title: positions[i].title,
      content,
      evidenceRefs,
      ruleRefs,
      confidence: undefined,
    });
  }

  // 如果没有识别到任何结构化章节，生成一个原始回复步骤
  if (steps.length === 0) {
    steps.push({
      step: 1,
      title: "综合分析",
      content: reply,
      evidenceRefs: [],
      ruleRefs: [],
      confidence: 0.7,
    });
  }

  return steps;
}

function extractEvidenceRefs(text: string, maxCards: number): number[] {
  const refs: number[] = [];
  // 匹配 "证据卡#N" 或 "卡片#N" 或 "#N"
  const patterns = [/证据卡\s*#(\d+)/g, /卡片\s*#(\d+)/g, /Evidence Card\s*#(\d+)/gi];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1], 10);
      if (num >= 0 && num < maxCards && !refs.includes(num)) {
        refs.push(num);
      }
    }
  }
  return refs;
}

function extractRuleRefs(text: string): string[] {
  const refs: string[] = [];
  // 匹配 "RULE_XXX" 格式
  const pattern = /RULE_[A-Z_]+/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (!refs.includes(match[0])) {
      refs.push(match[0]);
    }
  }
  return refs;
}

// ═══════════════════════════════════════════════
// 置信度估算
// ═══════════════════════════════════════════════

function estimateOverallConfidence(context: AIExplanationContext): number {
  let totalConf = 0;
  let count = 0;

  // 证据卡置信度
  for (const card of context.evidenceCards) {
    totalConf += card.verdictConfidence;
    count++;
  }

  // 规则置信度
  for (const rule of context.applicableRules) {
    totalConf += rule.confidence;
    count++;
  }

  // 诊断置信度（间接：critical=0.9, warning=0.7, opportunity=0.6）
  for (const d of context.diagnoses) {
    totalConf += d.level === "critical" ? 0.9 : d.level === "warning" ? 0.7 : 0.6;
    count++;
  }

  if (count === 0) return 0.7; // 默认置信度
  return Math.round((totalConf / count) * 100) / 100;
}
