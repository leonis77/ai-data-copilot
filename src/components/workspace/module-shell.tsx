"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

export function ModuleShell({ title, aiSummary, children }: { title: string; aiSummary?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard>
        <div className="mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          {aiSummary && (
            <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-white/70 leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}
