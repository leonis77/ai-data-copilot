"use client";

import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, Shield, Zap, Target } from "lucide-react";
import type { PrioritizedAction } from "@/lib/pipeline/types";

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
  P0: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "立即处理", icon: <Zap className="w-3 h-3" /> },
  P1: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "本周处理", icon: <AlertTriangle className="w-3 h-3" /> },
  P2: { bg: "bg-white/5", text: "text-white/30", border: "border-white/10", label: "计划中", icon: <Target className="w-3 h-3" /> },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high:   { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "高风险" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "中风险" },
  low:    { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "低风险" },
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
      className={"relative rounded-xl border p-4 card-lift " + p.border + " card"}
    >
      {/* Priority + Confidence row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={"inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg font-medium border " + p.bg + " " + p.text + " " + p.border}>
          {p.icon}
          {action.priority} · {p.label}
        </span>
        <span className="text-caption text-white/40 px-2 py-1 rounded-lg bg-white/[0.03]">
          置信度: {action.confidence === "high" ? "高" : action.confidence === "medium" ? "中" : "低"}
        </span>
        <span className={"ml-auto inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg border " + r.bg + " " + r.color + " " + r.border}>
          <Shield className="w-3 h-3" />
          {r.label}
        </span>
      </div>

      {/* Action description */}
      <div className="flex items-start gap-3 mb-3">
        <div className="icon-box bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <ArrowRight className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white/90 leading-snug">{action.action}</h4>
          <p className="text-body mt-1">{action.reason}</p>
        </div>
      </div>

      {/* Impact + Risk details */}
      <div className="flex items-center gap-3 ml-11 mb-3 flex-wrap">
        {action.expectedProfitImpact !== undefined && action.expectedProfitImpact !== 0 && (
          <div className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border " + (action.expectedProfitImpact >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
            <span>预期收益</span>
            <span className="font-bold">
              {action.expectedProfitImpact >= 0 ? "+" : "−"}¥{Math.abs(Math.round(action.expectedProfitImpact)).toLocaleString()}
            </span>
          </div>
        )}
        {action.expected_impact && (
          <span className="text-caption text-white/30 px-2 py-1 rounded-lg bg-white/[0.03]">{action.expected_impact}</span>
        )}
      </div>

      {/* References footer */}
      <div className="flex items-center gap-3 flex-wrap ml-11 pt-2 border-t border-white/[0.06]">
        {action.evidenceRefs && action.evidenceRefs.length > 0 && (
          <span className="text-caption text-white/25">
            证据卡: {action.evidenceRefs.map(function(r) { return "#" + r; }).join(", ")}
          </span>
        )}
        {action.ruleIds && action.ruleIds.length > 0 && (
          <div className="flex items-center gap-1">
            {action.ruleIds.map(function(rid, ri) {
              return (
                <span key={ri} className="text-caption px-1.5 py-0.5 rounded-md bg-indigo-500/5 text-indigo-400/60 font-mono border border-indigo-500/10">
                  {rid}
                </span>
              );
            })}
          </div>
        )}
        {action.risk && (
          <span className="text-caption text-white/20">{action.risk}</span>
        )}
      </div>
    </motion.div>
  );
}

export default ActionCardView;
