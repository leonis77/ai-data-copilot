"use client";

import { Lightbulb, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export function OpportunityCard({ title, detail, action, impact }: { title: string; detail: string; action?: string; impact?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-green-500/20 bg-green-500/5 rounded-2xl p-4 flex items-start gap-3 transition-all hover:border-green-500/30">
      <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-sm text-white/80">{title}</h4>
        <p className="text-xs text-white/40 mt-1">{detail}</p>
        {action && (
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg bg-green-400/10 text-green-400 text-xs font-medium">{action}</span>
            {impact && <span className="text-xs text-white/30">{impact}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
