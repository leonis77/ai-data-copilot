"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

export function ModuleShell({ title, aiSummary, children }: { title: string; aiSummary?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard>
        <div className="mb-4">
          <h2 className="text-heading">{title}</h2>
          {aiSummary && (
            <div className="mt-2 p-3 rounded-xl bg-blue-50 border-blue-100">
              <p className="text-body text-secondary leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}
