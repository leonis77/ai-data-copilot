"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import type { CrossDatasetSummary } from "@/lib/pipeline/types";

interface CrossDatasetViewProps {
  data: CrossDatasetSummary[];
}

export function CrossDatasetView({ data }: CrossDatasetViewProps) {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-cyan-500/10 overflow-hidden"
      style={{ background: "rgba(6,182,212,0.03)", backdropFilter: "blur(16px)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-cyan-500/10 flex items-center gap-2">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-300">跨数据集对比</span>
        <span className="text-[10px] text-cyan-400/50 ml-auto">
          {data.length} 组关联
        </span>
      </div>

      {/* Content */}
      {data.map(function(cd, idx) {
        return (
          <div key={idx} className="px-4 py-3 space-y-3 border-b border-cyan-500/5 last:border-0">
            {/* Dataset name + overlap */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">
                关联到：{cd.relatedDatasetName}
              </span>
              <span className="text-[10px] text-white/30">
                实体重叠：{cd.entityOverlap.matched}/{cd.entityOverlap.totalCurrent} 商品
                <span className="text-cyan-400/60 ml-1">
                  ({cd.entityOverlap.overlapRate}%)
                </span>
              </span>
            </div>

            {/* Price comparison table */}
            {cd.priceComparisons.length > 0 && (
              <div>
                <div className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wider">
                  价格对比
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/25 border-b border-white/5">
                        <th className="text-left py-1.5 pr-2 font-normal">商品</th>
                        <th className="text-right py-1.5 px-2 font-normal">当前均价</th>
                        <th className="text-right py-1.5 px-2 font-normal">关联均价</th>
                        <th className="text-right py-1.5 pl-2 font-normal">价差</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cd.priceComparisons.slice(0, 8).map(function(pc, pi) {
                        const up = pc.diff > 0;
                        const zero = Math.abs(pc.diff) < 0.01;
                        return (
                          <tr key={pi} className="border-b border-white/[0.02]">
                            <td className="py-1.5 pr-2 text-white/70 truncate max-w-[120px]">
                              {pc.entity}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-white/60">
                              ¥{pc.priceCurrent.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-white/60">
                              ¥{pc.priceRelated.toFixed(2)}
                            </td>
                            <td className={"py-1.5 pl-2 text-right font-mono " + (zero ? "text-white/30" : up ? "text-green-400" : "text-red-400")}>
                              {zero ? "—" : (up ? "+" : "") + pc.diff.toFixed(2)}
                              {!zero && (
                                <span className="text-white/30 ml-0.5">
                                  ({pc.diffPercent >= 0 ? "+" : ""}{pc.diffPercent}%)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {cd.priceComparisons.length > 8 && (
                  <div className="text-[10px] text-white/20 mt-1">
                    +{cd.priceComparisons.length - 8} 项更多
                  </div>
                )}
              </div>
            )}

            {/* Quantity comparison */}
            {cd.quantityComparisons.length > 0 && (
              <div>
                <div className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wider">
                  销量对比
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/25 border-b border-white/5">
                        <th className="text-left py-1.5 pr-2 font-normal">商品</th>
                        <th className="text-right py-1.5 px-2 font-normal">当前销量</th>
                        <th className="text-right py-1.5 px-2 font-normal">关联销量</th>
                        <th className="text-right py-1.5 pl-2 font-normal">差值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cd.quantityComparisons.slice(0, 8).map(function(qc, qi) {
                        const up = qc.gap > 0;
                        const zero = qc.gap === 0;
                        return (
                          <tr key={qi} className="border-b border-white/[0.02]">
                            <td className="py-1.5 pr-2 text-white/70 truncate max-w-[120px]">
                              {qc.entity}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-white/60">
                              {qc.qtyCurrent}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-white/60">
                              {qc.qtyRelated}
                            </td>
                            <td className={"py-1.5 pl-2 text-right font-mono " + (zero ? "text-white/30" : up ? "text-green-400" : "text-red-400")}>
                              {zero ? "—" : (up ? "+" : "") + qc.gap}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

export default CrossDatasetView;
