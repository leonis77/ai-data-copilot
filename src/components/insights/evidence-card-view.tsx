"use client";

import { motion } from "framer-motion";
import type { EvidenceCard } from "@/lib/pipeline/types";

// 判决配置
const VERDICT_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  buy_more: { icon: "📈", label: "加量采购", bg: "bg-green-500/10", text: "text-green-400" },
  hold:     { icon: "✅", label: "维持现状", bg: "bg-blue-500/10", text: "text-blue-400" },
  reduce:   { icon: "⚠️", label: "减少采购", bg: "bg-yellow-500/10", text: "text-yellow-400" },
  drop:     { icon: "🛑", label: "停止采购", bg: "bg-red-500/10", text: "text-red-400" },
};

/** 成本归因进度条颜色映射 */
function costBarColor(label: string): string {
  if (label.includes("进货")) return "bg-indigo-500";
  if (label.includes("佣金") || label.includes("达人")) return "bg-purple-500";
  if (label.includes("退货") || label.includes("损耗")) return "bg-red-500";
  if (label.includes("运费")) return "bg-amber-500";
  if (label.includes("广告")) return "bg-cyan-500";
  if (label.includes("合规") || label.includes("税")) return "bg-orange-500";
  return "bg-white/30";
}

interface EvidenceCardViewProps {
  card: EvidenceCard;
  defaultExpanded?: boolean;
}

export function EvidenceCardView({ card, defaultExpanded = true }: EvidenceCardViewProps) {
  const v = VERDICT_CONFIG[card.verdict] || VERDICT_CONFIG.hold;

  // 知识库平均置信度
  const avgKnowledgeConf = card.knowledgeConfidence && card.knowledgeConfidence.length > 0
    ? Math.round(card.knowledgeConfidence.reduce(function(s, k) { return s + k.confidence; }, 0) / card.knowledgeConfidence.length * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-white/10"
      style={{ background: "rgba(17,24,39,0.6)", backdropFilter: "blur(16px)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30 font-mono">
            #{card.cardIndex}
          </span>
          <span className="font-semibold text-sm text-white/90">{card.productName}</span>
          <span className="text-xs text-white/25">{card.platform}</span>
        </div>
        <div className={"flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium " + v.bg + " " + v.text}>
          <span>{v.icon}</span>
          <span>{v.label}</span>
          <span className="text-white/25 ml-0.5">
            {Math.round(card.verdictConfidence * 100)}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Profit summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-[10px] text-white/30 mb-0.5">售价</div>
            <div className="text-sm font-mono text-white/80">¥{card.sellPrice.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-white/30 mb-0.5">单品利润</div>
            <div className={"text-sm font-mono " + (card.profit.netPerItem >= 0 ? "text-green-400" : "text-red-400")}>
              {card.profit.netPerItem >= 0 ? "+" : ""}¥{card.profit.netPerItem.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-white/30 mb-0.5">利润率</div>
            <div className={"text-sm font-mono " + (card.profit.margin >= 0 ? "text-green-400" : "text-red-400")}>
              {card.profit.margin >= 0 ? "+" : ""}{card.profit.margin}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-white/30 mb-0.5">月利润</div>
            <div className={"text-sm font-mono " + (card.profit.netMonthly >= 0 ? "text-green-400" : "text-red-400")}>
              {card.profit.netMonthly >= 0 ? "+" : ""}¥{Math.abs(Math.round(card.profit.netMonthly)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Cost attribution bar */}
        {card.costAttribution.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/25 uppercase tracking-wider">成本归因</div>
            {/* Stacked bar */}
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
              {card.costAttribution.map(function(attr, i) {
                return (
                  <div
                    key={i}
                    className={"h-full " + costBarColor(attr.item)}
                    style={{ width: Math.max(attr.percentage, 1) + "%" }}
                    title={attr.item + ": " + attr.percentage.toFixed(1) + "%"}
                  />
                );
              })}
            </div>
            {/* Legend — show top 5 cost items */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {card.costAttribution.slice(0, 5).map(function(attr, i) {
                const hasWarning = attr.benchmarkDeviation && attr.benchmarkDeviation.includes("⚠️");
                return (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <span className={"w-1.5 h-1.5 rounded-full " + costBarColor(attr.item)} />
                    <span className="text-white/50">{attr.item}</span>
                    <span className="text-white/70 font-mono">{attr.percentage.toFixed(1)}%</span>
                    {hasWarning && <span className="text-red-400" title={attr.benchmarkDeviation}>⚠️</span>}
                  </div>
                );
              })}
              {card.costAttribution.length > 5 && (
                <span className="text-white/20 text-[10px]">+{card.costAttribution.length - 5} 项</span>
              )}
            </div>
          </div>
        )}

        {/* Verdict reason */}
        <p className="text-xs text-white/45 leading-relaxed">{card.verdictReason}</p>

        {/* Footer: rules + knowledge */}
        <div className="flex items-center gap-3 flex-wrap">
          {card.ruleIds.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {card.ruleIds.map(function(rid, i) {
                return (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25 font-mono">
                    {rid}
                  </span>
                );
              })}
            </div>
          )}
          {avgKnowledgeConf !== null && (
            <span className="text-[10px] text-white/20">
              知识置信度 {avgKnowledgeConf}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default EvidenceCardView;
