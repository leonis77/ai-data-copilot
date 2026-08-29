"use client";

import { Fragment, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, XCircle, PlayCircle, BarChart3, Clock, RefreshCcw } from "lucide-react";
import type { Execution, Outcome } from "@/lib/loop/types";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import { useDataContext, dataEventBus } from "@/contexts/data-context";
import { updateDecisionStatus } from "@/lib/loop/client";

interface LoopReviewBoardProps {
  onDecisionStatusChange?: (decisionId: string, status: "approved" | "rejected") => void;
  pendingActions?: PrioritizedAction[];
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  var d = new Date(iso);
  return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

var VERDICT_LABEL: Record<string, string> = {
  buy_more: "加量", hold: "维持", reduce: "减量", drop: "止损", custom: "自定义",
};

var VERDICT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  buy_more: { bg: "rgba(5,150,105,0.06)", text: "#059669", border: "rgba(5,150,105,0.12)" },
  hold:     { bg: "rgba(79,70,229,0.06)", text: "#4F46E5", border: "rgba(79,70,229,0.12)" },
  reduce:   { bg: "rgba(180,83,9,0.06)", text: "#B45309", border: "rgba(180,83,9,0.12)" },
  drop:     { bg: "rgba(220,38,38,0.06)", text: "#DC2626", border: "rgba(220,38,38,0.12)" },
  custom:   { bg: "rgba(79,70,229,0.06)", text: "#4F46E5", border: "rgba(79,70,229,0.12)" },
};

var STATUS_STYLES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  running:     { icon: <PlayCircle className="w-3.5 h-3.5" />, label: "执行中", color: "#D97706" },
  completed:   { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "已完成", color: "#059669" },
  failed:      { icon: <XCircle className="w-3.5 h-3.5" />, label: "失败", color: "#DC2626" },
  cancelled:   { icon: <XCircle className="w-3.5 h-3.5" />, label: "已取消", color: "rgba(15,15,18,0.30)" },
  pending:     { icon: <Clock className="w-3.5 h-3.5" />, label: "待执行", color: "rgba(15,15,18,0.30)" },
  in_progress: { icon: <PlayCircle className="w-3.5 h-3.5" />, label: "进行中", color: "#D97706" },
};

var DECISION_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending:   { bg: "rgba(79,70,229,0.04)", text: "rgba(15,15,18,0.38)", border: "rgba(0,0,0,0.05)" },
  approved:  { bg: "rgba(5,150,105,0.04)", text: "#059669", border: "rgba(5,150,105,0.10)" },
  rejected:  { bg: "rgba(220,38,38,0.04)", text: "#DC2626", border: "rgba(220,38,38,0.10)" },
  completed: { bg: "rgba(79,70,229,0.04)", text: "#4F46E5", border: "rgba(79,70,229,0.10)" },
};

var RISK_COLORS: Record<string, string> = {
  high: "#DC2626", medium: "#B45309", low: "#059669",
};

// ═══ Summary formatting ═══

interface FormattedSegment {
  type: "header" | "bullet" | "subbullet" | "numbered" | "body" | "empty";
  text: string;
  indent: number;
  raw: string;
}

function parseSummary(raw: string): FormattedSegment[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  var segments: FormattedSegment[] = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();
    if (trimmed === "") {
      segments.push({ type: "empty", text: "", indent: 0, raw: line });
      continue;
    }
    var numberedMatch = trimmed.match(/^#\s*(\d+[\.\、])\s*(.*)$/);
    if (numberedMatch) {
      segments.push({ type: "header", text: trimmed, indent: 0, raw: line });
      continue;
    }
    if (/^(\s{2,})\s*[-*]\s/.test(trimmed) || /^(\s{2,})\s*\d+[\.\)]\s/.test(trimmed)) {
      segments.push({ type: "subbullet", text: trimmed, indent: 1, raw: line });
      continue;
    }
    if (/^[-*]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
      segments.push({ type: "bullet", text: trimmed, indent: 0, raw: line });
      continue;
    }
    segments.push({ type: "body", text: trimmed, indent: 0, raw: line });
  }
  return segments;
}

function renderInlineMarkup(text: string): React.ReactNode {
  var parts: React.ReactNode[] = [];
  var remaining = text;
  var key = 0;
  while (remaining.length > 0) {
    var boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(<strong key={key++} className="font-bold" style={{ color: "rgba(15,15,18,0.88)" }}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    if (remaining.length > 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      remaining = "";
    }
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function FormattedDecisionSummary({ raw }: { raw: string }) {
  var segments = parseSummary(raw);
  return (
    <div className="text-sm leading-relaxed space-y-1" style={{ color: "rgba(15,15,18,0.62)" }}>
      {segments.map(function(seg, i) {
        if (seg.type === "empty") return <div key={i} className="h-2" />;
        if (seg.type === "header") {
          return (
            <div key={i} className="font-bold text-xs uppercase tracking-wider mt-3 first:mt-0" style={{ color: "rgba(15,15,18,0.78)" }}>
              {renderInlineMarkup(seg.text)}
            </div>
          );
        }
        if (seg.type === "bullet") {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(15,15,18,0.18)" }} />
              <span className="flex-1">{renderInlineMarkup(seg.text)}</span>
            </div>
          );
        }
        if (seg.type === "subbullet") {
          return (
            <div key={i} className="flex items-start gap-2 pl-6">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(15,15,18,0.12)" }} />
              <span className="flex-1 text-xs" style={{ color: "rgba(15,15,18,0.52)" }}>{renderInlineMarkup(seg.text)}</span>
            </div>
          );
        }
        if (seg.type === "numbered") {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-[10px] font-bold mt-0.5 shrink-0" style={{ color: "rgba(15,15,18,0.28)" }}>#</span>
              <span className="flex-1">{renderInlineMarkup(seg.text)}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-xs leading-relaxed">{renderInlineMarkup(seg.text)}</p>
        );
      })}
    </div>
  );
}

// ═══ Mini Sub-components ═══

function StatPill({ label, value, sub, accent = "#4F46E5" }: {
  label: string; value: string; sub: string; accent?: string;
}) {
  return (
    <div className="rounded-xl p-4 border transition-all" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(15,15,18,0.38)" }}>{label}</div>
      <div className="text-xl font-extrabold tracking-tight" style={{ color: accent, letterSpacing: "-0.01em" }}>{value}</div>
      <div className="text-[10px] font-medium mt-1" style={{ color: "rgba(15,15,18,0.30)" }}>{sub}</div>
    </div>
  );
}

function FlowBadge({ label, bg, text, border }: { label: string; bg: string; text: string; border: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: bg, color: text, border: "1px solid " + border }}>{label}</span>
  );
}

// ═══ Main ═══

export default function LoopReviewBoard({
  onDecisionStatusChange,
  pendingActions = [],
}: LoopReviewBoardProps) {
  const { state, dispatch } = useDataContext();
  const { rows, loopLoading, loopError } = state.loop;

  const handleRefresh = useCallback(async () => {
    // Refresh is handled automatically by useLoopData when dataset changes
    // This is a no-op placeholder for backward compatibility
  }, []);

  const handleDecisionStatus = useCallback(
    async (decisionId: string, status: "approved" | "rejected") => {
      if (onDecisionStatusChange) {
        await onDecisionStatusChange(decisionId, status);
      } else {
        try {
          await updateDecisionStatus({ decisionId, status });
          // Trigger refresh via event bus
          dataEventBus.emit("loop:refreshed", { source: "loop-review-board" });
        } catch (e) {
          console.error("Failed to update decision status:", e);
        }
      }
    },
    [onDecisionStatusChange]
  );

  // Computed aggregations
  var loopTotalDecisions = 0, loopTotalActionTasks = 0, loopExecutedTasks = 0, loopCompletedTasks = 0;
  var loopFailedTasks = 0, loopTotalOutcomes = 0, loopVerifiedProfit = 0, loopExpectedProfit = 0;
  var loopPositiveOutcomes = 0;

  for (var lri = 0; lri < rows.length; lri++) {
    var lr = rows[lri];
    loopTotalDecisions++;
    var actionTasks = lr.actionTasks || [];
    loopTotalActionTasks += actionTasks.length;
    loopExpectedProfit += (Number(lr.decision.expectedProfitImpact) || 0);
    for (var lti = 0; lti < actionTasks.length; lti++) {
      var lt = actionTasks[lti];
      var taskId = lt.actionTaskId;
      if (!taskId) continue;
      var lexes = lr.executions[taskId] || [];
      if (lexes.length > 0) loopExecutedTasks++;
      if (lexes.some((e: any) => e.status === "completed")) loopCompletedTasks++;
      if (lexes.some((e: any) => e.status === "failed")) loopFailedTasks++;
      var louts = lr.outcomes[taskId] || [];
      loopTotalOutcomes += louts.length;
      for (var loi = 0; loi < louts.length; loi++) {
        loopVerifiedProfit += louts[loi].improvement;
        if (louts[loi].improvement > 0) loopPositiveOutcomes++;
      }
    }
  }

  var loopCompletionRate = loopTotalActionTasks > 0 ? Math.round((loopCompletedTasks / loopTotalActionTasks) * 100) : 0;
  var loopPositiveRate = loopTotalOutcomes > 0 ? Math.round((loopPositiveOutcomes / loopTotalOutcomes) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mt-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(14,165,233,0.05) 100%)" }}>
            <BarChart3 className="w-4 h-4 text-brand" />
          </div>
          <h2 className="text-xl font-extrabold text-primary tracking-tight">执行复盘</h2>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.03)", color: "rgba(15,15,18,0.38)" }}>
            {loopTotalDecisions} 次决策 · {loopTotalActionTasks} 个行动
          </span>
        </div>
        <button onClick={handleRefresh} disabled={loopLoading} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40" style={{ color: "rgba(15,15,18,0.38)" }}>
          <RefreshCcw className={"w-3 h-3 " + (loopLoading ? "animate-spin" : "")} />
          刷新
        </button>
      </div>

      {loopLoading && rows.length === 0 && (
        <div className="p-6 rounded-2xl border border-dashed flex items-center gap-3" style={{ borderColor: "rgba(0,0,0,0.06)", background: "var(--color-bg-surface)" }}>
          <RefreshCcw className="w-4 h-4 animate-spin text-brand" />
          <span className="text-sm text-secondary">正在加载执行复盘...</span>
        </div>
      )}

      {loopError && rows.length === 0 && !loopLoading && (
        <div className="p-4 rounded-xl border border-dashed" style={{ background: "rgba(220,38,38,0.03)", borderColor: "rgba(220,38,38,0.08)" }}>
          <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{loopError}</p>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !loopLoading && !loopError && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="space-y-4">
          {/* Pending actions from agent pipeline (not yet persisted to DB) */}
          {pendingActions.length > 0 && (
            <div className="rounded-2xl border p-5" style={{ background: "rgba(79,70,229,0.02)", borderColor: "rgba(79,70,229,0.08)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(15,15,18,0.38)" }}>待批准决策 ({pendingActions.length} 条 AI 建议)</div>
              <div className="space-y-2">
                {pendingActions.map(function(a: any, i: number) {
                  var prio = a.priority || "P2";
                  var prioStyle: Record<string, { bg: string; text: string; border: string }> = {
                    P0: { bg: "rgba(220,38,38,0.06)", text: "#DC2626", border: "rgba(220,38,38,0.12)" },
                    P1: { bg: "rgba(180,83,9,0.06)", text: "#B45309", border: "rgba(180,83,9,0.12)" },
                    P2: { bg: "rgba(0,0,0,0.02)", text: "rgba(15,15,18,0.38)", border: "rgba(0,0,0,0.05)" },
                  };
                  var ps = prioStyle[prio] || prioStyle.P2;
                  var riskText = RISK_COLORS[a.riskLevel] || "rgba(15,15,18,0.38)";
                  var riskLabel = a.riskLevel === "high" ? "高风险" : a.riskLevel === "medium" ? "中风险" : "低风险";
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ background: ps.bg, color: ps.text, borderColor: ps.border }}>{prio}</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ background: "rgba(0,0,0,0.02)", color: riskText, borderColor: "rgba(0,0,0,0.05)" }}>{riskLabel}</span>
                      <span className="text-xs text-secondary flex-1 truncate">{a.title || a.action || "未命名行动"}</span>
                      {a.actionTaskId ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-brand border border-blue-200">task ✓</span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-50 text-faint border border-gray-200">pending</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "rgba(15,15,18,0.30)" }}>
                上方「行动建议」中点击「开始执行」即可追踪执行进度
              </p>
            </div>
          )}
          {/* Flow indicator */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl p-4 border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
            {[
              { label: "AI 分析", bg: "rgba(79,70,229,0.06)", text: "#4F46E5", border: "rgba(79,70,229,0.10)" },
              { label: "批准决策", bg: "rgba(180,83,9,0.06)", text: "#B45309", border: "rgba(180,83,9,0.10)" },
              { label: "执行行动", bg: "rgba(5,150,105,0.06)", text: "#059669", border: "rgba(5,150,105,0.10)" },
              { label: "录入结果", bg: "rgba(124,58,237,0.06)", text: "#7C3AED", border: "rgba(124,58,237,0.10)" },
              { label: "验证改善", bg: "rgba(0,0,0,0.02)", text: "rgba(15,15,18,0.38)", border: "rgba(0,0,0,0.05)" },
            ].map(function(badge, i) {
              return (
                <Fragment key={i}>
                  <FlowBadge label={badge.label} bg={badge.bg} text={badge.text} border={badge.border} />
                  {i < 4 && <span className="text-[10px] font-medium px-0.5" style={{ color: "rgba(15,15,18,0.15)" }}>→</span>}
                </Fragment>
              );
            })}
          </div>
          {pendingActions.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed text-center" style={{ borderColor: "rgba(0,0,0,0.04)", background: "var(--color-bg-surface)" }}>
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(14,165,233,0.04) 100%)" }}>
              <BarChart3 className="w-5 h-5 text-brand" />
            </div>
            <p className="text-sm text-secondary font-medium">闭环追踪：AI 建议 → 执行 → 验证</p>
            <p className="text-[10px] mt-2 leading-relaxed max-w-md mx-auto" style={{ color: "rgba(15,15,18,0.30)" }}>
              在上方「行动建议」中点击「开始执行」→「完成执行」→「录入结果」，即可在此查看验证数据
            </p>
          </div>
          )}
        </motion.div>
      )}

      {loopError && rows.length > 0 && (
        <div className="p-4 rounded-xl border border-dashed" style={{ background: "rgba(220,38,38,0.03)", borderColor: "rgba(220,38,38,0.08)" }}>
          <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{loopError}</p>
        </div>
      )}

      {/* Stats Row */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill label="执行完成率" value={loopCompletionRate + "%"} sub={loopCompletedTasks + "/" + loopTotalActionTasks + " 个行动已执行"} accent="#4F46E5" />
          <StatPill label="正向验证率" value={loopPositiveRate + "%"} sub={loopPositiveOutcomes + "/" + loopTotalOutcomes + " 条结果验证为正"} accent="#059669" />
          <StatPill label="预期收益" value={formatMoney(loopExpectedProfit)} sub="AI 建议的总预期利润影响" accent="#6366F1" />
          <StatPill label="验证收益" value={(loopVerifiedProfit >= 0 ? "+" : "") + formatMoney(loopVerifiedProfit)} sub="Outcome 录入的实际改善值" accent={loopVerifiedProfit >= 0 ? "#059669" : "#DC2626"} />
        </div>
      )}

      {/* Decision Timeline */}
      {rows.map(function(row) {
        var d = row.decision;
        var taskExecStats = row.actionTasks.map(function(t: any) {
          var taskId = t.actionTaskId;
          var exes = taskId ? (row.executions[taskId] || []) : [];
          var outs = taskId ? (row.outcomes[taskId] || []) : [];
          var latestExe = exes.reduce(function(latest: Execution | null, execution: Execution) {
            if (!latest) return execution;
            return Date.parse(execution.createdAt || "") > Date.parse(latest.createdAt || "") ? execution : latest;
          }, null);
          var latestOut = outs.reduce(function(latest: Outcome | null, outcome: Outcome) {
            if (!latest) return outcome;
            return Date.parse(outcome.verifiedAt || "") > Date.parse(latest.verifiedAt || "") ? outcome : latest;
          }, null);
          return { task: t, latestExe, latestOut };
        });

        // Compute per-decision verified profit for comparison
        var decisionVerifiedProfit = 0;
        var decisionOutcomeCount = 0;
        for (var ti = 0; ti < taskExecStats.length; ti++) {
          var taskOuts = row.outcomes[taskExecStats[ti].task.actionTaskId || ""] || [];
          for (var oi = 0; oi < taskOuts.length; oi++) {
            decisionVerifiedProfit += taskOuts[oi].improvement;
            decisionOutcomeCount++;
          }
        }
        var expectedProfit = Number(d.expectedProfitImpact) || 0;
        var profitDelta = decisionVerifiedProfit - expectedProfit;
        var profitDeltaPercent = expectedProfit !== 0 ? Math.round((profitDelta / Math.abs(expectedProfit)) * 100) : 0;
        var isProfitAccurate = Math.abs(profitDeltaPercent) <= 20;

        return (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border p-5 md:p-6 transition-all" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)", boxShadow: "0 1px 2px rgba(15,15,18,0.03)" }}>
            {/* Decision header with prediction vs actual */}
            <div className="flex flex-col md:flex-row items-start gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-extrabold tracking-tight" style={{ color: VERDICT_COLORS[d.verdict]?.text || "#4F46E5" }}>
                    {VERDICT_LABEL[d.verdict] || d.verdict}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.05)", color: RISK_COLORS[d.riskLevel] || "rgba(15,15,18,0.38)" }}>
                    {d.riskLevel === "high" ? "高风险" : d.riskLevel === "medium" ? "中风险" : "低风险"}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>{formatDate(d.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-primary leading-snug mb-2">
                  {d.summary.split("\n")[0].replace(/[#*]+/g, "").trim() || d.summary.slice(0, 80)}
                </p>
                {/* Prediction vs Actual comparison */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                    <span className="font-bold uppercase tracking-wider">预期</span>
                    <span className="font-mono text-xs font-bold" style={{ color: "#6366F1" }}>{formatMoney(expectedProfit)}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "rgba(15,15,18,0.15)" }}>→</span>
                  <div className="flex items-center gap-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                    <span className="font-bold uppercase tracking-wider">实际</span>
                    <span className="font-mono text-xs font-bold" style={{ color: decisionVerifiedProfit >= 0 ? "#059669" : "#DC2626" }}>{(decisionVerifiedProfit >= 0 ? "+" : "") + formatMoney(decisionVerifiedProfit)}</span>
                  </div>
                  {decisionOutcomeCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{
                      background: isProfitAccurate ? "rgba(5,150,105,0.05)" : "rgba(217,119,6,0.05)",
                      color: isProfitAccurate ? "#059669" : "#B45309",
                      borderColor: isProfitAccurate ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)",
                    }}>
                      {isProfitAccurate ? "✓ 预测准确" : "⚠ 偏差 " + (profitDeltaPercent > 0 ? "+" : "") + profitDeltaPercent + "%"}
                    </span>
                  )}
                </div>
                {d.productNames && d.productNames.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {d.productNames.map(function(p: string) {
                      return (
                        <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.38)", border: "1px solid rgba(0,0,0,0.04)" }}>
                          {p}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 md:text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(15,15,18,0.38)" }}>预期收益</div>
                <div className="text-lg font-extrabold text-brand tracking-tight">{formatMoney(expectedProfit)}</div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(15,15,18,0.30)" }}>置信度 {Math.round((d.confidence || 0) * 100)}%</div>
              </div>
            </div>

            {/* Decision status actions */}
            {d.status === "pending" && (
              <div className="flex items-center gap-2 flex-wrap pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: "rgba(15,15,18,0.38)" }}>决策操作:</span>
                {[
                  { label: "批准", status: "approved" as const, icon: <CheckCircle2 className="w-3 h-3" />, bg: "rgba(5,150,105,0.05)", text: "#059669", border: "rgba(5,150,105,0.12)" },
                  { label: "驳回", status: "rejected" as const, icon: <XCircle className="w-3 h-3" />, bg: "rgba(220,38,38,0.05)", text: "#DC2626", border: "rgba(220,38,38,0.12)" },
                ].map(function(action) {
                  return (
                    <button key={action.status} onClick={() => handleDecisionStatus(d.id, action.status)} disabled={loopLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
                      style={{ background: action.bg, color: action.text, border: "1px solid " + action.border }}>
                      {action.icon}{action.label}
                    </button>
                  );
                })}
              </div>
            )}
            {d.status !== "pending" && (
              <div className="pt-4 mt-1" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold border" style={{ background: DECISION_STATUS_STYLES[d.status]?.bg, color: DECISION_STATUS_STYLES[d.status]?.text, borderColor: DECISION_STATUS_STYLES[d.status]?.border }}>
                  决策状态: {d.status === "approved" ? "已批准" : d.status === "rejected" ? "已驳回" : d.status === "completed" ? "已完成" : d.status}
                </span>
              </div>
            )}

            {/* Action tasks */}
            {taskExecStats.length > 0 && (
              <div className="space-y-2.5 mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                {taskExecStats.map(function(item) {
                  return (
                    <div key={item.task.id} className="flex items-center gap-3 rounded-xl p-3 border transition-all" style={{ background: "rgba(0,0,0,0.01)", borderColor: "rgba(0,0,0,0.03)" }}>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-primary truncate block">{item.task.title}</span>
                        <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>优先级: {item.task.priority}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {item.latestExe ? (
                          <>
                            {(() => {
                              var st = STATUS_STYLES[item.latestExe.status] || STATUS_STYLES.pending;
                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: st.color }}>
                                  {st.icon}{st.label}
                                </span>
                              );
                            })()}
                            {item.latestOut && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: item.latestOut.improvement > 0 ? "#059669" : item.latestOut.improvement < 0 ? "#DC2626" : "rgba(15,15,18,0.30)" }}>
                                <TrendingUp className="w-3 h-3" />
                                {item.latestOut.improvement > 0 ? "+" : ""}{item.latestOut.improvementPercent.toFixed(1)}%
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>未执行</span>
                        )}
                        {!item.latestExe && item.task.status === "pending" && (
                          <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>请从行动建议开始执行</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
