"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PrioritizedAction } from "@/lib/pipeline/types";

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  P0: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "立即处理" },
  P1: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "本周处理" },
  P2: { bg: "bg-white/5", text: "text-white/30", border: "border-white/10", label: "计划中" },
};

const RISK_CONFIG: Record<string, { color: string }> = {
  high:   { color: "text-red-400" },
  medium: { color: "text-amber-400" },
  low:    { color: "text-green-400" },
};

interface ActionCardViewProps {
  action: PrioritizedAction;
  index?: number;
}

export function ActionCardView({ action, index = 0 }: ActionCardViewProps) {
  const p = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.P2;
  const r = RISK_CONFIG[action.riskLevel] || RISK_CONFIG.medium;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={"relative rounded-xl border p-4 " + p.border}
      style={{ background: "rgba(17,24,39,0.5)", backdropFilter: "blur(12px)" }}
    >
      {/* Priority + Confidence row */}
      <div className="flex items-center gap-2 mb-2">
        <span className={"text-[10px] px-2 py-0.5 rounded-full font-medium border " + p.bg + " " + p.text + " " + p.border}>
          {action.priority} · {p.label}
        </span>
        <span className="text-[10px] text-white/25">
          置信度: {action.confidence === "high" ? "高" : action.confidence === "medium" ? "中" : "低"}
        </span>
        <span className={"ml-auto flex items-center gap-1 text-[10px] " + r.color}>
          <span>{action.riskLevel === "high" ? "▲" : action.riskLevel === "medium" ? "◆" : "●"}</span>
          {action.riskLevel === "high" ? "高风险" : action.riskLevel === "medium" ? "中风险" : "低风险"}
        </span>
      </div>

      {/* Action description */}
      <div className="flex items-start gap-2 mb-2">
        <ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
        <div>
          <h4 className="text-sm font-medium text-white/90">{action.action}</h4>
          <p className="text-xs text-white/45 mt-0.5">{action.reason}</p>
        </div>
      </div>

      {/* Impact + Risk details */}
      <div className="flex items-center gap-4 ml-6 mb-2">
        {action.expectedProfitImpact !== undefined && action.expectedProfitImpact !== 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/25">预期收益</span>
            <span className={"text-xs font-mono font-medium " + (action.expectedProfitImpact >= 0 ? "text-green-400" : "text-red-400")}>
              {action.expectedProfitImpact >= 0 ? "+" : "−"}¥{Math.abs(Math.round(action.expectedProfitImpact)).toLocaleString()}
            </span>
          </div>
        )}
        {action.expected_impact && (
          <div className="text-[10px] text-white/30">{action.expected_impact}</div>
        )}
      </div>

      {/* References footer */}
      <div className="flex items-center gap-3 flex-wrap ml-6">
        {action.evidenceRefs && action.evidenceRefs.length > 0 && (
          <span className="text-[10px] text-white/25">
            证据卡: {action.evidenceRefs.map(function(r) { return "#" + r; }).join(", ")}
          </span>
        )}
        {action.ruleIds && action.ruleIds.length > 0 && (
          <div className="flex items-center gap-1">
            {action.ruleIds.map(function(rid, ri) {
              return (
                <span key={ri} className="text-[9px] px-1 py-0.5 rounded bg-indigo-500/5 text-indigo-400/60 font-mono">
                  {rid}
                </span>
              );
            })}
          </div>
        )}
        {action.risk && (
          <span className="text-[10px] text-white/20">{action.risk}</span>
        )}
      </div>
    </motion.div>
  );
}

export default ActionCardView;
