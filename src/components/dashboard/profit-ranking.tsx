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
      splitLine: { lineStyle: { color: "#1E293B", type: "dashed" as const } },
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
      className="relative overflow-hidden rounded-2xl p-5 border border-white/[0.06]"
      style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.5)" }}
    >
      <h3 className="text-sm text-white/40 font-medium mb-1">商品利润排行</h3>

      <div className="h-[280px] -mx-2">
        <ReactEChartsCore echarts={echarts} option={option} style={{ height: "100%" }} theme="dark" />
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
        <span>
          <span className="text-green-400/70">盈利品 {evidenceCards.filter(function(c) { return c.profit.netMonthly > 0; }).length} 个</span>
          <span className="text-white/20 mx-1">(+¥{Math.round(profitableTotal).toLocaleString()})</span>
        </span>
        <span>
          <span className="text-red-400/70">亏损品 {evidenceCards.filter(function(c) { return c.profit.netMonthly <= 0; }).length} 个</span>
          <span className="text-white/20 ml-1">(−¥{Math.abs(Math.round(losingTotal)).toLocaleString()})</span>
        </span>
      </div>
    </motion.div>
  );
}

export default ProfitRanking;
