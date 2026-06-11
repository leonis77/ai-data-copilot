"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Typewriter } from "@/components/ui/typewriter";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisResult } from "@/types";

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  loading: boolean;
}

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const sections = [
    { title: "数据洞察", icon: TrendingUp, items: analysis.insights, color: "text-accent-cyan", bg: "bg-accent-cyan/10" },
    { title: "风险预警", icon: AlertTriangle, items: analysis.risks, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: "优化建议", icon: Lightbulb, items: analysis.suggestions, color: "text-accent-purple", bg: "bg-accent-purple/10" },
  ];

  return (
    <div className="space-y-6">
      <GlassCard gradient delay={0.1}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-light" />
          </div>
          <div>
            <h3 className="font-semibold text-lg gradient-text">AI 分析总结</h3>
            <p className="text-xs text-white/40">基于 DeepSeek AI 自动分析</p>
          </div>
        </div>
        <Typewriter
          text={analysis.summary}
          speed={25}
          className="text-white/80 leading-relaxed text-sm"
        />
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sections.map((section, i) => (
          <GlassCard key={section.title} delay={0.2 + i * 0.1}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}>
                <section.icon className={`w-4 h-4 ${section.color}`} />
              </div>
              <h4 className={`font-semibold text-sm ${section.color}`}>{section.title}</h4>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <motion.li
                  key={j}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.2 + j * 0.1, duration: 0.3 }}
                  className="flex items-start gap-2"
                >
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${section.bg} border ${section.color.replace("text", "border")}`} />
                  <span className="text-sm text-white/60 leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
