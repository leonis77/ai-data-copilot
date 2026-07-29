"use client";

import React from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, XCircle, PlayCircle, BarChart3, Clock, RefreshCcw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { Decision, ActionTask, Execution, Outcome } from "@/lib/loop/types";
import { fetchLoopHistory, updateDecisionStatus, updateActionTaskStatus } from "@/lib/loop/client";
import { getStore } from "@/lib/store";

interface LoopReviewBoardProps {
  datasetId: string;
}

interface DecisionRow {
  decision: Decision;
  actionTasks: ActionTask[];
  executions: Record<string, Execution[]>;
  outcomes: Record<string, Outcome[]>;
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const VERDICT_LABEL: Record<string, string> = {
  buy_more: "加量",
  hold: "维持",
  reduce: "减量",
  drop: "止损",
  custom: "自定义",
};

const VERDICT_COLOR: Record<string, string> = {
  buy_more: "text-green-400/80",
  hold: "text-white/50",
  reduce: "text-amber-400/70",
  drop: "text-red-400/70",
  custom: "text-indigo-400/70",
};

const STATUS_ICON: Record<string, React.ReactElement> = {
  running: <PlayCircle className="w-3.5 h-3.5 text-amber-400" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-white/20" />,
  pending: <Clock className="w-3.5 h-3.5 text-white/30" />,
  in_progress: <PlayCircle className="w-3.5 h-3.5 text-amber-400" />,
};

export default function LoopReviewBoard({ datasetId }: LoopReviewBoardProps) {
  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [comparison, setComparison] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  async function load() {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLoopHistory(datasetId);
      const mapped: DecisionRow[] = (data.decisions || []).map(function(dd: any) {
        return {
          decision: dd.decision,
          actionTasks: dd.actionTasks || [],
          executions: dd.executions || {},
          outcomes: dd.outcomes || {},
        };
      });
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载复盘数据失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecisionStatusChange(decisionId: string, status: Decision["status"]) {
    setUpdating(function(prev) { const next = Object.assign({}, prev); next[decisionId] = true; return next; });
    try {
      await updateDecisionStatus({ decisionId, status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新决策状态失败");
    } finally {
      setUpdating(function(prev) { const next = Object.assign({}, prev); next[decisionId] = false; return next; });
    }
  }

  async function handleTaskStatusChange(taskId: string, status: ActionTask["status"]) {
    try {
      await updateActionTaskStatus({ taskId, status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新任务状态失败");
    }
  }

  useEffect(function() {
    void load();
  }, [datasetId]);

  useEffect(function() {
    void loadComparison();
  }, [datasetId]);

  if (rows.length === 0 && !loading) {
    return null;
  }

  // Aggregates
  var totalDecisions = rows.length;
  var totalActionTasks = 0;
  var executedTasks = 0;
  var completedTasks = 0;
  var failedTasks = 0;
  var totalOutcomes = 0;
  var verifiedProfitImpact = 0;
  var expectedProfitImpact = 0;
  var outcomesWithPositiveImprovement = 0;

  for (const row of rows) {
    totalActionTasks += row.actionTasks.length;
    expectedProfitImpact += (row.decision.expectedProfitImpact || 0);
    for (const t of row.actionTasks) {
      const exes = row.executions[t.id] || [];
      if (exes.length > 0) executedTasks++;
      if (exes.some(function(e) { return e.status === "completed"; })) completedTasks++;
      if (exes.some(function(e) { return e.status === "failed"; })) failedTasks++;
      const outs = row.outcomes[t.id] || [];
      totalOutcomes += outs.length;
      for (const o of outs) {
        verifiedProfitImpact += o.improvement;
        if (o.improvement > 0) outcomesWithPositiveImprovement++;
      }
    }
  }

  var completionRate = totalActionTasks > 0 ? Math.round((completedTasks / totalActionTasks) * 100) : 0;
  var positiveRate = totalOutcomes > 0 ? Math.round((outcomesWithPositiveImprovement / totalOutcomes) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mt-8 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400/70" />
          <h2 className="text-sm text-white/40 font-medium">执行复盘看板</h2>
          <span className="text-[10px] text-white/20">{totalDecisions} 次决策 · {totalActionTasks} 个行动</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} />
          刷新
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400/60 bg-red-500/[0.04] rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0}>
          <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">执行完成率</div>
          <div className="text-xl font-semibold text-white/80">{completionRate}%</div>
          <div className="text-[10px] text-white/25 mt-1">{completedTasks}/{totalActionTasks} 个行动已执行</div>
        </GlassCard>
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0.05}>
          <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">正向验证率</div>
          <div className="text-xl font-semibold text-white/80">{positiveRate}%</div>
          <div className="text-[10px] text-white/25 mt-1">{outcomesWithPositiveImprovement}/{totalOutcomes} 条结果验证为正</div>
        </GlassCard>
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0.1}>
          <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">预期收益</div>
          <div className="text-xl font-semibold text-indigo-400/80">{formatMoney(expectedProfitImpact)}</div>
          <div className="text-[10px] text-white/25 mt-1">AI 建议的总预期利润影响</div>
        </GlassCard>
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0.15}>
          <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">验证收益</div>
          <div className={"text-xl font-semibold " + (verifiedProfitImpact >= 0 ? "text-green-400/80" : "text-red-400/80")}>
            {verifiedProfitImpact >= 0 ? "+" : ""}{formatMoney(verifiedProfitImpact)}
          </div>
          <div className="text-[10px] text-white/25 mt-1">Outcome 录入的实际改善值</div>
        </GlassCard>
      </div>

      {/* Decision Timeline */}
      <div className="space-y-3">
        {rows.map(function(row) {
          const d = row.decision;
          const taskExecStats = row.actionTasks.map(function(t) {
            const exes = row.executions[t.id] || [];
            const outs = row.outcomes[t.id] || [];
            const latestExe = exes[0] || null;
            const latestOut = outs[0] || null;
            return { task: t, latestExe, latestOut };
          });

          return (
            <GlassCard key={d.id} className="p-5 rounded-xl" hover={false}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={"text-xs font-medium " + (VERDICT_COLOR[d.verdict] || "text-white/50")}>
                      {VERDICT_LABEL[d.verdict] || d.verdict}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40">
                      {d.riskLevel === "high" ? "高风险" : d.riskLevel === "medium" ? "中风险" : "低风险"}
                    </span>
                    <span className="text-[10px] text-white/20">{formatDate(d.createdAt)}</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{d.summary}</p>
                  {d.productNames.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {d.productNames.map(function(p) {
                        return (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/30">
                            {p}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-white/40">预期收益</div>
                  <div className="text-sm font-medium text-indigo-400/70">{formatMoney(d.expectedProfitImpact)}</div>
                  <div className="text-[10px] text-white/20">置信度 {Math.round((d.confidence || 0) * 100)}%</div>
                </div>
              </div>

              {/* Decision status actions */}
              {d.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-white/25 mr-1">决策操作:</span>
                  <button
                    onClick={function() { handleDecisionStatusChange(d.id, "approved"); }}
                    disabled={!!updating[d.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-300 text-[10px] transition-colors disabled:opacity-50">
                    <CheckCircle2 className="w-3 h-3" />
                    批准
                  </button>
                  <button
                    onClick={function() { handleDecisionStatusChange(d.id, "rejected"); }}
                    disabled={!!updating[d.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[10px] transition-colors disabled:opacity-50">
                    <XCircle className="w-3 h-3" />
                    驳回
                  </button>
                  <button
                    onClick={function() { handleDecisionStatusChange(d.id, "completed"); }}
                    disabled={!!updating[d.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] transition-colors disabled:opacity-50">
                    标记完成
                  </button>
                </div>
              )}
              {d.status !== "pending" && (
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <span className={"text-[10px] px-2 py-0.5 rounded " + (
                    d.status === "approved" ? "bg-green-500/10 text-green-400/70" :
                    d.status === "rejected" ? "bg-red-500/10 text-red-400/70" :
                    d.status === "completed" ? "bg-indigo-500/10 text-indigo-400/70" :
                    "bg-white/5 text-white/40"
                  )}>
                    决策状态: {d.status === "approved" ? "已批准" : d.status === "rejected" ? "已驳回" : d.status === "completed" ? "已完成" : d.status}
                  </span>
                </div>
              )}

              {/* Action tasks */}
              {taskExecStats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
                  {taskExecStats.map(function(item) {
                    const latestOut = item.latestOut;
                    return (
                      <div key={item.task.id} className="flex items-center gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="text-white/50 truncate">{item.task.title}</span>
                          <span className="text-white/20 ml-1">({item.task.priority})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.latestExe ? (
                            <>
                              <span className={"flex items-center gap-1 " + (item.latestExe.status === "completed" ? "text-green-400/70" : item.latestExe.status === "failed" ? "text-red-400/70" : "text-white/30")}>
                                {STATUS_ICON[item.latestExe.status] || STATUS_ICON.pending}
                                {item.latestExe.status === "completed" ? "已完成" : item.latestExe.status === "failed" ? "失败" : item.latestExe.status === "running" ? "执行中" : "待执行"}
                              </span>
                              {latestOut && (
                                <span className={"flex items-center gap-1 " + (latestOut.improvement > 0 ? "text-green-400/60" : latestOut.improvement < 0 ? "text-red-400/60" : "text-white/30")}>
                                  <TrendingUp className="w-3 h-3" />
                                  {latestOut.improvement > 0 ? "+" : ""}{latestOut.improvementPercent.toFixed(1)}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-white/20">未执行</span>
                          )}
                        </div>
                        {/* Action task status controls */}
                        {item.task.status === "pending" && !item.latestExe && (
                          <button
                            onClick={function() { handleTaskStatusChange(item.task.id, "in_progress"); }}
                            className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] transition-colors">
                            开始
                          </button>
                        )}
                        {item.task.status === "in_progress" && (
                          <button
                            onClick={function() { handleTaskStatusChange(item.task.id, "completed"); }}
                            className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-300 text-[10px] transition-colors">
                            完成
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

        {/* ═══ Before/After Comparison ═══ */}
        {comparison && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-5 border border-indigo-500/10 bg-indigo-500/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-indigo-400/70" />
                <h3 className="text-sm text-white/50 font-medium">前后对比验证</h3>
                <span className={"text-[10px] px-2 py-0.5 rounded-full " + (
                  comparison.validation.confidence === "high" ? "bg-green-500/10 text-green-400/70" :
                  comparison.validation.confidence === "medium" ? "bg-amber-500/10 text-amber-400/70" :
                  "bg-red-500/10 text-red-400/70"
                )}>
                  {comparison.validation.confidence === "high" ? "高置信度" : comparison.validation.confidence === "medium" ? "中置信度" : "低置信度"}
                </span>
              </div>
              <button
                onClick={loadComparison}
                disabled={loadingComparison}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-50">
                {loadingComparison ? "刷新中..." : "刷新对比"}
              </button>
            </div>

            {comparison.validation.warnings.length > 0 && (
              <div className="mb-3 p-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.03]">
                {comparison.validation.warnings.map(function(w: string, i: number) {
                  return <p key={i} className="text-[10px] text-amber-400/70">⚠️ {w}</p>;
                })}
              </div>
            )}

            {/* Stats comparison */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <div className="text-[10px] text-white/25 mb-1">利润变化</div>
                <div className={"text-sm font-medium " + (comparison.improvements.profitDelta > 0 ? "text-green-400/80" : "text-red-400/80")}>
                  {comparison.improvements.profitDelta > 0 ? "+" : ""}{formatMoney(comparison.improvements.profitDelta)}
                </div>
                <div className="text-[10px] text-white/25 mt-0.5">
                  {comparison.improvements.profitDeltaPercent > 0 ? "+" : ""}{comparison.improvements.profitDeltaPercent}%
                </div>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <div className="text-[10px] text-white/25 mb-1">利润率变化</div>
                <div className={"text-sm font-medium " + (comparison.improvements.marginDelta > 0 ? "text-green-400/80" : "text-red-400/80")}>
                  {comparison.improvements.marginDelta > 0 ? "+" : ""}{comparison.improvements.marginDelta.toFixed(1)}%
                </div>
                <div className="text-[10px] text-white/25 mt-0.5">
                  {comparison.previous.profitMargin.toFixed(1)}% → {comparison.current.profitMargin.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <div className="text-[10px] text-white/25 mb-1">亏损商品</div>
                <div className={"text-sm font-medium " + (comparison.improvements.lossCountDelta < 0 ? "text-green-400/80" : comparison.improvements.lossCountDelta > 0 ? "text-red-400/80" : "text-white/50")}>
                  {comparison.current.lossCount} 个
                </div>
                <div className="text-[10px] text-white/25 mt-0.5">
                  历史 {comparison.previous.lossCount} 个 → 当前 {comparison.current.lossCount} 个
                </div>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <div className="text-[10px] text-white/25 mb-1">整体改善</div>
                <div className={"text-sm font-medium " + (comparison.validation.hasImprovement ? "text-green-400/80" : "text-amber-400/70")}>
                  {comparison.validation.hasImprovement ? "正向改善" : "待观察"}
                </div>
                <div className="text-[10px] text-white/25 mt-0.5">
                  基于 {comparison.current.productCount} 个商品对比
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
              <p className="text-xs text-white/60 leading-relaxed">{comparison.summary}</p>
            </div>
          </motion.div>
        )}

    </motion.div>
  );
}
