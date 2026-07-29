"use client";

import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart as ECBarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EvidenceCard } from "@/lib/pipeline/types";

echarts.use([ECBarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const VERDICT_COLORS: Record<string, [string, string]> = {
  buy_more: ["#10B981", "#34D399"],
  hold:      ["#6366F1", "#818CF8"],
  reduce:    ["#F59E0B", "#FBBF24"],
  drop:      ["#EF4444", "#F87171"],
};

const VERDICT_ICON: Record<string, string> = {
  buy_more: "📈",
  hold: "✅",
  reduce: "⚠️",
  drop: "🛑",
};

interface ProfitRankingProps {
  evidenceCards: EvidenceCard[];
}

export function ProfitRanking({ evidenceCards }: ProfitRankingProps) {
  if (evidenceCards.length === 0) return null;

  const ranked = [...evidenceCards].sort(function(a, b) {
    return b.profit.netMonthly - a.profit.netMonthly;
  });

  const profitableTotal = evidenceCards
    .filter(function(c) { return c.profit.netMonthly > 0; })
    .reduce(function(s, c) { return s + c.profit.netMonthly; }, 0);
  const losingTotal = evidenceCards
    .filter(function(c) { return c.profit.netMonthly <= 0; })
    .reduce(function(s, c) { return s + c.profit.netMonthly; }, 0);

  // Build horizontal bar chart data
  const names: string[] = [];
  const values: number[] = [];
  const itemColors: any[] = [];

  for (var i = 0; i < ranked.length; i++) {
    var card = ranked[i];
    var v = Math.round(card.profit.netMonthly);
    var absVal = Math.abs(v);
    // Use absolute value for bar length; color indicates sign
    names.push(card.productName + " · " + card.platform);
    values.push(absVal);
    var colorPair = VERDICT_COLORS[card.verdict] || VERDICT_COLORS.hold;
    itemColors.push(
      new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: colorPair[0] },
        { offset: 1, color: colorPair[1] },
      ])
    );
  }

  const option = {
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      backgroundColor: "rgba(17, 24, 39, 0.9)",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      textStyle: { color: "#E2E8F0", fontSize: 12 },
      formatter: function(params: any) {
        var idx = params[0]?.dataIndex;
        if (idx === undefined) return "";
        var card = ranked[idx];
        var sign = card.profit.netMonthly >= 0 ? "+" : "−";
        var verdictLabel = card.verdict === "buy_more" ? "加量采购" :
          card.verdict === "hold" ? "继续持有" :
          card.verdict === "reduce" ? "建议减量" : "建议止损";
        return (
          "<strong>" + card.productName + "</strong> · " + card.platform + "<br/>" +
          "月利润: " + sign + "¥" + Math.abs(Math.round(card.profit.netMonthly)).toLocaleString() + "<br/>" +
          "利润率: " + (card.profit.margin >= 0 ? "+" : "−") + Math.abs(card.profit.margin) + "%<br/>" +
          "判决: " + VERDICT_ICON[card.verdict] + " " + verdictLabel + "<br/>" +
          "置信度: " + Math.round(card.verdictConfidence * 100) + "%"
        );
      },
    },
    grid: {
      left: "3%",
      right: "8%",
      bottom: "3%",
      top: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#94A3B8",
        fontSize: 10,
        formatter: function(v: number) {
          if (v >= 10000) return (v / 10000).toFixed(1) + "万";
          if (v >= 1000) return (v / 1000).toFixed(1) + "k";
          return v.toString();
        },
      },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)", type: "dashed" as const } },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category" as const,
      data: names.reverse(),
      axisLabel: {
        color: "#CBD5E1",
        fontSize: 11,
        width: 140,
        overflow: "truncate",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      inverse: true,
    },
    series: [
      {
        type: "bar" as const,
        data: values.reverse().map(function(v, idx) {
          var revIdx = ranked.length - 1 - idx;
          var card = ranked[revIdx];
          return {
            value: v,
            itemStyle: {
              borderRadius: [0, 6, 6, 0],
              color: itemColors[revIdx],
            },
            label: {
              show: true,
              position: "right" as const,
              color: card.profit.netMonthly >= 0 ? "#4ADE80" : "#F87171",
              fontSize: 11,
              fontFamily: "monospace",
              formatter: function() {
                var sign = card.profit.netMonthly >= 0 ? "+" : "−";
                return sign + "¥" + Math.abs(Math.round(card.profit.netMonthly)).toLocaleString();
              },
            },
          };
        }),
        barWidth: "60%",
      },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl p-5 border border-white/[0.08] card-lift bg-surface"
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-0.5">商品利润排行</h3>
            <p className="text-[10px] text-white/30">按月度净利润排序</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white/50">盈利</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-white/50">亏损</span>
            </span>
          </div>
        </div>

        <div className="h-[280px] -mx-2">
          <ReactEChartsCore echarts={echarts} option={option} style={{ height: "100%" }} theme="dark" />
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-400/70 font-medium">
                盈利 {evidenceCards.filter(function(c) { return c.profit.netMonthly > 0; }).length} 个
              </span>
              <span className="text-[10px] text-white/20">+¥{Math.round(profitableTotal).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-red-400/70 font-medium">
                亏损 {evidenceCards.filter(function(c) { return c.profit.netMonthly <= 0; }).length} 个
              </span>
              <span className="text-[10px] text-white/20">−¥{Math.abs(Math.round(losingTotal)).toLocaleString()}</span>
            </div>
          </div>
          <span className="text-[10px] text-white/20">共 {evidenceCards.length} 个商品</span>
        </div>
      </div>
    </motion.div>
  );
}

export default ProfitRanking;
