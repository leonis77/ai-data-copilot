"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Zap, Lightbulb, CheckCircle2, Clock } from "lucide-react";

interface NarrativeTimelineProps {
  diagnoses: any[];
  actions?: any[];
  createdAt?: string;
  className?: string;
}

const LEVEL_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  critical:    { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "#DC2626", bg: "rgba(220,38,38,0.05)", border: "rgba(220,38,38,0.12)", label: "严重" },
  warning:     { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "#B45309", bg: "rgba(217,119,6,0.05)", border: "rgba(217,119,6,0.12)", label: "警告" },
  opportunity: { icon: <Zap className="w-3.5 h-3.5" />,       color: "#059669", bg: "rgba(5,150,105,0.05)", border: "rgba(5,150,105,0.12)", label: "机会" },
  action:      { icon: <Lightbulb className="w-3.5 h-3.5" />, color: "#4F46E5", bg: "rgba(79,70,229,0.05)", border: "rgba(79,70,229,0.10)", label: "建议" },
};

export function NarrativeTimeline({ diagnoses, actions = [], createdAt, className = "" }: NarrativeTimelineProps) {
  if (diagnoses.length === 0 && actions.length === 0) return null;

  // Build timeline items: diagnoses first, then actions, ordered by severity
  var items: Array<{ kind: "diagnosis" | "action"; data: any; level: string; timestamp: string; order: number }> = [];

  for (var i = 0; i < diagnoses.length; i++) {
    var d = diagnoses[i];
    var severityOrder = d.level === "critical" ? 0 : d.level === "warning" ? 1 : d.level === "opportunity" ? 2 : 3;
    items.push({ kind: "diagnosis", data: d, level: d.level, timestamp: createdAt || "", order: severityOrder });
  }
  for (var j = 0; j < actions.length; j++) {
    items.push({ kind: "action", data: actions[j], level: "action", timestamp: createdAt || "", order: 4 + j });
  }
  items.sort(function(a, b) { return a.order - b.order; });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
      className={"rounded-2xl border p-4 " + className}
      style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-3.5 h-3.5" style={{ color: "rgba(15,15,18,0.30)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>
          分析叙事时间线
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.30)" }}>
          {items.length} 个节点
        </span>
      </div>

      <div className="space-y-3">
        {items.map(function(item, i) {
          var meta = LEVEL_META[item.level] || LEVEL_META.action;
          var isLast = i === items.length - 1;

          return (
            <div key={i} className="flex gap-3">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: meta.bg, borderColor: meta.border }}>
                  {meta.icon}
                </div>
                {!isLast && (
                  <div className="w-px flex-1 min-h-[20px] mt-1" style={{ background: "rgba(0,0,0,0.04)" }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                    {meta.label}
                  </span>
                  {item.kind === "diagnosis" && item.data.products && item.data.products.length > 0 && (
                    <span className="text-[10px] font-medium truncate" style={{ color: "rgba(15,15,18,0.30)" }}>
                      涉及 {item.data.products.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-primary leading-snug">{item.data.title}</p>
                {item.data.detail && (
                  <p className="text-[10px] leading-relaxed mt-1 line-clamp-2" style={{ color: "rgba(15,15,18,0.45)" }}>
                    {item.data.detail}
                  </p>
                )}
                {item.data.impact && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                    <span>预期影响:</span>
                    <span className="font-bold">{item.data.impact}</span>
                  </div>
                )}
                {item.kind === "action" && item.data.title && (
                  <p className="text-[10px] leading-relaxed mt-1" style={{ color: "rgba(15,15,18,0.45)" }}>
                    {item.data.reason || item.data.description || ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {createdAt && (
        <div className="flex items-center gap-1.5 pt-3 mt-1" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
          <CheckCircle2 className="w-3 h-3" style={{ color: "rgba(15,15,18,0.20)" }} />
          <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.25)" }}>
            分析生成于 {new Date(createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}
    </motion.div>
  );
}
