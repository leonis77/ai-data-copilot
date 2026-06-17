/**
 * 利润计算引擎 — 跨表自动计算单品真实利润
 *
 * 公式：净利润 = 订单收入 - 供货成本 - 广告费分摊 - 退款损失
 *
 * 设计原则：
 * - 角色驱动：通过 BusinessConcept 找列，不猜列名
 * - 容错设计：缺某张表时优雅降级，能算什么算什么
 * - 品类无关：任何品类同一套逻辑
 *
 * @module profit-engine
 */

import { extractEntities, buildCrossSheetEntityMap } from "@/lib/entities";
import type { TableBusinessProfile } from "@/lib/business-concepts";
import type { Entity } from "@/lib/entities";

// ============================================================================
// Types
// ============================================================================

export interface ProductPnL {
  product: string;
  revenue: number;
  cost: number;
  adSpend: number;
  refundLoss: number;
  netProfit: number;
  profitMargin: number;
  dataCompleteness: {
    hasRevenue: boolean;
    hasCost: boolean;
    hasAdSpend: boolean;
    hasRefund: boolean;
  };
}

export interface ProfitAnalysis {
  products: ProductPnL[];
  totalRevenue: number;
  totalCost: number;
  totalAdSpend: number;
  totalRefundLoss: number;
  totalNetProfit: number;
  overallMargin: number;
  summary: string;
  loserProducts: ProductPnL[];  // 亏损商品
  winnerProducts: ProductPnL[]; // 最赚钱商品
}

// ============================================================================
// Core API
// ============================================================================

/**
 * 计算单品利润（跨表）
 *
 * @param orderRows - 订单表数据
 * @param orderProfile - 订单表业务概念
 * @param supplyRows - 供货表数据（可选）
 * @param supplyProfile - 供货表业务概念（可选）
 * @param marketingRows - 推广表数据（可选）
 * @param marketingProfile - 推广表业务概念（可选）
 * @param refundRows - 售后表数据（可选）
 * @param refundProfile - 售后表业务概念（可选）
 */
export function computeProductPnL(
  orderRows: Record<string, unknown>[],
  orderProfile: TableBusinessProfile,
  supplyRows?: Record<string, unknown>[],
  supplyProfile?: TableBusinessProfile,
  marketingRows?: Record<string, unknown>[],
  marketingProfile?: TableBusinessProfile,
  refundRows?: Record<string, unknown>[],
  refundProfile?: TableBusinessProfile
): ProfitAnalysis {
  // ── Step 1: Extract entity from order table ──
  var productCol = orderProfile.getColumn("product_name") || orderProfile.getColumn("supplier_name") || orderProfile.getColumn("customer_name");
  var revenueCol = orderProfile.getColumn("selling_price") || orderProfile.getColumn("procurement_cost");

  if (!productCol || !revenueCol) {
    return emptyAnalysis("订单表缺少商品列或金额列");
  }

  // ── Step 2: Build per-product revenue map ──
  var productRevenue: Record<string, number> = {};
  for (var i = 0; i < orderRows.length; i++) {
    var name = String(orderRows[i][productCol] || "").trim();
    var rev = Number(orderRows[i][revenueCol]) || 0;
    if (!name || rev === 0) continue;
    productRevenue[name] = (productRevenue[name] || 0) + rev;
  }

  // ── Step 3: Build per-product cost map (from supply table) ──
  var productCost: Record<string, { totalCost: number; count: number }> = {};
  var hasCost = false;
  if (supplyRows && supplyProfile) {
    var supplyProductCol = supplyProfile.getColumn("product_name") || supplyProfile.getColumn("supplier_name");
    var costCol = supplyProfile.getColumn("procurement_cost");
    if (supplyProductCol && costCol) {
      hasCost = true;
      for (var si = 0; si < supplyRows.length; si++) {
        var sName = String(supplyRows[si][supplyProductCol] || "").trim();
        var cost = Number(supplyRows[si][costCol]) || 0;
        if (!sName || cost === 0) continue;
        if (!productCost[sName]) productCost[sName] = { totalCost: 0, count: 0 };
        productCost[sName].totalCost += cost;
        productCost[sName].count++;
      }
    }
  }

  // ── Step 4: Build per-product ad spend map ──
  var productAdSpend: Record<string, number> = {};
  var totalAdSpend = 0;
  var hasAdSpend = false;
  if (marketingRows && marketingProfile) {
    var adProductCol = marketingProfile.getColumn("product_name") || findKeywordCol(marketingRows, /计划|推广|关键词/i);
    var spendCol = marketingProfile.getColumn("ad_spend") || findKeywordCol(marketingRows, /花费|消耗/i);
    if (spendCol) {
      hasAdSpend = true;
      for (var ai = 0; ai < marketingRows.length; ai++) {
        var aName = adProductCol ? String(marketingRows[ai][adProductCol] || "").trim() : "推广" + ai;
        var spend = Number(marketingRows[ai][spendCol]) || 0;
        if (!aName || spend === 0) continue;
        productAdSpend[aName] = (productAdSpend[aName] || 0) + spend;
        totalAdSpend += spend;
      }
    }
  }

  // ── Step 5: Build per-product refund map ──
  var productRefund: Record<string, number> = {};
  var hasRefund = false;
  if (refundRows && refundProfile) {
    var refundProductCol = refundProfile.getColumn("product_name");
    var refundAmountCol = refundProfile.getColumn("refund_amount") || findKeywordCol(refundRows, /退款.*金额|金额/i);
    if (refundAmountCol) {
      hasRefund = true;
      for (var ri = 0; ri < refundRows.length; ri++) {
        var rName = refundProductCol ? String(refundRows[ri][refundProductCol] || "").trim() : "未知";
        var rAmount = Number(refundRows[ri][refundAmountCol]) || 0;
        if (!rName || rAmount === 0) continue;
        productRefund[rName] = (productRefund[rName] || 0) + rAmount;
      }
    }
  }

  // ── Step 6: Compute P&L per product ──
  var products: ProductPnL[] = [];
  var totalRevenue = 0, totalCost = 0, totalRefundLoss = 0, totalNetProfit = 0;

  for (var prodName in productRevenue) {
    if (!productRevenue.hasOwnProperty(prodName)) continue;
    var rev = productRevenue[prodName];

    // Match cost: try exact match first, then fuzzy via entity matching
    var cost = 0;
    if (hasCost) {
      if (productCost[prodName]) {
        cost = productCost[prodName].totalCost / productCost[prodName].count;
      } else {
        // Try fuzzy match
        var bestMatch = fuzzyMatchCost(prodName, productCost);
        if (bestMatch) cost = bestMatch.totalCost / bestMatch.count;
      }
    }

    // Match ad spend
    var adSpend = 0;
    if (hasAdSpend) {
      adSpend = productAdSpend[prodName] || 0;
    }

    // Match refund
    var refundLoss = 0;
    if (hasRefund) {
      refundLoss = productRefund[prodName] || 0;
    }

    var netProfit = rev - cost - adSpend - refundLoss;
    var profitMargin = rev > 0 ? Math.round(netProfit / rev * 10000) / 100 : 0;

    products.push({
      product: prodName,
      revenue: Math.round(rev * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      adSpend: Math.round(adSpend * 100) / 100,
      refundLoss: Math.round(refundLoss * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin: profitMargin,
      dataCompleteness: { hasRevenue: true, hasCost: cost > 0, hasAdSpend: adSpend > 0, hasRefund: refundLoss > 0 },
    });

    totalRevenue += rev;
    totalCost += cost;
    totalAdSpend += adSpend;
    totalRefundLoss += refundLoss;
    totalNetProfit += netProfit;
  }

  products.sort(function (a, b) { return b.netProfit - a.netProfit; });

  var overallMargin = totalRevenue > 0 ? Math.round(totalNetProfit / totalRevenue * 10000) / 100 : 0;

  // Losers and winners
  var loserProducts = products.filter(function (p) { return p.netProfit < 0; });
  var winnerProducts = products.filter(function (p) { return p.netProfit > 0; }).slice(0, 5);

  // Summary
  var summary = "共分析 " + products.length + " 个商品，";
  summary += "总收入 ¥" + Math.round(totalRevenue).toLocaleString();
  if (hasCost) summary += "，总成本 ¥" + Math.round(totalCost).toLocaleString();
  if (hasAdSpend) summary += "，推广费 ¥" + Math.round(totalAdSpend).toLocaleString();
  if (hasRefund) summary += "，退款损失 ¥" + Math.round(totalRefundLoss).toLocaleString();
  summary += "，净利润 ¥" + Math.round(totalNetProfit).toLocaleString();
  summary += "（利润率 " + overallMargin + "%）";
  if (loserProducts.length > 0) summary += "。⚠️ " + loserProducts.length + " 个商品亏损";

  return {
    products, totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalAdSpend: Math.round(totalAdSpend * 100) / 100,
    totalRefundLoss: Math.round(totalRefundLoss * 100) / 100,
    totalNetProfit: Math.round(totalNetProfit * 100) / 100,
    overallMargin, summary, loserProducts, winnerProducts,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

function findKeywordCol(rows: Record<string, unknown>[], regex: RegExp): string | undefined {
  if (!rows || rows.length === 0) return undefined;
  var cols = Object.keys(rows[0]);
  for (var i = 0; i < cols.length; i++) {
    if (regex.test(cols[i])) return cols[i];
  }
  return undefined;
}

function fuzzyMatchCost(productName: string, costMap: Record<string, { totalCost: number; count: number }>): { totalCost: number; count: number } | null {
  var nameLower = productName.toLowerCase().trim();
  var keys = Object.keys(costMap);

  for (var i = 0; i < keys.length; i++) {
    var keyLower = keys[i].toLowerCase();
    // Contains match
    if (nameLower.indexOf(keyLower) !== -1 || keyLower.indexOf(nameLower) !== -1) {
      return costMap[keys[i]];
    }
  }

  return null;
}

function emptyAnalysis(msg: string): ProfitAnalysis {
  return {
    products: [], totalRevenue: 0, totalCost: 0, totalAdSpend: 0,
    totalRefundLoss: 0, totalNetProfit: 0, overallMargin: 0,
    summary: msg, loserProducts: [], winnerProducts: [],
  };
}
