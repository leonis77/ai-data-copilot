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
  let section = "## 📊 第一层：指标（已精确计算）\n\n";

  // 店铺级指标
  section += "### 店铺总览\n";
  section += `- GMV：¥${store.gmv.toLocaleString()}\n`;
  section += `- 订单数：${store.orderCount}\n`;
  section += `- 客单价：¥${store.avgOrderValue.toFixed(2)}\n`;
  section += `- TOP3 SKU占比：${store.topSkuRatio}%\n`;
  section += `- 长尾SKU占比：${store.longTailRatio}%\n\n`;

  // 商品级指标（Top 10）
  const topProducts = products.slice(0, 10);
  section += "### 商品排行（按营收Top 10）\n\n";
  section += "| 商品 | 营收(¥) | 销量 | 均价(¥) | 贡献度 |\n";
  section += "|------|---------|------|---------|--------|\n";
  for (const p of topProducts) {
    section += `| ${p.name} | ${p.revenue.toLocaleString()} | ${p.sales} | ${p.avgPrice.toFixed(2)} | ${p.contribution}% |\n`;
  }

  // 利润结果摘要
  if (profitResults.length > 0) {
    section += "\n### 利润摘要\n\n";
    section += "| 商品 | 平台 | 售价(¥) | 单品利润(¥) | 利润率 | 判决 |\n";
    section += "|------|------|---------|------------|--------|------|\n";
    for (const r of profitResults.slice(0, 10)) {
      const vIcon = r.verdict === "buy_more" ? "📈" : r.verdict === "hold" ? "✅" : r.verdict === "reduce" ? "⚠️" : "🛑";
      section += `| ${r.productName} | ${r.platform} | ${r.sellPrice.toFixed(2)} | ${r.netProfitPerItem >= 0 ? "+" : ""}${r.netProfitPerItem.toFixed(2)} | ${r.profitMargin >= 0 ? "+" : ""}${r.profitMargin}% | ${vIcon} ${r.verdict} |\n`;
    }
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

  let section = "## 📋 第三层：证据卡（每件商品×平台 的成本明细）\n\n";
  section += "> 以下是规则引擎精确计算的成本和利润数据。每个数字都可以追溯到具体成本项。\n\n";

  for (const card of cards) {
    section += `### 证据卡 #${card.cardIndex}：${card.productName} · ${card.platform}\n\n`;

    // 基本信息
    section += `- 售价：¥${card.sellPrice.toFixed(2)}\n`;
    section += `- 进货成本：¥${card.costBreakdown.purchaseCost.toFixed(2)}\n`;
    section += `- 判决：${card.verdict}（置信度${Math.round(card.verdictConfidence * 100)}%）\n`;
    section += `- 单品利润：${card.profit.netPerItem >= 0 ? "+" : ""}¥${card.profit.netPerItem.toFixed(2)}\n`;
    section += `- 利润率：${card.profit.margin >= 0 ? "+" : ""}${card.profit.margin}%\n`;
    section += `- 月利润：${card.profit.netMonthly >= 0 ? "+" : "−"}¥${Math.abs(card.profit.netMonthly).toFixed(0)}\n\n`;

    // 成本归因表
    section += "**成本归因（每项占总成本的百分比）：**\n\n";
    section += "| 成本项 | 金额(¥) | 占比 | 说明 |\n";
    section += "|--------|---------|------|------|\n";
    for (const attr of card.costAttribution) {
      const note = attr.benchmarkDeviation ? ` ${attr.benchmarkDeviation}` : "";
      section += `| ${attr.item} | ${attr.amount.toFixed(2)} | ${attr.percentage.toFixed(1)}% |${note} |\n`;
    }

    // 关联规则
    if (card.ruleIds.length > 0) {
      section += `\n关联规则：${card.ruleIds.join("、")}\n`;
    }

    // 知识库参考（含置信度）
    if (card.knowledgeRefs.length > 0) {
      section += `知识参考：`;
      const refDetails: string[] = [];
      for (const ref of card.knowledgeRefs) {
        const confEntry = card.knowledgeConfidence
          ? card.knowledgeConfidence.find(function(k) { return k.refId === ref; })
          : undefined;
        const confStr = confEntry
          ? ` (置信度${Math.round(confEntry.confidence * 100)}%)`
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
  const hasProfitData = context.profitResults.length > 0;
  const hasCrossDataset = context.crossDatasets && context.crossDatasets.length > 0;
  const hasCrossPlatform = context.crossPlatformComparisons && context.crossPlatformComparisons.length > 0;

  let instructions = `## 🎯 你的分析任务

基于以上${hasCrossPlatform ? "六" : hasCrossDataset ? "六" : "五"}层结构化数据，请按以下结构输出你的分析：

### 1. 核心发现（2-3个最重要的结论）
每个结论必须：
- 引用具体的证据卡索引（如"见证据卡#1"）
- 包含量化的影响（金额或百分比）
- 说清楚为什么这个发现重要`;

  // Add cross-dataset specific guidance
  if (hasCrossDataset) {
    instructions += `
- 如有跨数据集关联发现，说明不同数据集之间的商品定价/销量差异意味着什么`;
  }

  if (hasCrossPlatform) {
    instructions += `
- 对比同一商品在不同平台的利润表现，明确指出哪个平台最值得投入、哪个需要调整`;
  }

  instructions += `

### 2. 利润归因分析${hasProfitData ? "" : "（当前数据不支持利润分析，可跳过此节）"}
如果有亏损品或利润异常：
- 逐项说明是哪个成本导致的问题（引用证据卡的 costAttribution）
- 对比行业基准（如果知识库中有相关数据）
- 区分"一次性因素"和"结构性因素"`;

  // Cross-platform specific profit analysis
  if (hasCrossPlatform) {
    instructions += `
- **跨平台利润对比**：对于同一商品在不同平台利润差异巨大的情况，分析根本原因（平台费率差异？达人成本？定价策略？）`;
  }

  instructions += `

### 3. 诊断验证
对自动诊断结果进行验证：
- 确认哪些诊断是准确的，引用规则ID
- 修正你认为不准确的诊断，说明原因
- 指出自动诊断未发现但你注意到了的问题

### 4. 行动建议（按优先级排序）
每条建议包含：
- **What**：具体做什么
- **Why**：为什么（引用证据卡和诊断）
- **HowMuch**：预期收益/止损金额（量化估算）
- **Risk**：执行风险
- **Priority**：紧急程度`;

  if (hasCrossPlatform) {
    instructions += `
- **跨平台优化**：针对跨平台价差和利润差异，给出具体的平台资源调配建议（如"将京东的A品加量、抖音的A品降达人等级"）`;
  }

  instructions += `

### 5. 不确定性声明
- 标注你对每项判断的置信度
- 数据不足以支撑某些结论时，明确说明
- 需要用户补充什么信息来提供更精准的分析

## ⚠️ 约束

1. **数值来源**：每个具体数字必须引用证据卡索引（如"证据卡#2显示..."）
2. **规则引用**：每个诊断判断必须引用规则ID（如"依据RULE_NEGATIVE_MARGIN..."）
3. **不编造**：不要编造证据卡中没有的数据
4. **置信度**：不确定时标注置信度百分比
5. **中文输出**：全部使用中文，专业术语可保留英文

## 📊 当前状态

- 行业：${context.industry}
- 证据卡数：${evidenceCount}
- 诊断数：${diagnosisCount} · 适用规则数：${ruleCount}
- 分析模式：AI主体 + 规则引擎验证 + 知识库参考${!hasProfitData ? "\n- ⚠️ 注意：当前数据缺少价格字段，无法进行利润分析。请基于已有指标和诊断给出建议，不要编造利润数字。" : ""}`;

  if (hasCrossDataset) {
    instructions += `\n- 🔗 跨数据集：已检测到 ${context.crossDatasets!.length} 组数据关联，包含同一商品在不同数据集的定价和销量对比`;
  }
  if (hasCrossPlatform) {
    const alertCount = context.crossPlatformComparisons!.filter(function(c) { return c.priceSpreadAlert; }).length;
    instructions += `\n- 🏪 跨平台对比：已分析 ${context.crossPlatformComparisons!.length} 组商品的跨平台利润差异`;
    if (alertCount > 0) {
      instructions += `，其中 ${alertCount} 组存在价差报警（>30%）`;
    }
  }

  return instructions;
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
    { regex: /###?\s*\d*\.?\s*利润归因[分析]*[：:]/i, title: "利润归因分析" },
    { regex: /###?\s*\d*\.?\s*诊断验证[：:]/i, title: "诊断验证" },
    { regex: /###?\s*\d*\.?\s*行动建议[：:]/i, title: "行动建议" },
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
