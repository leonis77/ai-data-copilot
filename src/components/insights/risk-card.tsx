"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function RiskCard({ title, detail, level }: { title: string; detail: string; level: "critical"|"warning" }) {
  const isCrit = level === "critical";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={"border rounded-2xl p-4 flex items-start gap-3 transition-all " + (isCrit ? "border-red-500/20 bg-red-500/5" : "border-yellow-500/20 bg-yellow-500/5")}>
      <AlertTriangle className={"w-5 h-5 shrink-0 mt-0.5 " + (isCrit ? "text-red-400" : "text-yellow-400")} />
      <div>
        <h4 className="font-medium text-sm text-white/80">{title}</h4>
        <p className="text-xs text-white/40 mt-1">{detail}</p>
      </div>
    </motion.div>
  );
}
