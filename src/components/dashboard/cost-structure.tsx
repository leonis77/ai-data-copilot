"use client";

import { motion } from "framer-motion";
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
      className="relative overflow-hidden rounded-2xl p-5 border border-white/[0.06]"
      style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.5)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-white/40 font-medium">成本结构分析</h3>
        <span className="text-[10px] text-white/25 font-mono">
          总成本: ¥{Math.round(grandTotal).toLocaleString()}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden flex mb-3">
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
            <div key={entry.item} className="flex items-center gap-2 text-[11px]">
              <span className={"w-2 h-2 rounded-full shrink-0 " + costColor(entry.item)} />
              <span className="text-white/50 flex-1">{entry.item}</span>
              <span className="text-white/70 font-mono tabular-nums">{pct.toFixed(1)}%</span>
              <span className="text-white/30 font-mono tabular-nums w-16 text-right">
                ¥{Math.round(entry.total).toLocaleString()}
              </span>
              {hasWarning && (
                <span className="text-red-400 cursor-help" title={entry.benchmarks[0]}>⚠️</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison: profitable vs losing cost structure */}
      {profitableCards.length > 0 && losingCards.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04]">
          <div className="text-center">
            <span className="text-[10px] text-green-400/60">盈利品成本结构</span>
            <p className="text-xs text-white/50 mt-0.5">
              {(function() {
                var t = 0;
                for (var pi = 0; pi < profitableCards.length; pi++) {
                  for (var aj = 0; aj < profitableCards[pi].costAttribution.length; aj++) {
                    t += profitableCards[pi].costAttribution[aj].amount;
                  }
                }
                return "¥" + Math.round(t).toLocaleString() + " / " + profitableCards.length + "品";
              })()}
            </p>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-red-400/60">亏损品成本结构</span>
            <p className="text-xs text-white/50 mt-0.5">
              {(function() {
                var t = 0;
                for (var li = 0; li < losingCards.length; li++) {
                  for (var aj2 = 0; aj2 < losingCards[li].costAttribution.length; aj2++) {
                    t += losingCards[li].costAttribution[aj2].amount;
                  }
                }
                return "¥" + Math.round(t).toLocaleString() + " / " + losingCards.length + "品";
              })()}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default CostStructure;
