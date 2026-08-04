/**
 * ProcureWise Scenario Engine
 *
 * "What if" 经营场景模拟器。
 *
 * 回答三类核心问题：
 *   1. 如果售价提高 X%，利润会变成多少？
 *   2. 如果把这个品放到另一个平台卖，利润差多少？
 *   3. 如果停止采购亏损品，整体利润提升多少？
 *
 * 所有模拟基于已计算好的 ProfitResult，不重新解析数据。
 */

import { calculateProfit, PLATFORM_FEES_2026 } from "@/lib/profit/engine";
import type { ProfitResult } from "@/lib/profit/engine";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface PriceChangeScenario {
  type: "price_change";
  productName: string;
  platform: string;
  /** 价格变动百分比，正数=涨价，负数=降价 */
  priceChangePercent: number;
  /** 原售价 */
  originalPrice: number;
  /** 新售价 */
  newPrice: number;
  /** 原月利润 */
  originalMonthlyProfit: number;
  /** 新月利润 */
  newMonthlyProfit: number;
  /** 利润变化（新 - 旧） */
  profitDelta: number;
  /** 利润变化百分比 */
  profitDeltaPercent: number;
  /** 新利润率 */
  newProfitMargin: number;
  /** 原利润率 */
  originalProfitMargin: number;
  /** 预估销量变化（涨价通常销量下降，用弹性系数估算） */
  estimatedSalesChange: number;
  confidence: "high" | "medium" | "low";
  recommendation: string;
}

export interface PlatformSwitchScenario {
  type: "platform_switch";
  productName: string;
  fromPlatform: string;
  toPlatform: string;
  originalProfit: ProfitResult;
  switchedProfit: ProfitResult;
  profitDelta: number;
  profitDeltaPercent: number;
  /** 价差（toPlatform 售价 - fromPlatform 售价，如果售价不变） */
  priceSpread: number;
  confidence: "high" | "medium" | "low";
  recommendation: string;
}

export interface StopLossScenario {
  type: "stop_loss";
  /** 建议停止采购的商品列表 */
  productsToStop: Array<{
    productName: string;
    currentMonthlyLoss: number;
    platform: string;
  }>;
  /** 当前总亏损（月） */
  totalCurrentLoss: number;
  /** 止损后总亏损（月） */
  totalLossAfterStop: number;
  /** 止损收益（月） */
  monthlySavings: number;
  /** 止损后整体月利润变化 */
  overallProfitImprovement: number;
  confidence: "high" | "medium" | "low";
  recommendation: string;
}

export interface ScenarioResult {
  scenarios: (PriceChangeScenario | PlatformSwitchScenario | StopLossScenario)[];
  summary: string;
}

// ═══════════════════════════════════════════════
// Scenario 1: 价格变动模拟
// ═══════════════════════════════════════════════

/**
 * 模拟售价变动对利润的影响
 *
 * @param profitResult - 当前利润结果
 * @param priceChangePercent - 价格变动百分比（如 10 = 涨价 10%，-10 = 降价 10%）
 * @param salesElasticity - 价格弹性系数（默认 -1.5，即涨价 10% 销量降 15%）
 */
export function simulatePriceChange(
  profitResult: ProfitResult,
  priceChangePercent: number,
  salesElasticity: number = -1.5,
): PriceChangeScenario {
  const originalPrice = profitResult.sellPrice;
  const newPrice = Math.round(originalPrice * (1 + priceChangePercent / 100) * 100) / 100;
  const originalMonthlyProfit = profitResult.netProfitMonthly;

  // 估算销量变化（价格弹性）
  const salesChangePercent = priceChangePercent * salesElasticity;
  const originalMonthlySales = Math.abs(
    Math.round(profitResult.netProfitMonthly / Math.max(Math.abs(profitResult.netProfitPerItem), 0.01)),
  );
  // 限制销量变化幅度：不超过原销量的 ±50%，防止极端弹性导致不现实的结果
  const maxSalesChange = originalMonthlySales * 0.5;
  const rawSalesChange = profitResult.netProfitMonthly / Math.max(Math.abs(profitResult.netProfitPerItem), 0.01) * (salesChangePercent / 100);
  const clampedSalesChange = Math.max(-maxSalesChange, Math.min(maxSalesChange, rawSalesChange));
  const estimatedSalesChange = Math.round(clampedSalesChange);

  // 用新价格重新计算利润（简化：只变售价，其他成本不变）
  // 固定费用分摊会随销量变化
  const newMonthlySales = Math.max(1, Math.round(originalMonthlySales + estimatedSalesChange));

  // 固定费用分摊
  const platformConfig = PLATFORM_FEES_2026[profitResult.platformKey];
  const fixedFeePerItem = platformConfig && platformConfig.monthlyFixedFee > 0
    ? platformConfig.monthlyFixedFee / newMonthlySales
    : 0;

  // 重新计算利润
  const commissionFee = newPrice * (platformConfig?.commissionRateTypical || 0.05);
  const shippingInsurance = newPrice * (platformConfig?.shippingInsuranceRate || 0.01);
  const returnLoss = newPrice * (platformConfig?.returnRateMin || 0.05);
  const shippingCost = 3;
  const adCost = profitResult.costs.adCost;
  const influencerCommission = profitResult.costs.influencerCommission;
  const taxComplianceCost = profitResult.costs.taxComplianceCost;

  const totalCost = commissionFee + fixedFeePerItem + shippingInsurance +
    influencerCommission + shippingCost + adCost + returnLoss +
    taxComplianceCost + profitResult.purchaseCost;

  const newNetProfitPerItem = newPrice - totalCost;
  const newProfitMargin = newPrice > 0 ? (newNetProfitPerItem / newPrice) * 100 : 0;
  const newMonthlyProfit = newNetProfitPerItem * newMonthlySales;

  const profitDelta = newMonthlyProfit - originalMonthlyProfit;
  const profitDeltaPercent = originalMonthlyProfit !== 0
    ? Math.round((profitDelta / Math.abs(originalMonthlyProfit)) * 10000) / 100
    : 0;

  // 置信度：小幅度变动更可靠
  const absChange = Math.abs(priceChangePercent);
  const confidence: "high" | "medium" | "low" = absChange <= 5
    ? "high"
    : absChange <= 15
      ? "medium"
      : "low";

  const recommendation = buildPriceChangeRecommendation(
    profitResult.productName,
    priceChangePercent,
    profitDelta,
    profitDeltaPercent,
    newProfitMargin,
    confidence,
  );

  return {
    type: "price_change",
    productName: profitResult.productName,
    platform: profitResult.platform,
    priceChangePercent,
    originalPrice,
    newPrice,
    originalMonthlyProfit,
    newMonthlyProfit: Math.round(newMonthlyProfit * 100) / 100,
    profitDelta: Math.round(profitDelta * 100) / 100,
    profitDeltaPercent,
    originalProfitMargin: profitResult.profitMargin,
    newProfitMargin: Math.round(newProfitMargin * 100) / 100,
    estimatedSalesChange,
    confidence,
    recommendation,
  };
}

function buildPriceChangeRecommendation(
  productName: string,
  changePercent: number,
  delta: number,
  deltaPercent: number,
  newMargin: number,
  confidence: "high" | "medium" | "low",
): string {
  const direction = changePercent > 0 ? "涨价" : "降价";
  const sign = delta >= 0 ? "+" : "";

  if (delta > 0) {
    return `${productName} ${direction}${Math.abs(changePercent)}%：月利润预计 ${sign}¥${Math.abs(Math.round(delta))}（${sign}${deltaPercent}%），新利润率 ${newMargin.toFixed(1)}%。${confidence === "high" ? "小幅调整，可行度高。" : confidence === "medium" ? "中幅调整，建议先小范围测试。" : "大幅调整，需谨慎评估销量影响。"}`;
  } else if (delta < 0) {
    return `${productName} ${direction}${Math.abs(changePercent)}%：月利润预计 ${sign}¥${Math.round(delta)}（${deltaPercent}%），新利润率 ${newMargin.toFixed(1)}%。${confidence === "low" ? "不建议执行，利润损失较大。" : "需评估销量提升是否能覆盖利润下降。"}`;
  } else {
    return `${productName} ${direction}${Math.abs(changePercent)}%：利润基本不变，调整空间有限。`;
  }
}

// ═══════════════════════════════════════════════
// Scenario 2: 跨平台切换模拟
// ═══════════════════════════════════════════════

/**
 * 模拟将商品切换到另一个平台的利润差异
 */
export function simulatePlatformSwitch(
  profitResult: ProfitResult,
  targetPlatform: string,
  targetSellPrice?: number,
): PlatformSwitchScenario | null {
  const fromConfig = PLATFORM_FEES_2026[profitResult.platformKey];
  const toConfig = PLATFORM_FEES_2026[targetPlatform];

  if (!fromConfig || !toConfig) return null;

  const sellPrice = targetSellPrice || profitResult.sellPrice;
  // 反推月销量：限制在合理范围内（防止 near-zero profitPerItem 导致销量爆炸）
  const rawMonthlySales = Math.abs(
    Math.round(profitResult.netProfitMonthly / Math.max(Math.abs(profitResult.netProfitPerItem), 0.01)),
  );
  const monthlySales = Math.min(rawMonthlySales, 10000); // 上限 10000 件/月

  const switchedResult = calculateProfit({
    productName: profitResult.productName,
    platform: targetPlatform as any,
    sellPrice,
    purchaseCost: profitResult.purchaseCost,
    monthlySales,
    shippingCost: profitResult.costs.shippingCost,
    adCostPerItem: profitResult.costs.adCost,
    pddInvoiced: profitResult.costs.taxComplianceCost === 0,
    // ⭐ 传递抖音专属参数，否则模拟结果中达人佣金/投流优惠会缺失
    influencerGrade: profitResult.platformKey === "douyin" ? "C" : undefined,
    useQianchuan: profitResult.platformKey === "douyin" ? false : undefined,
  });

  const profitDelta = switchedResult.netProfitMonthly - profitResult.netProfitMonthly;
  const profitDeltaPercent = profitResult.netProfitMonthly !== 0
    ? Math.round((profitDelta / Math.abs(profitResult.netProfitMonthly)) * 10000) / 100
    : 0;

  const confidence: "high" | "medium" | "low" =
    profitDeltaPercent > 20 ? "high"
    : profitDeltaPercent > 5 ? "medium"
    : "low";

  const recommendation = buildPlatformSwitchRecommendation(
    profitResult.productName,
    profitResult.platform,
    toConfig.platformName,
    profitDelta,
    profitDeltaPercent,
    switchedResult.netProfitMonthly,
    confidence,
  );

  return {
    type: "platform_switch",
    productName: profitResult.productName,
    fromPlatform: profitResult.platform,
    toPlatform: toConfig.platformName,
    originalProfit: profitResult,
    switchedProfit: switchedResult,
    profitDelta: Math.round(profitDelta * 100) / 100,
    profitDeltaPercent,
    priceSpread: sellPrice - profitResult.sellPrice,
    confidence,
    recommendation,
  };
}

function buildPlatformSwitchRecommendation(
  productName: string,
  from: string,
  to: string,
  delta: number,
  deltaPercent: number,
  newMonthlyProfit: number,
  confidence: "high" | "medium" | "low",
): string {
  const sign = delta >= 0 ? "+" : "";
  if (delta > 0) {
    return `${productName} 从 ${from} 切换到 ${to}：月利润预计 ${sign}¥${Math.abs(Math.round(delta))}（${sign}${deltaPercent}%），新平台月利润约 ¥${Math.round(newMonthlyProfit)}。${confidence === "high" ? "切换收益显著，建议优先评估。" : "有一定收益，建议详细对比运营成本后决策。"}`;
  } else if (delta < 0) {
    return `${productName} 从 ${from} 切换到 ${to}：月利润预计 ${sign}¥${Math.round(delta)}（${deltaPercent}%），利润下降。不建议单纯为了平台切换而迁移。`;
  } else {
    return `${productName} 在 ${from} 和 ${to} 利润相近，切换收益有限。`;
  }
}

// ═══════════════════════════════════════════════
// Scenario 3: 止损模拟
// ═══════════════════════════════════════════════

/**
 * 模拟停止采购亏损品后的整体利润改善
 */
export function simulateStopLoss(profitResults: ProfitResult[]): StopLossScenario {
  const lossProducts = profitResults.filter(function (p) { return p.netProfitPerItem < 0; });

  const productsToStop = lossProducts.map(function (p) {
    return {
      productName: p.productName,
      currentMonthlyLoss: Math.round(p.netProfitMonthly * 100) / 100,
      platform: p.platform,
    };
  });

  const totalCurrentLoss = lossProducts.reduce(function (s, p) { return s + p.netProfitMonthly; }, 0);
  const totalLossAfterStop = 0; // 停止后亏损归零
  const monthlySavings = Math.abs(totalCurrentLoss);

  // 整体利润改善 = 止损后减少的亏损
  const totalProfit = profitResults.reduce(function (s, p) { return s + p.netProfitMonthly; }, 0);
  const overallProfitImprovement = monthlySavings;

  const recommendation = buildStopLossRecommendation(
    productsToStop,
    monthlySavings,
    totalProfit,
  );

  return {
    type: "stop_loss",
    productsToStop,
    totalCurrentLoss: Math.round(totalCurrentLoss * 100) / 100,
    totalLossAfterStop,
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    overallProfitImprovement: Math.round(overallProfitImprovement * 100) / 100,
    confidence: "high",
    recommendation,
  };
}

function buildStopLossRecommendation(
  products: Array<{ productName: string; currentMonthlyLoss: number; platform: string }>,
  monthlySavings: number,
  totalProfit: number,
): string {
  if (products.length === 0) {
    return "当前无亏损商品，无需止损操作。";
  }

  const names = products.map(function (p) { return p.productName + "（" + p.platform + "，月亏 ¥" + Math.abs(Math.round(p.currentMonthlyLoss)) + "）"; }).join("；");

  const improvedProfit = totalProfit + monthlySavings;
  const improvementPercent = totalProfit !== 0
    ? Math.round((monthlySavings / Math.abs(totalProfit)) * 10000) / 100
    : 0;

  return `建议立即停止采购 ${products.length} 个亏损商品：${names}。止损后每月减少亏损 ¥${Math.round(monthlySavings)}，整体月利润从 ¥${Math.round(totalProfit)} 提升至约 ¥${Math.round(improvedProfit)}（提升 ${improvementPercent}%）。停止采购后可将预算转向高利润品。`;
}

// ═══════════════════════════════════════════════
// Scenario Aggregator
// ═══════════════════════════════════════════════

/**
 * 为当前利润结果生成所有相关场景
 */
export function buildAllScenarios(
  profitResults: ProfitResult[],
  topN: number = 3,
): ScenarioResult {
  const scenarios: (PriceChangeScenario | PlatformSwitchScenario | StopLossScenario)[] = [];

  // 1. 对亏损品做止损模拟
  if (profitResults.some(function (p) { return p.netProfitPerItem < 0; })) {
    scenarios.push(simulateStopLoss(profitResults));
  }

  // 2. 对 Top N 商品做涨价模拟（涨价 5%、10%）
  const topProducts = profitResults
    .filter(function (p) { return p.netProfitPerItem > 0; })
    .sort(function (a, b) { return b.netProfitMonthly - a.netProfitMonthly; })
    .slice(0, topN);

  for (const p of topProducts) {
    // 涨价 5%
    scenarios.push(simulatePriceChange(p, 5));
    // 涨价 10%
    scenarios.push(simulatePriceChange(p, 10));
  }

  // 3. 对低利润品做降价提量模拟（降价 5%，看能否提升整体利润）
  const lowMarginProducts = profitResults
    .filter(function (p) { return p.netProfitPerItem > 0 && p.profitMargin > 3 && p.profitMargin < 8; })
    .slice(0, 2);

  for (const p of lowMarginProducts) {
    scenarios.push(simulatePriceChange(p, -5));
  }

  // 4. 跨平台切换模拟（对高利润品）
  const platforms = Object.keys(PLATFORM_FEES_2026).filter(function (key) {
    return key !== profitResults[0]?.platformKey;
  });
  for (const p of topProducts.slice(0, 2)) {
    for (const targetPlatform of platforms.slice(0, 2)) {
      const scenario = simulatePlatformSwitch(p, targetPlatform);
      if (scenario && scenario.profitDeltaPercent > -100) {
        scenarios.push(scenario);
      }
    }
  }

  // 生成摘要
  const summary = buildScenarioSummary(scenarios);

  return { scenarios, summary };
}

function buildScenarioSummary(
  scenarios: (PriceChangeScenario | PlatformSwitchScenario | StopLossScenario)[],
): string {
  const parts: string[] = [];

  const positiveScenarios = scenarios.filter(function (s) {
    if (s.type === "price_change") return (s as PriceChangeScenario).profitDelta > 0;
    if (s.type === "platform_switch") return (s as PlatformSwitchScenario).profitDelta > 0;
    if (s.type === "stop_loss") return (s as StopLossScenario).monthlySavings > 0;
    return false;
  });

  if (positiveScenarios.length > 0) {
    parts.push("共生成 " + scenarios.length + " 个经营场景模拟，其中 " + positiveScenarios.length + " 个有正向收益预期：");
    for (const s of positiveScenarios.slice(0, 5)) {
      if (s.type === "price_change") {
        const ps = s as PriceChangeScenario;
        parts.push("- " + ps.productName + " 涨价" + ps.priceChangePercent + "%：月利润 +¥" + Math.round(ps.profitDelta));
      } else if (s.type === "platform_switch") {
        const pls = s as PlatformSwitchScenario;
        parts.push("- " + pls.productName + " 切换到" + pls.toPlatform + "：月利润 " + (pls.profitDelta >= 0 ? "+" : "") + "¥" + Math.round(pls.profitDelta));
      } else if (s.type === "stop_loss") {
        const sls = s as StopLossScenario;
        parts.push("- 止损 " + sls.productsToStop.length + " 个亏损品：月减少亏损 ¥" + Math.round(sls.monthlySavings));
      }
    }
  } else {
    parts.push("当前数据未发现显著优化空间，建议保持现有策略并持续监控。");
  }

  return parts.join("\n");
}
