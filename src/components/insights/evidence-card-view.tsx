"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart as ECBarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Zap, Target, ArrowRight, ExternalLink, Copy, Share2 } from "lucide-react";
import type { EvidenceCard } from "@/lib/pipeline/types";

echarts.use([ECBarChart, GridComponent, TooltipComponent, CanvasRenderer]);

// ═══════════════════════════════════════════════════════════════════════════════
// Design Tokens (from globals.css)
// ═══════════════════════════════════════════════════════════════════════════════

const VERDICT_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string; glow: string; barColor: [string, string] }> = {
  buy_more: { icon: "📈", label: "加量采购", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", glow: "shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]", barColor: ["#10B981", "#34D399"] },
  hold:     { icon: "✅", label: "维持现状", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", glow: "shadow-[0_0_15px_-5px_rgba(37,99,235,0.2)]", barColor: ["#6366F1", "#818CF8"] },
  reduce:   { icon: "⚠️", label: "减少采购", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", glow: "shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]", barColor: ["#F59E0B", "#FBBF24"] },
  drop:     { icon: "🛑", label: "停止采购", bg: "bg-red-50", text: "text-red-500", border: "border-red-200", glow: "shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]", barColor: ["#EF4444", "#F87171"] },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  high:   { color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "高风险", icon: <Shield className="w-3 h-3" /> },
  medium: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "中风险", icon: <AlertTriangle className="w-3 h-3" /> },
  low:    { color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", label: "低风险", icon: <Shield className="w-3 h-3" /> },
};

const COST_COLORS: Record<string, string> = {
  "进货成本": "#6366F1",
  "平台佣金": "#A855F7",
  "达人佣金": "#EC4899",
  "运费险": "#0EA5E9",
  "退货损耗": "#EF4444",
  "固定费用": "#F59E0B",
  "运费": "#10B981",
  "广告费": "#06B6D4",
  "财税合规成本": "#F97316",
};

interface EvidenceCardViewProps {
  card: EvidenceCard;
  defaultExpanded?: boolean;
  onAction?: (action: string, cardIndex: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

/** 环形进度条：利润率/ROI 可视化 */
function CircularGauge({ value, max = 1, size = 72, strokeWidth = 5, label, unit = "%", color }: {
  value: number; max?: number; size?: number; strokeWidth?: number; label?: string; unit?: string; color?: string;
}) {
  var pct = max > 0 ? Math.min(value / max, 1) : 0;
  var radius = (size - strokeWidth) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference * (1 - pct);
  var displayVal = unit === "%" ? Math.round(value) : Math.round(value);
  var displayMax = unit === "%" ? Math.round(max) : Math.round(max);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size, overflow: "hidden" }}>
      <svg width={size} height={size} className="transform -rotate-90" style={{ overflow: "visible" }}>
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
        {/* Value arc */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color || "#6366F1"} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-primary font-mono">{displayVal}{unit}</span>
        {label && <span className="text-[10px] text-faint">{label}</span>}
      </div>
    </div>
  );
}

/** 迷你水平进度条 */
function MiniBar({ value, max, color = "#6366F1", height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  var pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 bg-gray-100 rounded-full overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + "%", backgroundColor: color }} />
    </div>
  );
}

/** 成本明细表格行 */
function CostRow({ label, amount, total, showWarning }: { label: string; amount: number; total: number; showWarning?: boolean }) {
  var pct = total > 0 ? (amount / total) * 100 : 0;
  var color = COST_COLORS[label] || "#6366F1";
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-secondary flex-1 min-w-0 truncate">{label}</span>
      <span className="text-xs text-primary font-mono w-16 text-right">¥{amount.toFixed(2)}</span>
      <div className="w-16">
        <MiniBar value={pct} max={100} color={color} height={4} />
      </div>
      <span className="text-xs text-faint font-mono w-10 text-right">{pct.toFixed(1)}%</span>
      {showWarning && <span className="text-red-500 text-xs" title="占比异常">⚠️</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function EvidenceCardView({ card, defaultExpanded = true, onAction }: EvidenceCardViewProps) {
  const v = VERDICT_CONFIG[card.verdict] || VERDICT_CONFIG.hold;
  const r = RISK_CONFIG[card.verdict === "buy_more" || card.verdict === "hold" ? "low" : card.verdict === "reduce" ? "medium" : "high"] || RISK_CONFIG.medium;

  // Knowledge confidence
  const avgKnowledgeConf = useMemo(function() {
    if (!card.knowledgeConfidence || card.knowledgeConfidence.length === 0) return null;
    return Math.round(card.knowledgeConfidence.reduce(function(s, k) { return s + k.confidence; }, 0) / card.knowledgeConfidence.length * 100);
  }, [card.knowledgeConfidence]);

  // Monthly revenue
  const monthlyRevenue = card.monthlyRevenue || Math.round(card.sellPrice * (card.monthlySales || 1) * 100) / 100;

  // Cost breakdown items (only show items with value > 0)
  const costItems = useMemo(function() {
    if (!card.costBreakdown) return [];
    var items: Array<{ label: string; amount: number }> = [
      { label: "进货成本", amount: card.costBreakdown.purchaseCost || 0 },
      { label: "平台佣金", amount: card.costBreakdown.commissionFee || 0 },
      { label: "达人佣金", amount: card.costBreakdown.influencerCommission || 0 },
      { label: "运费险", amount: card.costBreakdown.shippingInsurance || 0 },
      { label: "退货损耗", amount: card.costBreakdown.returnLoss || 0 },
      { label: "固定费用", amount: card.costBreakdown.fixedFeePerItem || 0 },
      { label: "运费", amount: card.costBreakdown.shippingCost || 0 },
      { label: "广告费", amount: card.costBreakdown.adCost || 0 },
      { label: "财税合规成本", amount: card.costBreakdown.taxComplianceCost || 0 },
    ];
    return items.filter(function(item) { return item.amount > 0.001; });
  }, [card.costBreakdown]);

  // ECharts: Revenue vs Cost comparison
  const revenueCostOption = useMemo(function() {
    var sellPrice = card.sellPrice || 0;
    var totalCost = card.costBreakdown?.totalCost || 0;
    var netProfit = card.profit?.netPerItem || 0;

    return {
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: false },
      xAxis: { type: "value", show: false, max: sellPrice * 1.1 },
      yAxis: { type: "category", show: false, data: ["成本", "售价", "利润"] },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: function(params: any) {
          return params.map(function(p: any) {
            return p.marker + " " + p.name + ": ¥" + p.value.toFixed(2);
          }).join("<br/>");
        },
      },
      series: [
        {
          type: "bar",
          data: [
            { value: totalCost, itemStyle: { color: "#EF4444", borderRadius: [0, 4, 4, 0] } },
            { value: sellPrice, itemStyle: { color: "#6366F1", borderRadius: [0, 4, 4, 0] } },
            { value: Math.abs(netProfit), itemStyle: { color: netProfit >= 0 ? "#10B981" : "#EF4444", borderRadius: [0, 4, 4, 0] } },
          ],
          barWidth: 18,
          label: { show: true, position: "right", fontSize: 10, color: "#64748B", formatter: "¥{c}" },
        },
      ],
    };
  }, [card.sellPrice, card.costBreakdown, card.profit]);

  // ECharts: Cost attribution stacked bar
  const attributionOption = useMemo(function() {
    if (!card.costAttribution || card.costAttribution.length === 0) return null;

    var categories = card.costAttribution.map(function(a) { return a.item; });
    var seriesData = card.costAttribution.map(function(a, i) {
      return {
        value: a.percentage,
        itemStyle: {
          color: COST_COLORS[a.item] || ["#6366F1", "#818CF8"][i % 2],
          borderRadius: i === card.costAttribution.length - 1 ? [4, 0, 0, 4] : [0, 0, 0, 0],
        },
      };
    });

    return {
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: false },
      xAxis: { type: "value", show: false, max: 100 },
      yAxis: { type: "category", data: categories, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11, color: "#64748B" } },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: function(params: any) {
          return params.map(function(p: any) {
            var item = card.costAttribution[p.dataIndex];
            var tip = p.marker + " " + p.name + ": " + p.value.toFixed(1) + "%";
            if (item && item.benchmarkDeviation) tip += "<br/><span style='color:#EF4444'>" + item.benchmarkDeviation + "</span>";
            return tip;
          }).join("<br/>");
        },
      },
      series: [{
        type: "bar",
        data: seriesData,
        barWidth: 16,
        label: { show: true, position: "right", fontSize: 10, color: "#94A3B8", formatter: "{c}%" },
      }],
    };
  }, [card.costAttribution]);

  // Risk level for this verdict
  var riskLevel = card.verdict === "buy_more" || card.verdict === "hold" ? "low" : card.verdict === "reduce" ? "medium" : "high";
  var riskConfig = RISK_CONFIG[riskLevel] || RISK_CONFIG.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
    >
      {/* ═══ HEADER ═══ */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption px-2 py-0.5 rounded-lg bg-gray-50 text-tertiary font-mono border border-gray-200">
            #{String(card.cardIndex + 1).padStart(2, "0")}
          </span>
          <h3 className="text-heading font-semibold text-primary">{card.productName}</h3>
          <span className="text-xs text-faint px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100">{card.platform}</span>
          {card.purchaseCostEstimated && (
            <span className="text-caption px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200" title="进货成本为估算值（按售价55%倒推），实际利润可能有偏差。建议补充进价数据。">
              ⚠️ 成本估算
            </span>
          )}
          {card.costBreakdown?.adCostEstimated && (
            <span className="text-caption px-1.5 py-0.5 rounded bg-orange-50 text-orange-500 border border-orange-200" title="广告费未提供，按¥0计算。实际广告费通常占售价5%-20%，当前利润可能被高估。">
              ⚠️ 广告费缺失
            </span>
          )}
        </div>
        <div className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border " + v.bg + " " + v.text + " " + v.border + " " + v.glow}>
          <span>{v.icon}</span>
          <span>{v.label}</span>
          <span className="text-faint ml-0.5 font-mono">{Math.round(card.verdictConfidence * 100)}%</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ═══ CORE METRICS ROW ═══ */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {[
            { label: "售价", value: "¥" + card.sellPrice.toFixed(2), accent: false },
            { label: "月收入", value: "¥" + monthlyRevenue.toLocaleString(), accent: false },
            { label: "单品利润", value: (card.profit.netPerItem >= 0 ? "+" : "−") + "¥" + Math.abs(card.profit.netPerItem).toFixed(2), accent: card.profit.netPerItem >= 0 },
            { label: "利润率", value: <CircularGauge value={card.profit.margin} max={100} size={56} strokeWidth={3} color={card.profit.margin >= 0 ? "#10B981" : "#EF4444"} />, accent: false, isGauge: true },
            { label: "月利润", value: (card.profit.netMonthly >= 0 ? "+" : "−") + "¥" + Math.abs(Math.round(card.profit.netMonthly)).toLocaleString(), accent: card.profit.netMonthly >= 0 },
            { label: "ROI", value: <CircularGauge value={Math.min(card.profit.roi, 100)} max={100} size={56} strokeWidth={3} color={card.profit.roi >= 50 ? "#6366F1" : "#F59E0B"} />, accent: false, isGauge: true },
          ].map(function(metric, i) {
            return (
              <div key={i} className="rounded-xl p-2 bg-gray-50/80 border border-gray-100 text-center overflow-hidden">
                <div className="text-[10px] text-faint uppercase tracking-wider mb-1">{metric.label}</div>
                <div className={"text-xs font-medium " + (metric.accent && typeof metric.value === "string" && metric.value.startsWith("+") ? "text-emerald-500" : metric.accent && typeof metric.value === "string" ? "text-red-500" : "text-primary") + (metric.isGauge ? " flex justify-center" : " font-mono")}>
                  {metric.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ TWO COLUMNS: Cost Table + Revenue/Cost Chart ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost Breakdown Table */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs text-tertiary uppercase tracking-wider font-medium">成本明细</h4>
              <span className="text-caption text-faint">共 {costItems.length} 项</span>
            </div>
            <div className="space-y-0">
              {costItems.map(function(item, i) {
                var total = card.costBreakdown.totalCost || 1;
                var pct = (item.amount / total) * 100;
                var warning = pct > 30;
                return <CostRow key={i} label={item.label} amount={item.amount} total={total} showWarning={warning} />;
              })}
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-secondary font-medium">总成本</span>
              <span className="text-sm font-mono font-bold text-primary">¥{card.costBreakdown.totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Revenue vs Cost Comparison */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="text-xs text-tertiary uppercase tracking-wider font-medium mb-3">收入 vs 成本</h4>
            <ReactEChartsCore
              echarts={echarts}
              option={revenueCostOption}
              style={{ height: 140 }}
              opts={{ renderer: "canvas" }}
            />
            <div className="flex items-center justify-center gap-4 mt-2">
              {[
                { label: "售价", color: "#6366F1" },
                { label: "成本", color: "#EF4444" },
                { label: card.profit.netPerItem >= 0 ? "利润" : "亏损", color: card.profit.netPerItem >= 0 ? "#10B981" : "#EF4444" },
              ].map(function(item) {
                return (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-caption text-faint">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ COST ATTRIBUTION STACKED BAR ═══ */}
        {attributionOption && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs text-tertiary uppercase tracking-wider font-medium">成本归因</h4>
              <span className="text-caption text-faint">按占比排序</span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <ReactEChartsCore
                echarts={echarts}
                option={attributionOption}
                style={{ height: Math.max(32 * card.costAttribution.length, 80) }}
                opts={{ renderer: "canvas" }}
              />
            </div>
            {/* Legend with deviation warnings */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 pl-1">
              {card.costAttribution.slice(0, 8).map(function(attr, i) {
                var hasWarning = attr.benchmarkDeviation && attr.benchmarkDeviation.includes("⚠️");
                return (
                  <div key={i} className="flex items-center gap-1.5 text-caption">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COST_COLORS[attr.item] || "#6366F1" }} />
                    <span className="text-secondary">{attr.item}</span>
                    <span className="text-primary font-mono font-medium">{attr.percentage.toFixed(1)}%</span>
                    {hasWarning && <span className="text-red-500" title={attr.benchmarkDeviation}>⚠️</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ VERDICT SECTION ═══ */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xl">
              {v.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h4 className="text-sm font-semibold text-primary">{v.label}</h4>
                <span className="text-caption text-faint px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">
                  置信度 {Math.round(card.verdictConfidence * 100)}%
                </span>
                <span className={"inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-lg border " + riskConfig.bg + " " + riskConfig.color + " " + riskConfig.border}>
                  {riskConfig.icon}
                  {riskConfig.label}
                </span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">{card.verdictReason}</p>
            </div>
          </div>
        </div>

        {/* ═══ INDUSTRY BENCHMARK ═══ */}
        {card.industryBenchmark && (
          <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.02] p-4">
            <div className="text-caption text-blue-400/70 mb-3 font-medium uppercase tracking-wider">{card.industryBenchmark.title}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {card.industryBenchmark.metrics.map(function(m, i) {
                var statusColor = m.status === "better" ? "text-emerald-500" : m.status === "worse" ? "text-red-500" : "text-faint";
                var statusIcon = m.status === "better" ? "↑" : m.status === "worse" ? "↓" : "−";
                var benchmarkDisplay = Array.isArray(m.benchmarkValue)
                  ? m.benchmarkValue[0] + "%–" + m.benchmarkValue[1] + "%"
                  : m.benchmarkValue + "%";
                return (
                  <div key={i} className="rounded-lg p-2.5 bg-white border border-gray-100">
                    <div className="text-caption text-faint mb-1">{m.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono font-medium text-primary">{m.userValue}%</span>
                      <span className="text-caption text-faint">vs</span>
                      <span className="text-caption font-mono text-tertiary">{benchmarkDisplay}</span>
                      <span className={"font-mono font-bold " + statusColor}>{statusIcon}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-caption text-faint mt-2.5 leading-relaxed">{card.industryBenchmark.summary}</p>
          </div>
        )}

        {/* ═══ FOOTER + ACTIONS ═══ */}
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            {card.ruleIds.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {card.ruleIds.map(function(rid, i) {
                  return (
                    <span key={i} className="text-caption px-1.5 py-0.5 rounded-md bg-gray-50 text-faint font-mono border border-gray-200">
                      {rid}
                    </span>
                  );
                })}
              </div>
            )}
            {avgKnowledgeConf !== null && (
              <span className="text-caption text-faint flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                知识置信度 {avgKnowledgeConf}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onAction && (
              <>
                <button onClick={() => onAction("copy", card.cardIndex)} className="text-caption text-faint hover:text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-gray-100" title="复制分析">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onAction("share", card.cardIndex)} className="text-caption text-faint hover:text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-gray-100" title="分享">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onAction("detail", card.cardIndex)} className="text-caption text-brand hover:text-brand-dark transition-colors px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 inline-flex items-center gap-1" title="查看详情">
                  详情 <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default EvidenceCardView;
