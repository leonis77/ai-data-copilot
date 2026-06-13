"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp } from "lucide-react";

export function ActionCard({ title, target, priority, impact, confidence, reason, risk, index }: {
  title: string; target?: string; priority?: "P0"|"P1"|"P2"; impact?: string; confidence?: string; reason?: string; risk?: string; index: number;
}) {
  const pColors: Record<string,string> = { P0: "text-red-400 bg-red-400/10 border-red-400/20", P1: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", P2: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index*0.06 }} className="border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
      <div className="flex items-start gap-4">
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary-light text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{index+1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-white/80">{title}</span>
            {priority && <span className={"px-2 py-0.5 rounded text-xs font-bold border " + (pColors[priority]||"")}>{priority}</span>}
          </div>
          {target && <p className="text-xs text-white/30 mb-1">{target}</p>}
          {reason && <p className="text-xs text-white/40 mb-2">{reason}</p>}
          <div className="flex items-center gap-3 text-xs">
            {impact && <span className="text-green-400/70"><TrendingUp className="w-3 h-3 inline mr-1" />{impact}</span>}
            {confidence && <span className="text-white/30">置信度: {confidence}</span>}
            {risk && <span className="text-red-400/50"><AlertTriangle className="w-3 h-3 inline mr-1" />{risk}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
