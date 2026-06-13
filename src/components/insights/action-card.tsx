"use client";

import { motion } from "framer-motion";

export function ActionCard({ title, impact, index }: { title: string; impact?: string; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index*0.05 }} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all">
      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary-light text-xs flex items-center justify-center font-bold shrink-0">{index+1}</span>
      <span className="text-sm text-white/70">{title}</span>
      {impact && <span className="ml-auto text-xs text-green-400/70 font-medium">{impact}</span>}
    </motion.div>
  );
}
