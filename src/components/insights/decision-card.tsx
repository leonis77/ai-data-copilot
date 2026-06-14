"use client";

import { motion } from "framer-motion";
import { ArrowRight, DollarSign, Package, Sparkles, AlertTriangle, TrendingDown } from "lucide-react";

const typeConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  pricing:  { icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  restock:  { icon: Package, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  new_product: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  clearance: { icon: TrendingDown, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  anomaly:  { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

const priorityLabels: Record<string, string> = {
  P0: "\u7acb\u5373\u5904\u7406",
  P1: "\u672c\u5468\u5904\u7406",
  P2: "\u8ba1\u5212\u4e2d",
};

const priorityBgs: Record<string, string> = {
  P0: "bg-red-500/15 text-red-400 border-red-500/25",
  P1: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  P2: "bg-white/5 text-white/30 border-white/10",
};

export interface DecisionCardProps {
  type: string;
  priority: string;
  title: string;
  description: string;
  impact: string;
  action: string;
  confidence?: string;
  relatedMetric?: { label: string; value: string };
  index?: number;
}

export function DecisionCardUI({ type, priority, title, description, impact, action, confidence, relatedMetric, index = 0 }: DecisionCardProps) {
  var cfg = typeConfig[type] || typeConfig.anomaly;
  var Icon = cfg.icon;
  var pBg = priorityBgs[priority] || priorityBgs.P2;
  var pLabel = priorityLabels[priority] || priority;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
      whileHover={{ scale: 1.015, borderColor: "#7C5CFF", transition: { duration: 0.2 } }}
      className={"relative overflow-hidden rounded-2xl p-5 border " + cfg.border + " cursor-pointer group"}
      style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.5)" }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(124,92,255,0.06) 0%, transparent 60%)" }} />

      <div className="relative z-10 flex items-start gap-4">
        <div className={"w-10 h-10 rounded-xl " + cfg.bg + " flex items-center justify-center shrink-0 mt-0.5"}>
          <Icon className={"w-5 h-5 " + cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={"text-[10px] px-2 py-0.5 rounded-full border font-medium " + pBg}>
              {priority} {pLabel}
            </span>
            {confidence && (
              <span className="text-[10px] text-white/20">
                {"\u7f6e\u4fe1\u5ea6: "}{confidence === "high" ? "\u9ad8" : confidence === "medium" ? "\u4e2d" : "\u4f4e"}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-white/90 mb-1">{title}</h3>
          <p className="text-xs text-white/55 leading-relaxed mb-2">{description}</p>
          {relatedMetric && (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] mb-2">
              <span className="text-[10px] text-white/25">{relatedMetric.label}</span>
              <span className="text-xs font-mono text-white/70">{relatedMetric.value}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-white/25 group-hover:text-white/45 transition-colors">
            <ArrowRight className="w-3 h-3" />
            <span>{action}</span>
            <span className="text-white/10 ml-1">{impact}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
