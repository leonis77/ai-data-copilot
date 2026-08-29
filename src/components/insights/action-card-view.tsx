"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, Shield, Zap, Target, Play, Loader2, CheckCircle2, XCircle, Plus, TrendingUp } from "lucide-react";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import type { Execution, Outcome } from "@/lib/loop/types";
import { startExecution, completeExecution, saveOutcome } from "@/lib/loop/client";
import { useDataContext } from "@/contexts/data-context";
import type { DataContextValue } from "@/contexts/data-context";

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
  P0: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", label: "立即处理", icon: <Zap className="w-3 h-3" /> },
  P1: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "本周处理", icon: <AlertTriangle className="w-3 h-3" /> },
  P2: { bg: "bg-gray-50", text: "text-faint", border: "border-gray-200", label: "计划中", icon: <Target className="w-3 h-3" /> },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high:   { color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "高风险" },
  medium: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "中风险" },
  low:    { color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", label: "低风险" },
};

interface ActionCardViewProps {
  action: PrioritizedAction;
  index?: number;
  executions?: Execution[];
  outcomes?: Outcome[];
}

function latestByTimestamp<T>(items: T[], getTimestamp: (item: T) => string): T | null {
  if (items.length === 0) return null;
  return items.reduce(function (latest, item) {
    return Date.parse(getTimestamp(item) || "") > Date.parse(getTimestamp(latest) || "") ? item : latest;
  });
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

function findExecutionsForTask(rows: DataContextValue["state"]["loop"]["rows"], actionTaskId: string): Execution[] {
  if (!actionTaskId) return [];
  for (var i = 0; i < rows.length; i++) {
    var exes = rows[i].executions[actionTaskId];
    if (exes && exes.length > 0) return exes;
  }
  return [];
}

function findOutcomesForTask(rows: DataContextValue["state"]["loop"]["rows"], actionTaskId: string): Outcome[] {
  if (!actionTaskId) return [];
  for (var i = 0; i < rows.length; i++) {
    var outs = rows[i].outcomes[actionTaskId];
    if (outs && outs.length > 0) return outs;
  }
  return [];
}

export function ActionCardView({ action, index = 0, executions: propExecutions, outcomes: propOutcomes }: ActionCardViewProps) {
  // Try context first (when wrapped in DataProvider), fall back to props
  var contextRows: DataContextValue["state"]["loop"]["rows"] = [];
  var useDispatch: React.Dispatch<any> = function() {};
  try {
    var ctx = useDataContext();
    contextRows = ctx.state.loop.rows;
    useDispatch = ctx.dispatch;
  } catch (e) {
    // Not in DataProvider — will use props
  }

  // Get executions/outcomes from context or props
  var executions = contextRows.length > 0
    ? findExecutionsForTask(contextRows, action.actionTaskId || "")
    : (propExecutions || []);
  var outcomes = contextRows.length > 0
    ? findOutcomesForTask(contextRows, action.actionTaskId || "")
    : (propOutcomes || []);

  const p = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.P2;
  const r = RISK_CONFIG[action.riskLevel] || RISK_CONFIG.medium;

  var _s0 = useState<string | null>(null), apiError = _s0[0], setApiError = _s0[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];

  // Derive execution state from DB data — this is the single source of truth
  var latestExecution = latestByTimestamp(executions, function (execution) { return execution.createdAt; });
  var latestOutcome = latestByTimestamp(outcomes, function (outcome) { return outcome.verifiedAt; });
  var hasExecution = !!latestExecution;
  var isRunning = latestExecution?.status === "running";
  var isCompleted = latestExecution?.status === "completed";
  var isTerminal = isCompleted || latestExecution?.status === "failed" || latestExecution?.status === "cancelled";
  var hasOutcome = !!latestOutcome;

  // Improvement from outcome
  var improvement = latestOutcome ? latestOutcome.improvement : 0;
  var improvementPercent = latestOutcome ? latestOutcome.improvementPercent : 0;
  var isPositive = improvement > 0;
  var isNegative = improvement < 0;

  // Outcome form state
  var _s1 = useState("月利润"), outcomeMetric = _s1[0], setOutcomeMetric = _s1[1];
  var _s2 = useState(""), beforeValue = _s2[0], setBeforeValue = _s2[1];
  var _s3 = useState(""), afterValue = _s3[0], setAfterValue = _s3[1];
  var _s4 = useState<string | null>(null), outcomeError = _s4[0], setOutcomeError = _s4[1];
  var _s5 = useState(false), showOutcomeForm = _s5[0], setShowOutcomeForm = _s5[1];

  // Pending execution (optimistic UI): when user clicks "开始执行",
  // we immediately show the running state before the DB round-trip completes.
  var _s6 = useState<{ execId: string; taskId: string } | null>(null), pendingExecution = _s6[0], setPendingExecution = _s6[1];

  // Clear the optimistic marker once the server response contains the execution.
  useEffect(function () {
    var pendingId = pendingExecution?.execId;
    if (pendingId && executions.some(function (execution) { return execution.id === pendingId; })) {
      setPendingExecution(null);
    }
  }, [executions, pendingExecution]);

  // Effective execution state: prefer pending (local) over DB only during the round trip.
  var effectiveExecution = pendingExecution || latestExecution;
  var effectiveHasExecution = !!effectiveExecution;
  var effectiveIsRunning = pendingExecution ? true : isRunning;
  var effectiveIsCompleted = pendingExecution ? false : isCompleted;
  var effectiveHasOutcome = pendingExecution ? false : hasOutcome;

  async function handleStartExecution() {
    if (!action.actionTaskId) {
      setApiError("该行动建议尚未生成执行任务，请先在下方执行复盘看板中批准决策后重试。");
      return;
    }
    try {
      setApiError(null);
      setBusy(true);
      var execId = "exec_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      setPendingExecution({ execId: execId, taskId: action.actionTaskId });
      var started = await startExecution({
        id: execId,
        actionTaskId: action.actionTaskId,
        executedBy: "user",
      });
      if (!started.ok) throw new Error("开始执行未成功");
      // Dispatch optimistic update to context
      useDispatch({
        type: "UPDATE_EXECUTION",
        payload: {
          actionTaskId: action.actionTaskId,
          execution: {
            id: execId,
            actionTaskId: action.actionTaskId,
            status: "running",
            result: "执行中",
            executedBy: "user",
            executedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            completedAt: null,
          } as Execution,
        },
      });
      setPendingExecution(null);
    } catch (e) {
      setPendingExecution(null);
      var msg = e instanceof Error ? e.message : "执行失败";
      setApiError(msg);
      console.error("startExecution failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteExecution() {
    var executionId = pendingExecution?.execId || latestExecution?.id;
    if (!executionId) {
      setApiError("执行记录尚未同步，请刷新后重试。");
      return;
    }
    try {
      setApiError(null);
      setBusy(true);
      var completed = await completeExecution({
        executionId,
        status: "completed",
        result: "已完成",
      });
      if (!completed.ok) throw new Error("完成执行未成功");
      // Dispatch update to context
      if (action.actionTaskId && latestExecution) {
        useDispatch({
          type: "UPDATE_EXECUTION",
          payload: {
            actionTaskId: action.actionTaskId,
            execution: {
              ...latestExecution,
              status: "completed",
              result: "已完成",
              completedAt: new Date().toISOString(),
            } as Execution,
          },
        });
      }
      setPendingExecution(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "完成执行失败");
      console.error("completeExecution failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveOutcome() {
    if (!latestExecution) return;
    var before = Number(beforeValue);
    var after = Number(afterValue);
    if (isNaN(before) || isNaN(after)) {
      setOutcomeError("请输入有效的数字");
      return;
    }
    try {
      setOutcomeError(null);
      setBusy(true);
      var improvementCalc = after - before;
      var improvementPct = before !== 0 ? (improvementCalc / Math.abs(before)) * 100 : 0;
      var saved = await saveOutcome({
        id: "outcome_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        executionId: latestExecution.id,
        metric: outcomeMetric,
        beforeValue: before,
        afterValue: after,
      });
      if (!saved.ok) throw new Error("保存结果未成功");
      // Dispatch outcome to context
      if (action.actionTaskId) {
        useDispatch({
          type: "UPDATE_OUTCOME",
          payload: {
            actionTaskId: action.actionTaskId,
            outcome: {
              id: saved.outcomeId || "outcome_" + Date.now().toString(36),
              executionId: latestExecution.id,
              metric: outcomeMetric,
              beforeValue: before,
              afterValue: after,
              improvement: improvementCalc,
              improvementPercent: improvementPct,
              verifiedAt: new Date().toISOString(),
            } as Outcome,
          },
        });
      }
      setShowOutcomeForm(false);
      setBeforeValue("");
      setAfterValue("");
    } catch (e) {
      setOutcomeError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  var actionTitle = action.title || action.action;
  var actionDesc = action.description || action.reason || "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      className={"relative rounded-xl border p-4 card-lift " + p.border + " card"}
    >
      {/* Priority + Confidence row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={"inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg font-medium border " + p.bg + " " + p.text + " " + p.border}>
          {p.icon}
          {action.priority} · {p.label}
        </span>
        <span className="text-caption text-tertiary px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
          置信度: {action.confidence === "high" ? "高" : action.confidence === "medium" ? "中" : "低"}
        </span>
        <span className={"ml-auto inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg border " + r.bg + " " + r.color + " " + r.border}>
          <Shield className="w-3 h-3" />
          {r.label}
        </span>
      </div>

      {/* Action description */}
      <div className="flex items-start gap-3 mb-3">
        <div className="icon-box bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-100">
          <ArrowRight className="w-4 h-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-primary leading-snug">{actionTitle}</h4>
          {actionDesc && <p className="text-body mt-1">{actionDesc}</p>}
        </div>
      </div>

      {/* Impact + Risk details */}
      <div className="flex items-center gap-3 ml-11 mb-3 flex-wrap">
        {action.expectedProfitImpact !== undefined && action.expectedProfitImpact !== 0 && (
          <div className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border " + (action.expectedProfitImpact >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200")}>
            <span>预期收益</span>
            <span className="font-bold">
              {action.expectedProfitImpact >= 0 ? "+" : "−"}¥{Math.round(Math.abs(action.expectedProfitImpact)).toLocaleString()}
            </span>
          </div>
        )}
        {action.expected_impact && (
          <span className="text-caption text-tertiary px-2 py-1 rounded-lg bg-gray-50">{action.expected_impact}</span>
        )}
      </div>

      {/* ═══ 执行控制区：闭环操作按钮 ═══ */}
      <div className="ml-11 pt-3 border-t border-gray-100">
        {/* Step 1: 开始执行 */}
        {!effectiveHasExecution && !action.actionTaskId ? (
          <button
            disabled
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
            title="请先在下方执行复盘看板中批准决策，生成执行任务">
            <Play className="w-3.5 h-3.5" />
            等待任务生成
          </button>
        ) : !effectiveHasExecution ? (
          <button
            onClick={handleStartExecution}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:shadow-sm disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)", color: "#fff" }}>
            <Play className="w-3.5 h-3.5" />
            开始执行
          </button>
        ) : null}

        {/* Step 2: 执行中 → 完成执行 */}
        {effectiveIsRunning && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              执行中...
            </span>
            <button
              onClick={handleCompleteExecution}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              完成执行
            </button>
          </div>
        )}

        {/* Step 3: 已完成 → 录入结果 */}
        {effectiveIsCompleted && !effectiveHasOutcome && !showOutcomeForm && (
          <button
            onClick={function() { setShowOutcomeForm(true); setOutcomeError(null); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-secondary hover:text-primary hover:border-brand/30 hover:bg-blue-50 transition-all duration-200">
            <Plus className="w-3.5 h-3.5" />
            录入结果
          </button>
        )}

        {/* 录入结果表单 */}
        {showOutcomeForm && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={outcomeMetric}
              onChange={function(e) { setOutcomeMetric(e.target.value); }}
              placeholder="指标名称"
              className="flex-1 min-w-[80px] px-2.5 py-2 rounded-lg text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
            <input
              type="number"
              value={beforeValue}
              onChange={function(e) { setBeforeValue(e.target.value); }}
              placeholder="执行前"
              className="w-[72px] px-2 py-2 rounded-lg text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
            <input
              type="number"
              value={afterValue}
              onChange={function(e) { setAfterValue(e.target.value); }}
              placeholder="执行后"
              className="w-[72px] px-2 py-2 rounded-lg text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
            <button
              onClick={handleSaveOutcome}
              disabled={busy}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
              保存
            </button>
            <button
              onClick={function() { setShowOutcomeForm(false); setOutcomeError(null); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-secondary text-xs hover:text-primary hover:border-brand/30 transition-all">
              取消
            </button>
            {outcomeError && <span className="text-xs text-red-500/80">{outcomeError}</span>}
          </div>
        )}

        {/* 已完成 + 有结果 → 展示改善数据 */}
        {effectiveHasOutcome && latestOutcome && (
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="text-secondary font-medium">{latestOutcome.metric}</span>
            <span className="text-tertiary">基线: {formatMoney(latestOutcome.beforeValue)}</span>
            <span className="text-tertiary">→ 实际: {formatMoney(latestOutcome.afterValue)}</span>
            <span className={"inline-flex items-center gap-1 font-semibold " + (isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-faint")}>
              <TrendingUp className="w-3 h-3" />
              {isPositive ? "+" : ""}{improvementPercent.toFixed(1)}%
            </span>
          </div>
        )}

        {/* 失败/取消状态 */}
        {latestExecution && isTerminal && !isCompleted && (
          <span className={"inline-flex items-center gap-1 text-xs " + (latestExecution.status === "failed" ? "text-red-500" : "text-faint")}>
            {latestExecution.status === "failed" ? <XCircle className="w-3.5 h-3.5" /> : null}
            {latestExecution.status === "failed" ? "执行失败" : "已取消"}
          </span>
        )}
        {/* API 错误提示 */}
        {apiError && (
          <div className="mt-2 text-xs text-red-500/80 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {apiError}
          </div>
        )}
      </div>

      {/* References footer */}
      <div className="flex items-center gap-3 flex-wrap ml-11 pt-2.5 mt-2 border-t border-gray-100">
        {action.evidenceRefs && action.evidenceRefs.length > 0 && (
          <span className="text-caption text-faint">
            证据卡: {action.evidenceRefs.map(function(r) { return "#" + r; }).join(", ")}
          </span>
        )}
        {action.ruleIds && action.ruleIds.length > 0 && (
          <div className="flex items-center gap-1">
            {action.ruleIds.map(function(rid, ri) {
              return (
                <span key={ri} className="text-caption px-1.5 py-0.5 rounded-md bg-blue-50 text-brand font-mono border border-blue-200">
                  {rid}
                </span>
              );
            })}
          </div>
        )}
        {action.risk && (
          <span className="text-caption text-faint">{action.risk}</span>
        )}
      </div>
    </motion.div>
  );
}
