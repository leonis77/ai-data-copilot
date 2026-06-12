"use client";

import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export function ModuleShell({ title, aiSummary, children }: { title: string; aiSummary?: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white/80">{title}</h2>
        {aiSummary && (
          <div className="flex items-start gap-2 max-w-md">
            <Sparkles className="w-4 h-4 text-primary-light shrink-0 mt-0.5" />
            <p className="text-xs text-white/50 leading-relaxed">{aiSummary}</p>
          </div>
        )}
      </div>
      <div>{children}</div>
    </GlassCard>
  );
}
