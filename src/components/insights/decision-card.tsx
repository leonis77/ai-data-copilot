"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

interface DecisionCardProps {
  title: string;
  description: string;
  impact: string;
  priority: "P0" | "P1" | "P2";
  index?: number;
}

const priorityConfig = {
  P0: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "????" },
  P1: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "????" },
  P2: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20", label: "????" },
};

export function DecisionCard({ title, description, impact, priority, index = 0 }: DecisionCardProps) {
  const config = priorityConfig[priority];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-xl p-5 border ${config.border} cursor-pointer group`}
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${priority === "P0" ? "rgba(239,68,68,0.08)" : priority === "P1" ? "rgba(251,191,36,0.08)" : "rgba(56,189,248,0.08)"} 0%, transparent 60%)` }}
      />

      <div className="relative z-10 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Zap className={`w-5 h-5 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-white/90">{title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.bg} ${config.text} font-medium`}>
              {priority} ? {config.label}
            </span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed mb-2">{description}</p>
          <div className="flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors">
            <ArrowRight className="w-3 h-3" />
            <span>{impact}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
