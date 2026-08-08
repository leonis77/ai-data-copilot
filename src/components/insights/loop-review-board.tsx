"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, XCircle, PlayCircle, BarChart3, Clock, RefreshCcw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { Decision, ActionTask, Execution, Outcome } from "@/lib/loop/types";
import { fetchLoopHistory, updateDecisionStatus, updateActionTaskStatus } from "@/lib/loop/client";
import { useAuth } from "@/lib/auth-context";

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
  buy_more: "text-emerald-500",
  hold: "text-brand",
  reduce: "text-amber-500",
  drop: "text-red-500",
  custom: "text-brand",
};

const STATUS_ICON: Record<string, React.ReactElement> = {
  running: <PlayCircle className="w-3.5 h-3.5 text-amber-500" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-faint" />,
  pending: <Clock className="w-3.5 h-3.5 text-faint" />,
  in_progress: <PlayCircle className="w-3.5 h-3.5 text-amber-500" />,
};

export default function LoopReviewBoard({ datasetId }: LoopReviewBoardProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [comparison, setComparison] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Prevent concurrent fetches for the same datasetId.
  var loadingRef = useRef(false);
  var loadingComparisonRef = useRef(false);

  async function load() {
    if (!datasetId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLoopHistory(datasetId, user?.id);
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
      loadingRef.current = false;
      setLoading(false);
    }
  }

  async function loadComparison() {
    if (!datasetId || loadingComparisonRef.current) return;
    loadingComparisonRef.current = true;
    setLoadingComparison(true);
    try {
      const data = await fetchLoopHistory(datasetId, user?.id);
      const decisions = data.decisions || [];
      if (decisions.length >= 2) {
        const first = decisions[0];
        const last = decisions[decisions.length - 1];
        const prevProfit = Number(first.decision.expectedProfitImpact || 0);
        const currProfit = Number(last.decision.expectedProfitImpact || 0);
        const profitDelta = currProfit - prevProfit;
        setComparison({
          validation: { confidence: "medium", warnings: [], hasImprovement: profitDelta > 0 },
          improvements: {
            profitDelta,
            profitDeltaPercent: prevProfit !== 0 ? Math.round((profitDelta / Math.abs(prevProfit)) * 100) : 0,
            marginDelta: 0,
            lossCountDelta: 0,
          },
          previous: { profitMargin: 0, lossCount: 0 },
          current: { profitMargin: 0, lossCount: 0, productCount: 0 },
        });
      } else if (decisions.length === 1) {
        setComparison({
          validation: { confidence: "low", warnings: ["仅有一条决策记录，无法进行前后对比"], hasImprovement: false },
          improvements: { profitDelta: 0, profitDeltaPercent: 0, marginDelta: 0, lossCountDelta: 0 },
          previous: { profitMargin: 0, lossCount: 0 },
          current: { profitMargin: 0, lossCount: 0, productCount: 0 },
        });
      } else {
        setComparison(null);
      }
    } catch (e) {
      console.warn("Failed to load comparison:", e);
    } finally {
      loadingComparisonRef.current = false;
      setLoadingComparison(false);
    }
  }

  // Single effect for both data loads — avoids duplicate fetchLoopHistory
  // calls when datasetId changes and prevents overlapping requests.
  useEffect(function() {
    void load();
    void loadComparison();
  }, [datasetId]);

  async function handleDecisionStatusChange(decisionId: string, status: Decision["status"]) {
    setUpdating(function(prev) { const next = Object.assign({}, prev); next[decisionId] = true; return next; });
    try {
      await updateDecisionStatus({ decisionId, status });
      await load();
      await loadComparison();
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
      await loadComparison();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新任务状态失败");
    }
  }

  if (rows.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-8 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            <h2 className="text-heading">执行复盘看板</h2>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 text-caption text-faint hover:text-primary transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCcw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} />
            刷新
          </button>
        </div>
        <div className="p-8 rounded-2xl border border-gray-100 text-center card">
          <div className="icon-box bg-blue-50 mx-auto mb-3"><BarChart3 className="w-5 h-5 text-brand" /></div>
          <p className="text-body">尚无执行复盘数据</p>
          <p className="text-caption mt-2">完成 AI 经营分析并批准决策后，执行与验证数据将在此展示</p>
        </div>
      </motion.div>
    );
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
          <BarChart3 className="w-4 h-4 text-brand" />
          <h2 className="text-heading">执行复盘看板</h2>
          <span className="text-caption">{totalDecisions} 次决策 · {totalActionTasks} 个行动</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 text-caption text-faint hover:text-primary transition-colors duration-200 disabled:opacity-50"
        >
          <RefreshCcw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} />
          刷新
        </button>
      </div>

      {error && (
        <div className="text-body text-red-500 bg-red-50 rounded-lg px-4 py-2 border border-red-100">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0}>
          <div className="text-caption text-faint uppercase tracking-wider mb-1.5 font-medium">执行完成率</div>
          <div className="text-xl font-semibold text-primary">{completionRate}%</div>
          <div className="text-caption text-faint mt-1">{completedTasks}/{totalActionTasks} 个行动已执行</div>
        </GlassCard>
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0.05}>
          <div className="text-caption text-faint uppercase tracking-wider mb-1.5 font-medium">正向验证率</div>
          <div className="text-xl font-semibold text-primary">{positiveRate}%</div>
          <div className="text-caption text-faint mt-1">{outcomesWithPositiveImprovement}/{totalOutcomes} 条结果验证为正</div>
        </GlassCard>
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0.1}>
          <div className="text-caption text-faint uppercase tracking-wider mb-1.5 font-medium">预期收益</div>
          <div className="text-xl font-semibold text-brand">{formatMoney(expectedProfitImpact)}</div>
          <div className="text-caption text-faint mt-1">AI 建议的总预期利润影响</div>
        </GlassCard>
        <GlassCard className="p-4 rounded-xl" hover={false} delay={0.15}>
          <div className="text-caption text-faint uppercase tracking-wider mb-1.5 font-medium">验证收益</div>
          <div className={"text-xl font-semibold " + (verifiedProfitImpact >= 0 ? "text-emerald-500" : "text-red-500")}>
            {verifiedProfitImpact >= 0 ? "+" : ""}{formatMoney(verifiedProfitImpact)}
          </div>
          <div className="text-caption text-faint mt-1">Outcome 录入的实际改善值</div>
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
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={"text-sm font-medium " + (VERDICT_COLOR[d.verdict] || "text-brand")}>
                      {VERDICT_LABEL[d.verdict] || d.verdict}
                    </span>
                    <span className="text-caption px-1.5 py-0.5 rounded bg-gray-50 text-faint border border-gray-200">
                      {d.riskLevel === "high" ? "高风险" : d.riskLevel === "medium" ? "中风险" : "低风险"}
                    </span>
                    <span className="text-caption text-faint">{formatDate(d.createdAt)}</span>
                  </div>
                  <p className="text-body leading-relaxed line-clamp-2">{d.summary}</p>
                  {d.productNames.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {d.productNames.map(function(p) {
                        return (
                          <span key={p} className="text-caption px-1.5 py-0.5 rounded bg-gray-50 text-faint border border-gray-100">
                            {p}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-caption text-faint">预期收益</div>
                  <div className="text-sm font-medium text-brand">{formatMoney(d.expectedProfitImpact)}</div>
                  <div className="text-caption text-faint">置信度 {Math.round((d.confidence || 0) * 100)}%</div>
                </div>
              </div>

              {/* Decision status actions */}
              {d.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  <span className="text-caption text-faint mr-1">决策操作:</span>
                  <button
                    onClick={function() { handleDecisionStatusChange(d.id, "approved"); }}
                    disabled={!!updating[d.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                    <CheckCircle2 className="w-3 h-3" />
                    批准
                  </button>
                  <button
                    onClick={function() { handleDecisionStatusChange(d.id, "rejected"); }}
                    disabled={!!updating[d.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                    <XCircle className="w-3 h-3" />
                    驳回
                  </button>
                  <button
                    onClick={function() { handleDecisionStatusChange(d.id, "completed"); }}
                    disabled={!!updating[d.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-brand text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50">
                    标记完成
                  </button>
                </div>
              )}
              {d.status !== "pending" && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className={"text-caption px-2.5 py-1 rounded-md border " + (
                    d.status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                    d.status === "rejected" ? "bg-red-50 text-red-500 border-red-200" :
                    d.status === "completed" ? "bg-blue-50 text-brand border-blue-200" :
                    "bg-gray-50 text-faint border-gray-200"
                  )}>
                    决策状态: {d.status === "approved" ? "已批准" : d.status === "rejected" ? "已驳回" : d.status === "completed" ? "已完成" : d.status}
                  </span>
                </div>
              )}

              {/* Action tasks */}
              {taskExecStats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {taskExecStats.map(function(item) {
                    const latestOut = item.latestOut;
                    return (
                      <div key={item.task.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-secondary truncate">{item.task.title}</span>
                          <span className="text-faint ml-1">({item.task.priority})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.latestExe ? (
                            <>
                              <span className={"flex items-center gap-1 " + (item.latestExe.status === "completed" ? "text-emerald-500" : item.latestExe.status === "failed" ? "text-red-500" : "text-faint")}>
                                {STATUS_ICON[item.latestExe.status] || STATUS_ICON.pending}
                                {item.latestExe.status === "completed" ? "已完成" : item.latestExe.status === "failed" ? "失败" : item.latestExe.status === "running" ? "执行中" : "待执行"}
                              </span>
                              {latestOut && (
                                <span className={"flex items-center gap-1 " + (latestOut.improvement > 0 ? "text-emerald-500/70" : latestOut.improvement < 0 ? "text-red-500/70" : "text-faint")}>
                                  <TrendingUp className="w-3 h-3" />
                                  {latestOut.improvement > 0 ? "+" : ""}{latestOut.improvementPercent.toFixed(1)}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-faint">未执行</span>
                          )}
                        </div>
                        {/* Action task status controls */}
                        {item.task.status === "pending" && !item.latestExe && (
                          <button
                            onClick={function() { handleTaskStatusChange(item.task.id, "in_progress"); }}
                            className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200 hover:bg-amber-100 transition-colors">
                            开始
                          </button>
                        )}
                        {item.task.status === "in_progress" && (
                          <button
                            onClick={function() { handleTaskStatusChange(item.task.id, "completed"); }}
                            className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors">
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl p-5 border border-blue-100 bg-blue-50/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="icon-box bg-blue-100"><RefreshCcw className="w-4 h-4 text-brand" /></div>
                <h3 className="text-heading">前后对比验证</h3>
                <span className={"text-caption px-2.5 py-1 rounded-full " + (
                  comparison.validation.confidence === "high" ? "badge-success" :
                  comparison.validation.confidence === "medium" ? "badge-warning" :
                  "badge-danger"
                )}>
                  {comparison.validation.confidence === "high" ? "高置信度" : comparison.validation.confidence === "medium" ? "中置信度" : "低置信度"}
                </span>
              </div>
              <button
                onClick={loadComparison}
                disabled={loadingComparison}
                className="text-caption text-faint hover:text-primary transition-colors duration-200 disabled:opacity-50">
                {loadingComparison ? "刷新中..." : "刷新对比"}
              </button>
            </div>

            {comparison.validation.warnings.length > 0 && (
              <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
                {comparison.validation.warnings.map(function(w: string, i: number) {
                  return <p key={i} className="text-caption text-amber-600">⚠️ {w}</p>;
                })}
              </div>
            )}

            {/* Stats comparison */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">利润变化</div>
                <div className={"text-sm font-medium " + (comparison.improvements.profitDelta > 0 ? "text-emerald-500" : "text-red-500")}>
                  {comparison.improvements.profitDelta > 0 ? "+" : ""}{formatMoney(comparison.improvements.profitDelta)}
                </div>
                <div className="text-caption text-faint mt-1">
                  {comparison.improvements.profitDeltaPercent > 0 ? "+" : ""}{comparison.improvements.profitDeltaPercent}%
                </div>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">利润率变化</div>
                <div className={"text-sm font-medium " + (comparison.improvements.marginDelta > 0 ? "text-emerald-500" : "text-red-500")}>
                  {comparison.improvements.marginDelta > 0 ? "+" : ""}{comparison.improvements.marginDelta.toFixed(1)}%
                </div>
                <div className="text-caption text-faint mt-1">
                  {comparison.previous.profitMargin.toFixed(1)}% → {comparison.current.profitMargin.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">整体改善</div>
                <div className={"text-sm font-medium " + (comparison.validation.hasImprovement ? "text-emerald-500" : "text-amber-500")}>
                  {comparison.validation.hasImprovement ? "正向改善" : "待观察"}
                </div>
                <div className="text-caption text-faint mt-1">
                  基于 {comparison.current.productCount} 个商品对比
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl border border-gray-100 bg-white">
              <p className="text-body text-secondary leading-relaxed">{comparison.summary}</p>
            </div>
          </motion.div>
        )}

    </motion.div>
  );
}
