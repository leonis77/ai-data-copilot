"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { Lightbulb } from "lucide-react";

export function ModuleShell({ title, aiSummary, children, accent = "blue" }: {
  title: string;
  aiSummary?: string;
  children: React.ReactNode;
  accent?: "blue" | "amber" | "green" | "red";
}) {
  var accentColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    blue: { bg: "rgba(79,70,229,0.03)", border: "rgba(79,70,229,0.08)", text: "rgba(15,15,18,0.55)", icon: "#4F46E5" },
    amber: { bg: "rgba(217,119,6,0.03)", border: "rgba(217,119,6,0.08)", text: "rgba(15,15,18,0.55)", icon: "#D97706" },
    green: { bg: "rgba(5,150,105,0.03)", border: "rgba(5,150,105,0.08)", text: "rgba(15,15,18,0.55)", icon: "#059669" },
    red: { bg: "rgba(220,38,38,0.03)", border: "rgba(220,38,38,0.08)", text: "rgba(15,15,18,0.55)", icon: "#DC2626" },
  };
  var colors = accentColors[accent] || accentColors.blue;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <GlassCard>
        <div className="mb-4">
          <h2 className="text-heading">{title}</h2>
          {aiSummary && (
            <div className="mt-2.5 flex items-start gap-2.5 p-3 rounded-xl border" style={{ background: colors.bg, borderColor: colors.border }}>
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: colors.icon }} />
              <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{aiSummary}</p>
            </div>
          )}
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}
