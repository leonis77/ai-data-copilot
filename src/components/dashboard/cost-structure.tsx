"use client";

import { motion } from "framer-motion";
import { PieChart, AlertTriangle } from "lucide-react";
import type { EvidenceCard } from "@/lib/pipeline/types";

function costColor(label: string): string {
  if (label.includes("进货")) return "bg-indigo-500";
  if (label.includes("平台佣金")) return "bg-purple-500";
  if (label.includes("达人佣金")) return "bg-fuchsia-500";
  if (label.includes("退货")) return "bg-red-500";
  if (label.includes("运费")) return "bg-amber-500";
  if (label.includes("广告")) return "bg-cyan-500";
  if (label.includes("固定费用")) return "bg-orange-500";
  if (label.includes("合规") || label.includes("税")) return "bg-rose-500";
  return "bg-white/30";
}

function costColorLight(label: string): string {
  if (label.includes("进货")) return "bg-indigo-500/20";
  if (label.includes("平台佣金")) return "bg-purple-500/20";
  if (label.includes("达人佣金")) return "bg-fuchsia-500/20";
  if (label.includes("退货")) return "bg-red-500/20";
  if (label.includes("运费")) return "bg-amber-500/20";
  if (label.includes("广告")) return "bg-cyan-500/20";
  if (label.includes("固定费用")) return "bg-orange-500/20";
  if (label.includes("合规") || label.includes("税")) return "bg-rose-500/20";
  return "bg-white/10";
}

interface CostStructureProps {
  evidenceCards: EvidenceCard[];
}

export function CostStructure({ evidenceCards }: CostStructureProps) {
  if (evidenceCards.length === 0) return null;

  // Aggregate costs across all products
  const costMap: Record<string, { total: number; benchmarks: string[] }> = {};
  for (var i = 0; i < evidenceCards.length; i++) {
    var card = evidenceCards[i];
    for (var j = 0; j < card.costAttribution.length; j++) {
      var attr = card.costAttribution[j];
      if (!costMap[attr.item]) {
        costMap[attr.item] = { total: 0, benchmarks: [] };
      }
      costMap[attr.item].total += attr.amount;
      if (attr.benchmarkDeviation) {
        costMap[attr.item].benchmarks.push(attr.benchmarkDeviation);
      }
    }
  }

  // Calculate total and sort by amount descending
  const entries = Object.entries(costMap).map(function(_a) {
    var item = _a[0];
    var data = _a[1];
    return { item: item, total: data.total, benchmarks: data.benchmarks };
  });
  const grandTotal = entries.reduce(function(s, e) { return s + e.total; }, 0);
  entries.sort(function(a, b) { return b.total - a.total; });

  // Separate profitable vs unprofitable
  const profitableCards = evidenceCards.filter(function(c) { return c.profit.netPerItem > 0; });
  const losingCards = evidenceCards.filter(function(c) { return c.profit.netPerItem <= 0; });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="relative overflow-hidden rounded-2xl p-5 border border-white/[0.06] card-lift"
      style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.7) 0%, rgba(17,24,39,0.5) 100%)", backdropFilter: "blur(16px)" }}
    >
      {/* Background glow */}
      <div className="absolute bottom-0 right-0 w-48 h-48 opacity-[0.03] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,1) 0%, transparent 70%)", filter: "blur(30px)" }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/80">成本结构分析</h3>
              <p className="text-[10px] text-white/25">全部商品成本汇总</p>
            </div>
          </div>
          <span className="text-[10px] text-white/25 font-mono px-2 py-1 rounded-lg bg-white/[0.04]">
            ¥{Math.round(grandTotal).toLocaleString()}
          </span>
        </div>

        {/* Stacked bar */}
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden flex mb-4">
          {entries.map(function(entry) {
            var pct = grandTotal > 0 ? Math.max((entry.total / grandTotal) * 100, 1) : 0;
            var barColor = costColor(entry.item);
            return (
              <div
                key={entry.item}
                className={"h-full transition-all duration-500 " + barColor}
                style={{ width: pct + "%" }}
                title={entry.item + ": " + pct.toFixed(1) + "%"}
              />
            );
          })}
        </div>

        {/* Legend list */}
        <div className="space-y-1.5 mb-4">
          {entries.slice(0, 8).map(function(entry) {
            var pct = grandTotal > 0 ? ((entry.total / grandTotal) * 100) : 0;
            var hasWarning = entry.benchmarks.length > 0;
            return (
              <div key={entry.item} className="flex items-center gap-2.5 text-[11px] group">
                <div className={"w-2 h-2 rounded-full shrink-0 " + costColor(entry.item)} />
                <span className="text-white/50 flex-1 truncate group-hover:text-white/70 transition-colors">{entry.item}</span>
                <span className="text-white/70 font-mono tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
                <span className="text-white/30 font-mono tabular-nums w-20 text-right">
                  ¥{Math.round(entry.total).toLocaleString()}
                </span>
                {hasWarning && (
                  <span className="text-red-400 cursor-help" title={entry.benchmarks[0]}>
                    <AlertTriangle className="w-3 h-3" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Comparison: profitable vs losing cost structure */}
        {profitableCards.length > 0 && losingCards.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.04]">
            <div className="rounded-lg p-3 bg-emerald-500/[0.03] border border-emerald-500/10">
              <span className="text-[10px] text-emerald-400/60 font-medium">盈利品成本</span>
              <p className="text-xs text-white/60 mt-1 font-medium">
                ¥{Math.round(profitableCards.reduce(function(s, c) { return s + c.costBreakdown.totalCost; }, 0)).toLocaleString()}
                <span className="text-white/30 ml-1">/ {profitableCards.length} 品</span>
              </p>
            </div>
            <div className="rounded-lg p-3 bg-red-500/[0.03] border border-red-500/10">
              <span className="text-[10px] text-red-400/60 font-medium">亏损品成本</span>
              <p className="text-xs text-white/60 mt-1 font-medium">
                ¥{Math.round(losingCards.reduce(function(s, c) { return s + c.costBreakdown.totalCost; }, 0)).toLocaleString()}
                <span className="text-white/30 ml-1">/ {losingCards.length} 品</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default CostStructure;
