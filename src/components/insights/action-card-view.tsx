"use client";

import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, Shield, Zap, Target } from "lucide-react";
import type { PrioritizedAction } from "@/lib/pipeline/types";

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
  P0: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", label: "立即处理", icon: <Zap className="w-3 h-3" /> },
  P1: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "本周处理", icon: <AlertTriangle className="w-3 h-3" /> },
  P2: { bg: "bg-gray-50", text: "text-faint", border: "border-gray-200", label: "计划中", icon: <Target className="w-3 h-3" /> },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high:   { color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "高风险" },
  medium: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "中风险" },
  low:    { color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", label: "低风险" },
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
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      className={"relative rounded-xl border p-4 card-lift " + p.border + " card"}
    >
      {/* Priority + Confidence row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={"inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg font-medium border " + p.bg + " " + p.text + " " + p.border}>
          {p.icon}
          {action.priority} · {p.label}
        </span>
        <span className="text-caption text-tertiary px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
          置信度: {action.confidence === "high" ? "高" : action.confidence === "medium" ? "中" : "低"}
        </span>
        <span className={"ml-auto inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg border " + r.bg + " " + r.color + " " + r.border}>
          <Shield className="w-3 h-3" />
          {r.label}
        </span>
      </div>

      {/* Action description */}
      <div className="flex items-start gap-3 mb-3">
        <div className="icon-box bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-100">
          <ArrowRight className="w-4 h-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-primary leading-snug">{action.action}</h4>
          <p className="text-body mt-1">{action.reason}</p>
        </div>
      </div>

      {/* Impact + Risk details */}
      <div className="flex items-center gap-3 ml-11 mb-3 flex-wrap">
        {action.expectedProfitImpact !== undefined && action.expectedProfitImpact !== 0 && (
          <div className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border " + (action.expectedProfitImpact >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200")}>
            <span>预期收益</span>
            <span className="font-bold">
              {action.expectedProfitImpact >= 0 ? "+" : "−"}¥{Math.abs(Math.round(action.expectedProfitImpact)).toLocaleString()}
            </span>
          </div>
        )}
        {action.expected_impact && (
          <span className="text-caption text-tertiary px-2 py-1 rounded-lg bg-gray-50">{action.expected_impact}</span>
        )}
      </div>

      {/* References footer */}
      <div className="flex items-center gap-3 flex-wrap ml-11 pt-2.5 border-t border-gray-100">
        {action.evidenceRefs && action.evidenceRefs.length > 0 && (
          <span className="text-caption text-faint">
            证据卡: {action.evidenceRefs.map(function(r) { return "#" + r; }).join(", ")}
          </span>
        )}
        {action.ruleIds && action.ruleIds.length > 0 && (
          <div className="flex items-center gap-1">
            {action.ruleIds.map(function(rid, ri) {
              return (
                <span key={ri} className="text-caption px-1.5 py-0.5 rounded-md bg-blue-50 text-brand font-mono border border-blue-200">
                  {rid}
                </span>
              );
            })}
          </div>
        )}
        {action.risk && (
          <span className="text-caption text-faint">{action.risk}</span>
        )}
      </div>
    </motion.div>
  );
}

export default ActionCardView;
