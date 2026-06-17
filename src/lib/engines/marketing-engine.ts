/**
 * 推广分析引擎 — ROI 排名、异常检测、出价建议
 *
 * 设计原则：
 * - 基于业务概念（ad_spend, impressions, clicks, conversions, roi）而非列名
 * - 品类无关：不管是直通车还是巨量千川，只要角色正确，计算逻辑一致
 *
 * @module marketing-engine
 */

import type { BusinessConceptId } from "@/lib/business-concepts";
import type { TableBusinessProfile } from "@/lib/business-concepts";

// ============================================================================
// Types
// ============================================================================

export interface CampaignMetrics {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  revenue: number;
  roi: number;
}

export interface CampaignAlert {
  level: "critical" | "warning" | "opportunity";
  campaign: string;
  title: string;
  detail: string;
  action: string;
  impact: string;
}

export interface MarketingAnalysis {
  campaigns: CampaignMetrics[];
  totalSpend: number;
  totalRevenue: number;
  overallROI: number;
  alerts: CampaignAlert[];
  summary: string;
}

// ============================================================================
// Core API
// ============================================================================

/**
 * 分析推广报表，输出 ROI 排名和优化建议
 *
 * @param rows - 推广报表数据行
 * @param businessProfile - 业务概念映射（需包含 marketing 相关概念）
 */
export function analyzeCampaigns(
  rows: Record<string, unknown>[],
  businessProfile: TableBusinessProfile
): MarketingAnalysis {
  // Find columns by business concept
  var nameCol = businessProfile.getColumn("product_name") ||
    findColByKeyword(rows, /计划|推广|关键词|场景|campaign|keyword|plan/i);

  var spendCol = businessProfile.getColumn("ad_spend") ||
    findColByKeyword(rows, /花费|消耗|spend|cost/i);

  var imprCol = businessProfile.getColumn("impressions") ||
    findColByKeyword(rows, /展现|曝光|impression/i);

  var clickCol = businessProfile.getColumn("clicks") ||
    findColByKeyword(rows, /点击|click/i);

  var convCol = businessProfile.getColumn("conversions") ||
    findColByKeyword(rows, /成交笔数|转化|conversion/i);

  var revCol = businessProfile.getColumn("selling_price") ||
    businessProfile.getColumn("procurement_cost") ||
    findColByKeyword(rows, /成交金额|成交额|gmv|revenue|交易额/i);

  if (!spendCol) {
    return { campaigns: [], totalSpend: 0, totalRevenue: 0, overallROI: 0, alerts: [], summary: "未能识别广告花费列，请确认推广报表格式" };
  }

  // Build campaign metrics
  var campaignMap: Record<string, { spend: number; impr: number; clicks: number; conv: number; rev: number }> = {};
  var useName = nameCol || "unknown";

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var name = nameCol ? String(row[nameCol] || "unknown").trim() : "推广计划" + i;
    var spend = Number(row[spendCol]) || 0;
    var impr = imprCol ? (Number(row[imprCol]) || 0) : 0;
    var clicks = clickCol ? (Number(row[clickCol]) || 0) : 0;
    var conv = convCol ? (Number(row[convCol]) || 0) : 0;
    var rev = revCol ? (Number(row[revCol]) || 0) : 0;

    if (!campaignMap[name]) campaignMap[name] = { spend: 0, impr: 0, clicks: 0, conv: 0, rev: 0 };
    campaignMap[name].spend += spend;
    campaignMap[name].impr += impr;
    campaignMap[name].clicks += clicks;
    campaignMap[name].conv += conv;
    campaignMap[name].rev += rev;
  }

  // Compute campaign-level metrics
  var campaigns: CampaignMetrics[] = [];
  var totalSpend = 0, totalRevenue = 0;

  for (var nameKey in campaignMap) {
    if (!campaignMap.hasOwnProperty(nameKey)) continue;
    var c = campaignMap[nameKey];
    var ctr = c.impr > 0 ? Math.round(c.clicks / c.impr * 10000) / 100 : 0;
    var cpc = c.clicks > 0 ? Math.round(c.spend / c.clicks * 100) / 100 : 0;
    var roi = c.spend > 0 ? Math.round(c.rev / c.spend * 100) / 100 : 0;

    campaigns.push({
      name: nameKey, spend: Math.round(c.spend * 100) / 100,
      impressions: c.impr, clicks: c.clicks, ctr: ctr, cpc: cpc,
      conversions: c.conv, revenue: Math.round(c.rev * 100) / 100, roi: roi,
    });

    totalSpend += c.spend;
    totalRevenue += c.rev;
  }

  campaigns.sort(function (a, b) { return b.spend - a.spend; });

  var overallROI = totalSpend > 0 ? Math.round(totalRevenue / totalSpend * 100) / 100 : 0;

  // Generate alerts
  var alerts = generateCampaignAlerts(campaigns);

  // Generate summary
  var summary = "共分析 " + campaigns.length + " 个推广计划，";
  summary += "总花费 ¥" + Math.round(totalSpend).toLocaleString();
  summary += "，总成交 ¥" + Math.round(totalRevenue).toLocaleString();
  summary += "，整体 ROI " + overallROI;
  if (overallROI < 1) summary += "（⚠️ 亏损：广告费超出成交额）";
  else if (overallROI < 2) summary += "（⚠️ 偏低：建议优化投放策略）";
  else if (overallROI > 5) summary += "（✅ 优秀）";

  return { campaigns, totalSpend: Math.round(totalSpend * 100) / 100, totalRevenue: Math.round(totalRevenue * 100) / 100, overallROI, alerts, summary };
}

// ============================================================================
// Alert Generation
// ============================================================================

function generateCampaignAlerts(campaigns: CampaignMetrics[]): CampaignAlert[] {
  var alerts: CampaignAlert[] = [];

  for (var i = 0; i < campaigns.length; i++) {
    var c = campaigns[i];

    // Critical: ROI < 1 (losing money on ads)
    if (c.roi < 1 && c.spend > 100) {
      alerts.push({
        level: "critical", campaign: c.name,
        title: c.name + " 广告亏损",
        detail: "花费 ¥" + c.spend + "，仅成交 ¥" + c.revenue + "（ROI " + c.roi + "），每花 ¥1 亏 ¥" + (1 - c.roi).toFixed(1),
        action: "立即暂停 " + c.name + "，检查投放设置和落地页",
        impact: "止损约 ¥" + Math.round(c.spend * 0.8) + "/天",
      });
    }

    // Warning: Low CTR
    if (c.ctr < 1 && c.impressions > 1000) {
      alerts.push({
        level: "warning", campaign: c.name,
        title: c.name + " 点击率过低 (CTR " + c.ctr + "%)",
        detail: "展现 " + c.impressions + " 次但仅 " + c.clicks + " 次点击，创意或定向可能有问题",
        action: "优化 " + c.name + " 的广告创意和人群定向",
        impact: "提高点击率可降低点击成本",
      });
    }

    // Warning: High CPC relative to others
    if (campaigns.length > 3) {
      var avgCPC = campaigns.reduce(function (s, x) { return s + x.cpc; }, 0) / Math.max(1, campaigns.filter(function (x) { return x.cpc > 0; }).length);
      if (c.cpc > avgCPC * 2 && c.spend > 50) {
        alerts.push({
          level: "warning", campaign: c.name,
          title: c.name + " 点击单价过高 (CPC ¥" + c.cpc + "，均值 ¥" + Math.round(avgCPC * 100) / 100 + ")",
          detail: "点击成本是其他计划的 " + Math.round(c.cpc / avgCPC) + " 倍",
          action: "降低 " + c.name + " 的出价至 ¥" + Math.round(avgCPC * 100) / 100 + " 附近",
          impact: "预计节省 ¥" + Math.round(c.spend * 0.3) + "/天",
        });
      }
    }

    // Opportunity: High ROI → increase budget
    if (c.roi > 4 && c.spend < campaigns.reduce(function (s, x) { return s + x.spend; }, 0) / Math.max(1, campaigns.length) * 2) {
      alerts.push({
        level: "opportunity", campaign: c.name,
        title: c.name + " 投产比优秀 (ROI " + c.roi + ")，建议加量",
        detail: "当前花费 ¥" + c.spend + "，高 ROI 代表广告效率极高",
        action: "增加 " + c.name + " 预算 50%，预计增收 ¥" + Math.round(c.revenue * 0.5),
        impact: "预计每日增收约 ¥" + Math.round(c.revenue * 0.5 - c.spend * 0.5),
      });
    }
  }

  // Sort: critical → warning → opportunity
  alerts.sort(function (a, b) {
    var order: Record<string, number> = { critical: 0, warning: 1, opportunity: 2 };
    return (order[a.level] || 3) - (order[b.level] || 3);
  });

  // Limit to top 5
  return alerts.slice(0, 5);
}

// ============================================================================
// Internal
// ============================================================================

function findColByKeyword(rows: Record<string, unknown>[], regex: RegExp): string | undefined {
  if (rows.length === 0) return undefined;
  var cols = Object.keys(rows[0]);
  for (var i = 0; i < cols.length; i++) {
    if (regex.test(cols[i])) return cols[i];
  }
  return undefined;
}
