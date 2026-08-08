"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  PlayCircle,
  BarChart3,
  Clock,
  RefreshCcw,
  Filter,
  ChevronDown,
  Plus,
  AlertTriangle,
  Target,
  Award,
  Activity,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { Decision, ActionTask, Execution, Outcome } from "@/lib/loop/types";
import type { LoopHistory } from "@/lib/loop/client";
import { fetchLoopHistory, updateDecisionStatus, updateActionTaskStatus, startExecution, completeExecution, saveOutcome } from "@/lib/loop/client";
import { useAuth } from "@/lib/auth-context";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface LoopReviewBoardProps {
  datasetId: string;
  loopData: LoopHistory | null;
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
}

interface DecisionRow {
  decision: Decision;
  actionTasks: ActionTask[];
  executions: Record<string, Execution[]>;
  outcomes: Record<string, Outcome[]>;
}

type TabType = "all" | "pending" | "executing" | "verified";

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

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

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

function formatDateFull(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusLabel(s: string): string {
  if (s === "completed") return "已完成";
  if (s === "failed") return "失败";
  if (s === "cancelled") return "已取消";
  if (s === "running") return "执行中";
  return "待执行";
}

function statusColor(s: string): string {
  if (s === "completed") return "text-emerald-500";
  if (s === "failed") return "text-red-500";
  if (s === "running") return "text-amber-500";
  return "text-faint";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function KpiCard({ title, value, subtitle, icon, trend, trendValue, colorClass = "text-primary" }: {
  title: string; value: string | number; subtitle: string; icon: React.ReactNode; trend?: "up" | "down" | "neutral"; trendValue?: string; colorClass?: string;
}) {
  return (
    <GlassCard className="p-4 rounded-xl" hover={false} delay={0}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption text-faint uppercase tracking-wider font-medium">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-faint">{icon}</div>
      </div>
      <div className={"text-2xl font-semibold " + colorClass}>{value}</div>
      <div className="text-caption text-faint mt-1">{subtitle}</div>
      {trend && trendValue && (
        <div className={"text-xs mt-2 flex items-center gap-1 " + (trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-faint")}>
          <TrendingUp className="w-3 h-3" />
          {trendValue}
        </div>
      )}
    </GlassCard>
  );
}

function TabButton({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 " + (
        active ? "bg-brand text-white shadow-sm" : "text-secondary hover:text-primary hover:bg-gray-50"
      )}>
      {children}
      {count !== undefined && <span className={"text-[10px] px-1.5 py-0.5 rounded-full " + (active ? "bg-white/20 text-white" : "bg-gray-100 text-faint")}>{count}</span>}
    </button>
  );
}

function FilterBar({ filter, setFilter, sortBy, setSortBy }: {
  filter: string; setFilter: (v: string) => void; sortBy: string; setSortBy: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <select
          value={filter}
          onChange={function(e) { setFilter(e.target.value); }}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-secondary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
          <option value="all">全部 verdict</option>
          <option value="buy_more">加量采购</option>
          <option value="hold">维持现状</option>
          <option value="reduce">减少采购</option>
          <option value="drop">停止采购</option>
        </select>
        <ChevronDown className="w-3 h-3 text-faint absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={sortBy}
          onChange={function(e) { setSortBy(e.target.value); }}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-secondary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
          <option value="profit_desc">预期收益 ↓</option>
          <option value="profit_asc">预期收益 ↑</option>
        </select>
        <ChevronDown className="w-3 h-3 text-faint absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Inline Execution Tracker (embedded in board)
// ═══════════════════════════════════════════════════════════════════════════════

function InlineTaskItem({ task, executions, outcomes, onRefresh }: {
  task: ActionTask; executions: Execution[]; outcomes: Outcome[]; onRefresh: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [outcomeMetric, setOutcomeMetric] = useState("月利润");
  const [beforeValue, setBeforeValue] = useState("");
  const [afterValue, setAfterValue] = useState("");
  const [outcomeResult, setOutcomeResult] = useState<string | null>(null);

  const latestExecution = executions.length > 0 ? executions[0] : null;
  const latestOutcome = outcomes.length > 0 ? outcomes[0] : null;
  const improvement = latestOutcome ? latestOutcome.improvement : 0;
  const improvementPercent = latestOutcome ? latestOutcome.improvementPercent : 0;
  const isPositive = improvement > 0;
  const isNegative = improvement < 0;

  async function handleStart() {
    try {
      setRunning(true);
      setOutcomeResult(null);
      const res = await startExecution({
        id: "exec_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        actionTaskId: task.id,
        executedBy: "user",
      });
      if (res.ok) onRefresh();
    } catch (e) {
      setOutcomeResult(e instanceof Error ? e.message : "执行失败");
    } finally { setRunning(false); }
  }

  async function handleComplete() {
    if (!latestExecution) return;
    try {
      setRunning(true);
      setOutcomeResult(null);
      await completeExecution({ executionId: latestExecution.id, status: "completed", result: "已完成" });
      onRefresh();
    } catch (e) {
      setOutcomeResult(e instanceof Error ? e.message : "完成执行失败");
    } finally { setRunning(false); }
  }

  async function handleSaveOutcome() {
    if (!latestExecution) return;
    const before = Number(beforeValue);
    const after = Number(afterValue);
    if (isNaN(before) || isNaN(after)) {
      setOutcomeResult("请输入有效的数字");
      return;
    }
    try {
      setRunning(true);
      setOutcomeResult(null);
      await saveOutcome({
        id: "outcome_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        executionId: latestExecution.id,
        metric: outcomeMetric,
        beforeValue: before,
        afterValue: after,
      });
      setShowOutcomeForm(false);
      setBeforeValue("");
      setAfterValue("");
      onRefresh();
    } catch (e) {
      setOutcomeResult(e instanceof Error ? e.message : "保存结果失败");
    } finally { setRunning(false); }
  }

  return (
    <div className="flex items-center gap-2 text-sm py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-secondary truncate block">{task.title}</span>
        <span className="text-faint text-xs">{task.priority} · {task.riskLevel === "high" ? "高风险" : task.riskLevel === "medium" ? "中风险" : "低风险"}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {latestExecution ? (
          <>
            <span className={"flex items-center gap-1 text-xs " + statusColor(latestExecution.status)}>
              {STATUS_ICON[latestExecution.status] || STATUS_ICON.pending}
              {statusLabel(latestExecution.status)}
            </span>
            {latestOutcome && (
              <span className={"flex items-center gap-1 text-xs " + (isPositive ? "text-emerald-500/70" : isNegative ? "text-red-500/70" : "text-faint")}>
                <TrendingUp className="w-3 h-3" />
                {isPositive ? "+" : ""}{improvementPercent.toFixed(1)}%
              </span>
            )}
          </>
        ) : (
          <span className="text-faint text-xs">未执行</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {(!latestExecution || latestExecution.status === "cancelled" || latestExecution.status === "failed") && (
          <button onClick={handleStart} disabled={running} className="px-2 py-1 rounded-md bg-brand/10 text-brand text-xs hover:bg-brand/20 transition-colors disabled:opacity-50">
            开始
          </button>
        )}
        {latestExecution && latestExecution.status === "running" && (
          <button onClick={handleComplete} disabled={running} className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-xs hover:bg-emerald-100 transition-colors disabled:opacity-50">
            完成
          </button>
        )}
        {latestExecution && latestExecution.status === "completed" && !latestOutcome && !showOutcomeForm && (
          <button onClick={() => setShowOutcomeForm(true)} className="px-2 py-1 rounded-md border border-gray-200 text-secondary text-xs hover:border-brand/30 hover:text-brand transition-all">
            录入
          </button>
        )}
        {showOutcomeForm && (
          <div className="flex items-center gap-1">
            <input value={outcomeMetric} onChange={function(e) { setOutcomeMetric(e.target.value); }} placeholder="指标" className="w-16 px-1.5 py-1 rounded text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand" />
            <input type="number" value={beforeValue} onChange={function(e) { setBeforeValue(e.target.value); }} placeholder="前" className="w-14 px-1.5 py-1 rounded text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand" />
            <input type="number" value={afterValue} onChange={function(e) { setAfterValue(e.target.value); }} placeholder="后" className="w-14 px-1.5 py-1 rounded text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand" />
            <button onClick={handleSaveOutcome} disabled={running} className="px-2 py-1 rounded-md bg-emerald-500 text-white text-xs hover:bg-emerald-600 disabled:opacity-50">保存</button>
            <button onClick={() => { setShowOutcomeForm(false); setOutcomeResult(null); }} className="px-2 py-1 rounded-md border border-gray-200 text-secondary text-xs hover:text-primary">取消</button>
          </div>
        )}
        {outcomeResult && <span className="text-xs text-red-500/70">{outcomeResult}</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function LoopReviewBoard({ datasetId, loopData, loading, error, onRefresh }: LoopReviewBoardProps) {
  const { user } = useAuth();
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<TabType>("all");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  var loadingRef = useRef(false);

  var rows: DecisionRow[] = useMemo(function() {
    if (!loopData || !loopData.decisions) return [];
    return loopData.decisions.map(function(dd: any) {
      return {
        decision: dd.decision,
        actionTasks: dd.actionTasks || [],
        executions: dd.executions || {},
        outcomes: dd.outcomes || {},
      };
    });
  }, [loopData]);

  var onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(function() {
    void onRefreshRef.current();
  }, [datasetId]);

  async function handleDecisionStatusChange(decisionId: string, status: Decision["status"]) {
    setUpdating(function(prev) { var next = Object.assign({}, prev); next[decisionId] = true; return next; });
    try {
      await updateDecisionStatus({ decisionId, status });
      await onRefresh();
    } catch (e) {
      console.error("更新决策状态失败:", e);
    } finally {
      setUpdating(function(prev) { var next = Object.assign({}, prev); next[decisionId] = false; return next; });
    }
  }

  async function handleTaskStatusChange(taskId: string, status: ActionTask["status"]) {
    try {
      await updateActionTaskStatus({ taskId, status });
      await onRefresh();
    } catch (e) {
      console.error("更新任务状态失败:", e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Aggregates
  // ═══════════════════════════════════════════════════════════════════════════════

  var aggregates = useMemo(function() {
    var totalDecisions = rows.length;
    var totalActionTasks = 0;
    var executedTasks = 0;
    var completedTasks = 0;
    var failedTasks = 0;
    var totalOutcomes = 0;
    var verifiedProfitImpact = 0;
    var expectedProfitImpact = 0;
    var outcomesWithPositiveImprovement = 0;
    var approvedDecisions = 0;

    for (const row of rows) {
      if (row.decision.status === "approved" || row.decision.status === "completed") approvedDecisions++;
      totalActionTasks += row.actionTasks.length;
      expectedProfitImpact += (row.decision.expectedProfitImpact || 0);
      for (const t of row.actionTasks) {
        const exes = row.executions[t.id] || [];
        if (exes.length > 0) executedTasks++;
        if (exes.some(function(e: Execution) { return e.status === "completed"; })) completedTasks++;
        if (exes.some(function(e: Execution) { return e.status === "failed"; })) failedTasks++;
        const outs = row.outcomes[t.id] || [];
        totalOutcomes += outs.length;
        for (const o of outs) {
          verifiedProfitImpact += o.improvement;
          if (o.improvement > 0) outcomesWithPositiveImprovement++;
        }
      }
    }

    var approvalRate = totalDecisions > 0 ? Math.round((approvedDecisions / totalDecisions) * 100) : 0;
    var executionRate = totalActionTasks > 0 ? Math.round((executedTasks / totalActionTasks) * 100) : 0;
    var completionRate = totalActionTasks > 0 ? Math.round((completedTasks / totalActionTasks) * 100) : 0;
    var positiveRate = totalOutcomes > 0 ? Math.round((outcomesWithPositiveImprovement / totalOutcomes) * 100) : 0;
    var profitDelta = verifiedProfitImpact - expectedProfitImpact;
    var profitDeltaPercent = expectedProfitImpact !== 0 ? Math.round((profitDelta / Math.abs(expectedProfitImpact)) * 100) : 0;

    return {
      totalDecisions, totalActionTasks, executedTasks, completedTasks, failedTasks,
      totalOutcomes, verifiedProfitImpact, expectedProfitImpact, outcomesWithPositiveImprovement,
      approvedDecisions, approvalRate, executionRate, completionRate, positiveRate, profitDelta, profitDeltaPercent
    };
  }, [rows]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Filtered + sorted rows
  // ═══════════════════════════════════════════════════════════════════════════════

  var visibleRows = useMemo(function() {
    var filtered = rows;

    // Tab filter
    if (tab === "pending") {
      filtered = rows.filter(function(r: DecisionRow) { return r.decision.status === "pending"; });
    } else if (tab === "executing") {
      filtered = rows.filter(function(r: DecisionRow) {
        return r.actionTasks.some(function(t: ActionTask) {
          var exes = r.executions[t.id] || [];
          return exes.some(function(e: Execution) { return e.status === "running"; });
        });
      });
    } else if (tab === "verified") {
      filtered = rows.filter(function(r: DecisionRow) {
        return r.actionTasks.some(function(t: ActionTask) {
          var outs = r.outcomes[t.id] || [];
          return outs.length > 0;
        });
      });
    }

    // Verdict filter
    if (filter !== "all") {
      filtered = filtered.filter(function(r: DecisionRow) { return r.decision.verdict === filter; });
    }

    // Sort
    var sorted = filtered.slice();
    sorted.sort(function(a: DecisionRow, b: DecisionRow) {
      if (sortBy === "newest") return new Date(b.decision.createdAt).getTime() - new Date(a.decision.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.decision.createdAt).getTime() - new Date(b.decision.createdAt).getTime();
      if (sortBy === "profit_desc") return (b.decision.expectedProfitImpact || 0) - (a.decision.expectedProfitImpact || 0);
      if (sortBy === "profit_asc") return (a.decision.expectedProfitImpact || 0) - (b.decision.expectedProfitImpact || 0);
      return 0;
    });

    return sorted;
  }, [rows, tab, filter, sortBy]);

  var pendingCount = rows.filter(function(r: DecisionRow) { return r.decision.status === "pending"; }).length;
  var executingCount = rows.filter(function(r: DecisionRow) {
    return r.actionTasks.some(function(t: ActionTask) {
      var exes = r.executions[t.id] || [];
      return exes.some(function(e: Execution) { return e.status === "running"; });
    });
  }).length;
  var verifiedCount = rows.filter(function(r: DecisionRow) {
    return r.actionTasks.some(function(t: ActionTask) { return (r.outcomes[t.id] || []).length > 0; });
  }).length;

  // ═══════════════════════════════════════════════════════════════════════════════
  // Empty state
  // ═══════════════════════════════════════════════════════════════════════════════

  if (rows.length === 0 && !loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            <h2 className="text-heading">执行复盘看板</h2>
          </div>
          <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 text-caption text-faint hover:text-primary transition-colors duration-200 disabled:opacity-50">
            <RefreshCcw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} /> 刷新
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // Comparison (real data from outcomes)
  // ═══════════════════════════════════════════════════════════════════════════════

  var comparison = useMemo(function() {
    if (rows.length === 0) return null;
    var totalExpected = 0;
    var totalVerified = 0;
    var totalBefore = 0;
    var totalAfter = 0;
    var outcomeCount = 0;
    for (const row of rows) {
      totalExpected += row.decision.expectedProfitImpact || 0;
      for (const t of row.actionTasks) {
        var outs = row.outcomes[t.id] || [];
        for (const o of outs) {
          totalVerified += o.improvement;
          totalBefore += o.beforeValue;
          totalAfter += o.afterValue;
          outcomeCount++;
        }
      }
    }
    var profitDelta = totalVerified - totalExpected;
    var profitDeltaPercent = totalExpected !== 0 ? Math.round((profitDelta / Math.abs(totalExpected)) * 100) : 0;
    var overallImprovement = totalBefore !== 0 ? Math.round(((totalAfter - totalBefore) / Math.abs(totalBefore)) * 100) : 0;
    return {
      totalExpected, totalVerified, profitDelta, profitDeltaPercent, overallImprovement, outcomeCount,
      hasImprovement: profitDelta > 0 || (totalBefore > 0 && totalAfter > totalBefore)
    };
  }, [rows]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand" />
          <h2 className="text-heading">执行复盘看板</h2>
          <span className="text-caption text-faint">{aggregates.totalDecisions} 次决策 · {aggregates.totalActionTasks} 个行动</span>
        </div>
        <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 text-caption text-faint hover:text-primary transition-colors duration-200 disabled:opacity-50">
          <RefreshCcw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} /> 刷新
        </button>
      </div>

      {error && (
        <div className="text-body text-red-500 bg-red-50 rounded-lg px-4 py-2 border border-red-100">{error instanceof Error ? error.message : String(error)}</div>
      )}

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="决策批准率" value={aggregates.approvalRate + "%"} subtitle={aggregates.approvedDecisions + "/" + aggregates.totalDecisions + " 已批准"} icon={<CheckCircle2 className="w-4 h-4" />}
          trend={aggregates.approvalRate >= 70 ? "up" : "neutral"} trendValue={aggregates.approvalRate >= 70 ? "健康" : "待提升"} colorClass={aggregates.approvalRate >= 70 ? "text-emerald-500" : "text-amber-500"} />
        <KpiCard title="任务执行率" value={aggregates.executionRate + "%"} subtitle={aggregates.executedTasks + "/" + aggregates.totalActionTasks + " 已执行"} icon={<Activity className="w-4 h-4" />}
          trend={aggregates.executionRate >= 70 ? "up" : "neutral"} trendValue={aggregates.executionRate >= 70 ? "推进良好" : "需跟进"} colorClass={aggregates.executionRate >= 70 ? "text-emerald-500" : "text-amber-500"} />
        <KpiCard title="验证通过率" value={aggregates.positiveRate + "%"} subtitle={aggregates.outcomesWithPositiveImprovement + "/" + aggregates.totalOutcomes + " 条正向结果"} icon={<Award className="w-4 h-4" />}
          trend={aggregates.positiveRate >= 60 ? "up" : "neutral"} trendValue={aggregates.positiveRate >= 60 ? "验证有效" : "待观察"} colorClass={aggregates.positiveRate >= 60 ? "text-emerald-500" : "text-amber-500"} />
        <KpiCard title="验证收益" value={formatMoney(aggregates.verifiedProfitImpact)} subtitle={"预期 " + formatMoney(aggregates.expectedProfitImpact)} icon={<Target className="w-4 h-4" />}
          trend={aggregates.profitDelta > 0 ? "up" : aggregates.profitDelta < 0 ? "down" : "neutral"}
          trendValue={aggregates.profitDelta > 0 ? "+" + formatMoney(aggregates.profitDelta) + " 超预期" : aggregates.profitDelta < 0 ? formatMoney(aggregates.profitDelta) + " 未达预期" : "持平"}
          colorClass={aggregates.verifiedProfitImpact >= 0 ? "text-emerald-500" : "text-red-500"} />
      </div>

      {/* ═══ REAL COMPARISON ═══ */}
      {comparison && comparison.outcomeCount > 0 && (
        <GlassCard className="p-5 rounded-xl" hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-box bg-blue-100"><RefreshCcw className="w-4 h-4 text-brand" /></div>
            <h3 className="text-heading">效果验证总览</h3>
            <span className={"text-caption px-2.5 py-1 rounded-full " + (comparison.hasImprovement ? "badge-success" : "badge-warning")}>
              {comparison.hasImprovement ? "正向改善" : "待观察"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-gray-200 bg-white">
              <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">预期收益</div>
              <div className="text-sm font-medium text-brand">{formatMoney(comparison.totalExpected)}</div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 bg-white">
              <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">验证收益</div>
              <div className={"text-sm font-medium " + (comparison.totalVerified >= 0 ? "text-emerald-500" : "text-red-500")}>
                {comparison.totalVerified >= 0 ? "+" : ""}{formatMoney(comparison.totalVerified)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 bg-white">
              <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">收益偏差</div>
              <div className={"text-sm font-medium " + (comparison.profitDelta > 0 ? "text-emerald-500" : comparison.profitDelta < 0 ? "text-red-500" : "text-faint")}>
                {comparison.profitDelta > 0 ? "+" : ""}{formatMoney(comparison.profitDelta)}
                <span className="text-xs ml-1">({comparison.profitDelta > 0 ? "+" : ""}{comparison.profitDeltaPercent}%)</span>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 bg-white">
              <div className="text-caption text-faint mb-1.5 uppercase tracking-wider">整体改善</div>
              <div className={"text-sm font-medium " + (comparison.overallImprovement > 0 ? "text-emerald-500" : comparison.overallImprovement < 0 ? "text-red-500" : "text-faint")}>
                {comparison.overallImprovement > 0 ? "+" : ""}{comparison.overallImprovement}%
              </div>
              <div className="text-caption text-faint mt-1">基于 {comparison.outcomeCount} 条验证数据</div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ═══ TABS + FILTERS ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
          <TabButton active={tab === "all"} onClick={() => setTab("all")} count={rows.length}>全部复盘</TabButton>
          <TabButton active={tab === "pending"} onClick={() => setTab("pending")} count={pendingCount}>待办</TabButton>
          <TabButton active={tab === "executing"} onClick={() => setTab("executing")} count={executingCount}>执行中</TabButton>
          <TabButton active={tab === "verified"} onClick={() => setTab("verified")} count={verifiedCount}>已验证</TabButton>
        </div>
        <FilterBar filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />
      </div>

      {/* ═══ DECISION TIMELINE ═══ */}
      <div className="space-y-4">
        {visibleRows.length === 0 ? (
          <div className="p-8 rounded-2xl border border-gray-100 text-center card">
            <div className="icon-box bg-gray-50 mx-auto mb-3"><Filter className="w-5 h-5 text-faint" /></div>
            <p className="text-body text-secondary">当前筛选条件下无数据</p>
            <p className="text-caption mt-2">尝试切换 Tab 或调整筛选条件</p>
          </div>
        ) : visibleRows.map(function(row) {
          const d = row.decision;
          const taskStats = row.actionTasks.map(function(t) {
            const exes = row.executions[t.id] || [];
            const outs = row.outcomes[t.id] || [];
            const latestExe = exes[0] || null;
            const latestOut = outs[0] || null;
            var allOutcomes = outs;
            return { task: t, latestExe, latestOut, allOutcomes, executionCount: exes.length };
          });

          var pendingTasks = taskStats.filter(function(s) { return s.task.status === "pending" && !s.latestExe; }).length;
          var runningTasks = taskStats.filter(function(s) { return s.latestExe && s.latestExe.status === "running"; }).length;
          var completedTasks = taskStats.filter(function(s) { return s.latestExe && s.latestExe.status === "completed"; }).length;
          var verifiedTasks = taskStats.filter(function(s) { return s.allOutcomes.length > 0; }).length;

          return (
            <GlassCard key={d.id} className="p-5 rounded-xl" hover={false}>
              {/* Decision Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={"text-sm font-semibold " + (VERDICT_COLOR[d.verdict] || "text-brand")}>
                      {VERDICT_LABEL[d.verdict] || d.verdict}
                    </span>
                    <span className="text-caption px-1.5 py-0.5 rounded bg-gray-50 text-faint border border-gray-200">
                      {d.riskLevel === "high" ? "高风险" : d.riskLevel === "medium" ? "中风险" : "低风险"}
                    </span>
                    <span className="text-caption text-faint">{formatDate(d.createdAt)}</span>
                  </div>
                  <p className="text-body text-sm leading-relaxed line-clamp-2">{d.summary}</p>
                  {d.productNames.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {d.productNames.map(function(p) {
                        return (
                          <span key={p} className="text-caption px-1.5 py-0.5 rounded bg-gray-50 text-faint border border-gray-100">{p}</span>
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

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-faint mb-1">
                  <span>执行进度</span>
                  <span>{completedTasks}/{row.actionTasks.length} 已完成 · {verifiedTasks} 已验证</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: (row.actionTasks.length > 0 ? (completedTasks / row.actionTasks.length) * 100 : 0) + "%" }} />
                </div>
              </div>

              {/* Decision status actions */}
              {d.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  <span className="text-caption text-faint mr-1">决策:</span>
                  <button onClick={() => handleDecisionStatusChange(d.id, "approved")} disabled={!!updating[d.id]} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                    <CheckCircle2 className="w-3 h-3" /> 批准
                  </button>
                  <button onClick={() => handleDecisionStatusChange(d.id, "rejected")} disabled={!!updating[d.id]} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                    <XCircle className="w-3 h-3" /> 驳回
                  </button>
                  <button onClick={() => handleDecisionStatusChange(d.id, "completed")} disabled={!!updating[d.id]} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-brand text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50">
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

              {/* Action Tasks */}
              {taskStats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <div className="text-xs text-faint uppercase tracking-wider font-medium mb-2">行动任务 ({row.actionTasks.length})</div>
                  {taskStats.map(function(item) {
                    return (
                      <InlineTaskItem
                        key={item.task.id}
                        task={item.task}
                        executions={item.allOutcomes.length > 0 ? (row.executions[item.task.id] || []) : []}
                        outcomes={item.allOutcomes}
                        onRefresh={onRefresh}
                      />
                    );
                  })}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}
