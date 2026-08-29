"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Zap, Lightbulb, CheckCircle2, Clock, PlayCircle, StopCircle, TrendingUp, XCircle } from "lucide-react";
import type { DecisionChainResponse } from "@/lib/agent/api-types";
import type { LoopState } from "@/contexts/data-context";

interface UnifiedTimelineProps {
  decisionChain: DecisionChainResponse | null;
  loopRows: LoopState["rows"];
  className?: string;
}

interface TimelineItem {
  kind: "diagnosis" | "action" | "execution" | "outcome";
  data: any;
  level?: string;
  timestamp: string;
  order: number;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const LEVEL_META: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  critical:    { color: "#DC2626", bg: "rgba(220,38,38,0.05)", border: "rgba(220,38,38,0.12)", label: "严重", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  warning:     { color: "#B45309", bg: "rgba(217,119,6,0.05)", border: "rgba(217,119,6,0.12)", label: "警告", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  opportunity: { color: "#059669", bg: "rgba(5,150,105,0.05)", border: "rgba(5,150,105,0.12)", label: "机会", icon: <Zap className="w-3.5 h-3.5" /> },
};

function formatTime(ts: string): string {
  if (!ts) return "";
  var d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UnifiedTimeline({ decisionChain, loopRows, className = "" }: UnifiedTimelineProps) {
  var items: TimelineItem[] = [];

  // Build diagnosis items from AI analysis
  if (decisionChain) {
    var diags = decisionChain.diagnoses || [];
    for (var i = 0; i < diags.length; i++) {
      var d = diags[i];
      var severityOrder = d.level === "critical" ? 0 : d.level === "warning" ? 1 : d.level === "opportunity" ? 2 : 3;
      var meta = LEVEL_META[d.level] || LEVEL_META.warning;
      items.push({
        kind: "diagnosis", data: d, level: d.level,
        timestamp: decisionChain.analysisRunId || "",
        order: severityOrder,
        label: meta.label, color: meta.color, bg: meta.bg, border: meta.border, icon: meta.icon,
      });
    }
    // Build action items
    var acts = decisionChain.actions || [];
    for (var j = 0; j < acts.length; j++) {
      items.push({
        kind: "action", data: acts[j],
        timestamp: decisionChain.analysisRunId || "",
        order: 4 + j,
        label: "建议", color: "#4F46E5", bg: "rgba(79,70,229,0.05)", border: "rgba(79,70,229,0.10)",
        icon: <Lightbulb className="w-3.5 h-3.5" />,
      });
    }
  }

  // Build execution/outcome items from loop history
  if (loopRows) {
    var loopOffset = 100;
    for (var li = 0; li < loopRows.length; li++) {
      var row = loopRows[li];
      var actionTasks = row.actionTasks || [];
      for (var ti = 0; ti < actionTasks.length; ti++) {
        var task = actionTasks[ti];
        var taskId = task.actionTaskId || "";
        var execs = row.executions ? (row.executions[taskId] || []) : [];
        var outs = row.outcomes ? (row.outcomes[taskId] || []) : [];
        for (var ei = 0; ei < execs.length; ei++) {
          var exec = execs[ei];
          var eMeta: { color: string; bg: string; border: string; label: string; icon: React.ReactNode };
          if (exec.status === "completed") {
            eMeta = { color: "#059669", bg: "rgba(5,150,105,0.05)", border: "rgba(5,150,105,0.12)", label: "已完成", icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
          } else if (exec.status === "failed") {
            eMeta = { color: "#DC2626", bg: "rgba(220,38,38,0.05)", border: "rgba(220,38,38,0.12)", label: "失败", icon: <XCircle className="w-3.5 h-3.5" /> };
          } else if (exec.status === "cancelled") {
            eMeta = { color: "#64748B", bg: "rgba(100,116,139,0.05)", border: "rgba(100,116,139,0.12)", label: "取消", icon: <StopCircle className="w-3.5 h-3.5" /> };
          } else {
            eMeta = { color: "#4F46E5", bg: "rgba(79,70,229,0.05)", border: "rgba(79,70,229,0.12)", label: "执行中", icon: <PlayCircle className="w-3.5 h-3.5" /> };
          }
          items.push({
            kind: "execution", data: exec,
            timestamp: exec.createdAt || exec.executedAt || "",
            order: loopOffset++,
            label: eMeta.label, color: eMeta.color, bg: eMeta.bg, border: eMeta.border, icon: eMeta.icon,
          });
          for (var oi = 0; oi < outs.length; oi++) {
            var out = outs[oi];
            var improvement = out.improvement || 0;
            items.push({
              kind: "outcome", data: out,
              timestamp: out.verifiedAt || "",
              order: loopOffset++,
              label: improvement >= 0 ? "正向结果" : "负向结果",
              color: improvement >= 0 ? "#059669" : "#DC2626",
              bg: improvement >= 0 ? "rgba(5,150,105,0.05)" : "rgba(220,38,38,0.05)",
              border: improvement >= 0 ? "rgba(5,150,105,0.12)" : "rgba(220,38,38,0.12)",
              icon: <TrendingUp className="w-3.5 h-3.5" />,
            });
          }
        }
      }
    }
  }

  // Sort by order
  items.sort(function(a, b) {
    if (a.order !== b.order) return a.order - b.order;
    return a.timestamp.localeCompare(b.timestamp);
  });

  if (items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
      className={"rounded-2xl border p-4 " + className}
      style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-3.5 h-3.5" style={{ color: "rgba(15,15,18,0.30)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>
          统一叙事时间线
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.30)" }}>
          {items.length} 个节点
        </span>
      </div>

      <div className="space-y-3">
        {items.map(function(item, i) {
          var isLast = i === items.length - 1;
          return (
            <div key={i} className="flex gap-3">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: item.bg, borderColor: item.border }}>
                  {item.icon}
                </div>
                {!isLast && (
                  <div className="w-px flex-1 min-h-[20px] mt-1" style={{ background: "rgba(0,0,0,0.04)" }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: item.bg, color: item.color, borderColor: item.border }}>
                    {item.label}
                  </span>
                  {item.timestamp && (
                    <span className="text-[9px] font-medium" style={{ color: "rgba(15,15,18,0.25)" }}>
                      {formatTime(item.timestamp)}
                    </span>
                  )}
                </div>
                {item.kind === "diagnosis" && (
                  <Fragment>
                    <p className="text-xs font-medium text-primary leading-snug">{item.data.title}</p>
                    {item.data.detail && (
                      <p className="text-[10px] leading-relaxed mt-1 line-clamp-2" style={{ color: "rgba(15,15,18,0.45)" }}>{item.data.detail}</p>
                    )}
                    {item.data.impact && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                        <span>预期影响:</span>
                        <span className="font-bold">{item.data.impact}</span>
                      </div>
                    )}
                  </Fragment>
                )}
                {item.kind === "action" && (
                  <Fragment>
                    <p className="text-xs font-medium text-primary leading-snug">{item.data.title || item.data.action}</p>
                    {item.data.reason && (
                      <p className="text-[10px] leading-relaxed mt-1" style={{ color: "rgba(15,15,18,0.45)" }}>{item.data.reason}</p>
                    )}
                    {item.data.expectedProfitImpact !== undefined && item.data.expectedProfitImpact !== 0 && (
                      <div className="text-[10px] font-medium mt-1" style={{ color: "rgba(15,15,18,0.38)" }}>
                        预期收益: <span className="font-bold" style={{ color: item.data.expectedProfitImpact >= 0 ? "#059669" : "#DC2626" }}>
                          {item.data.expectedProfitImpact >= 0 ? "+" : ""}{item.data.expectedProfitImpact.toLocaleString()}元
                        </span>
                      </div>
                    )}
                  </Fragment>
                )}
                {item.kind === "execution" && (
                  <Fragment>
                    <p className="text-xs font-medium text-primary leading-snug">
                      执行 {item.data.id.slice(0, 8)}
                    </p>
                    {item.data.result && (
                      <p className="text-[10px] leading-relaxed mt-1" style={{ color: "rgba(15,15,18,0.45)" }}>{item.data.result}</p>
                    )}
                  </Fragment>
                )}
                {item.kind === "outcome" && (
                  <Fragment>
                    <p className="text-xs font-medium text-primary leading-snug">
                      指标: {item.data.metric}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                      <span>{item.data.beforeValue.toLocaleString()}</span>
                      <span>→</span>
                      <span>{item.data.afterValue.toLocaleString()}</span>
                      <span className={"font-bold " + (item.data.improvement >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {item.data.improvement >= 0 ? "+" : ""}{item.data.improvementPercent.toFixed(1)}%
                      </span>
                    </div>
                  </Fragment>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
