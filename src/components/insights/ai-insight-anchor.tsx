"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Zap, ExternalLink, X } from "lucide-react";

interface AIInsight {
  id: string;
  type: "anomaly" | "opportunity" | "trend";
  title: string;
  detail?: string;
  severity: "high" | "medium" | "low";
  relatedProduct?: string;
  chartAnchor?: {
    chartId: string;
    dataIndex?: number;
    value?: number;
  };
}

interface AIInsightAnchorProps {
  insights: AIInsight[];
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

const ANCHOR_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  high:   { bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.15)", text: "#DC2626", icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.15)", text: "#B45309", icon: <AlertTriangle className="w-3 h-3" /> },
  low:    { bg: "rgba(79,70,229,0.06)", border: "rgba(79,70,229,0.12)", text: "#4F46E5", icon: <Zap className="w-3 h-3" /> },
};

export function AIInsightAnchor({ insights, selectedId, onSelect, className = "" }: AIInsightAnchorProps) {
  if (insights.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
      className={"space-y-2 " + className}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>
          AI 锚点洞察
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.30)" }}>
          {insights.length} 个关联
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {insights.map(function(insight) {
          var style = ANCHOR_STYLES[insight.severity] || ANCHOR_STYLES.low;
          var isSelected = selectedId === insight.id;

          return (
            <motion.button
              key={insight.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(isSelected ? null : insight.id)}
              className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all " + (isSelected ? "shadow-sm" : "")}
              style={{
                background: isSelected ? style.bg.replace("0.06", "0.10") : style.bg,
                borderColor: isSelected ? style.border.replace("0.15", "0.25") : style.border,
                color: style.text,
              }}
              title={insight.detail || insight.title}>
              {style.icon}
              <span className="max-w-[120px] truncate">{insight.title}</span>
              {insight.relatedProduct && (
                <span className="text-[9px] opacity-70 truncate max-w-[60px]">({insight.relatedProduct})</span>
              )}
              {isSelected && <X className="w-3 h-3 ml-0.5 opacity-60" />}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
