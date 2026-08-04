"use client";

import { useState } from "react";
import { Play, CheckCircle2, XCircle, TrendingUp, Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { ActionTask, Execution, Outcome } from "@/lib/loop/types";
import { startExecution, completeExecution, saveOutcome } from "@/lib/loop/client";

interface ExecutionTrackerProps {
  actionTaskId: string;
  title: string;
  description?: string;
  priority?: string;
  riskLevel?: string;
  expectedProfitImpact?: number;
  executions: Execution[];
  outcomes: Outcome[];
  onRefresh: () => void;
  compact?: boolean;
}

function formatMoney(n: number): string {
  if (n >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待执行",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
  running: "执行中",
  failed: "失败",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-faint",
  in_progress: "text-amber-500",
  completed: "text-emerald-500",
  cancelled: "text-faint",
  running: "text-amber-500",
  failed: "text-red-500",
};

export default function ExecutionTracker(props: ExecutionTrackerProps) {
  const {
    actionTaskId,
    title,
    description = "",
    priority = "P1",
    riskLevel = "medium",
    expectedProfitImpact = 0,
    executions,
    outcomes,
    onRefresh,
    compact = false,
  } = props;

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
        actionTaskId,
        executedBy: "user",
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      setOutcomeResult(e instanceof Error ? e.message : "执行失败");
    } finally { setRunning(false); }
  }

  async function handleComplete() {
    if (!latestExecution) return;
    try {
      setRunning(true);
      setOutcomeResult(null);
      await completeExecution({
        executionId: latestExecution.id,
        status: "completed",
        result: "已完成",
      });
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

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-tertiary">
        <span className={"inline-flex items-center gap-1 " + (latestExecution ? STATUS_COLOR[latestExecution.status] || "text-faint" : "text-faint")}>
          {latestExecution ? STATUS_LABEL[latestExecution.status] || latestExecution.status : "未执行"}
        </span>
        {latestOutcome && (
          <span className={"inline-flex items-center gap-1 " + (isPositive ? "text-emerald-500/70" : isNegative ? "text-red-500/70" : "text-faint")}>
            {outcomeMetric} {isPositive ? "+" : ""}{improvementPercent.toFixed(1)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <GlassCard className="p-4 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-tertiary border border-gray-200">{priority}</span>
            <span className={"text-xs px-1.5 py-0.5 rounded border " + (riskLevel === "high" ? "bg-red-50 text-red-500 border-red-200" : riskLevel === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-500 border-emerald-200")}>
              {riskLevel === "high" ? "高风险" : riskLevel === "medium" ? "中风险" : "低风险"}
            </span>
            {latestExecution && (
              <span className={"text-xs px-1.5 py-0.5 rounded " + (STATUS_COLOR[latestExecution.status] || "text-faint")}>
                {STATUS_LABEL[latestExecution.status] || latestExecution.status}
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-primary mb-1">{title}</h4>
          {description && <p className="text-xs text-tertiary leading-relaxed">{description}</p>}
          {expectedProfitImpact > 0 && (
            <p className="text-xs text-emerald-500/70 mt-1.5">预期收益: {formatMoney(expectedProfitImpact)}</p>
          )}
        </div>
      </div>

      {latestExecution && (
        <div className="space-y-1.5">
          <div className="text-xs text-faint uppercase tracking-wider font-medium">执行记录</div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {latestExecution.status === "running" && <span className="text-amber-500 flex items-center gap-1"><Play className="w-3 h-3" /> 执行中...</span>}
            {latestExecution.status === "completed" && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 已完成</span>}
            {latestExecution.status === "failed" && <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> 失败</span>}
            {latestExecution.status === "cancelled" && <span className="text-faint flex items-center gap-1"><XCircle className="w-3 h-3" /> 已取消</span>}
            {latestExecution.executedBy && <span className="text-faint">by {latestExecution.executedBy}</span>}
            {latestExecution.executedAt && <span className="text-faint">{new Date(latestExecution.executedAt).toLocaleString()}</span>}
          </div>
          {latestExecution.result && <p className="text-xs text-secondary bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{latestExecution.result}</p>}
        </div>
      )}

      {latestOutcome && (
        <div className="space-y-1.5">
          <div className="text-xs text-faint uppercase tracking-wider font-medium">结果验证</div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-secondary">{latestOutcome.metric}</span>
            <span className="text-tertiary">基线: {formatMoney(latestOutcome.beforeValue)}</span>
            <span className="text-tertiary">→ 实际: {formatMoney(latestOutcome.afterValue)}</span>
            <span className={"flex items-center gap-1 " + (isPositive ? "text-emerald-500/70" : isNegative ? "text-red-500/70" : "text-faint")}>
              <TrendingUp className="w-3 h-3" />
              {isPositive ? "+" : ""}{improvementPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
        {latestExecution && latestExecution.status === "completed" ? null : (
          <button
            onClick={handleStart}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs hover:bg-brand-dark transition-colors disabled:opacity-50">
            <Play className="w-3 h-3" />
            开始执行
          </button>
        )}
        {latestExecution && latestExecution.status === "running" ? (
          <button
            onClick={handleComplete}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600 transition-colors disabled:opacity-50">
            <CheckCircle2 className="w-3 h-3" />
            完成执行
          </button>
        ) : null}

        {latestExecution && latestExecution.status === "completed" && !showOutcomeForm && !latestOutcome && (
          <button
            onClick={function() { setShowOutcomeForm(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-secondary hover:text-primary hover:border-brand/30 hover:bg-blue-50 text-xs transition-all duration-200">
            <Plus className="w-3 h-3" />
            录入结果
          </button>
        )}

        {showOutcomeForm && (
          <>
            <input
              value={outcomeMetric}
              onChange={function(e) { setOutcomeMetric(e.target.value); }}
              placeholder="指标名称"
              className="flex-1 min-w-[80px] px-2 py-2 rounded-lg text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
            <input
              type="number"
              value={beforeValue}
              onChange={function(e) { setBeforeValue(e.target.value); }}
              placeholder="执行前"
              className="w-20 px-2 py-2 rounded-lg text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
            <input
              type="number"
              value={afterValue}
              onChange={function(e) { setAfterValue(e.target.value); }}
              placeholder="执行后"
              className="w-20 px-2 py-2 rounded-lg text-xs border border-gray-200 bg-white text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
            <button
              onClick={handleSaveOutcome}
              disabled={running}
              className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600 transition-colors disabled:opacity-50">
              保存
            </button>
            <button
              onClick={function() { setShowOutcomeForm(false); setOutcomeResult(null); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-secondary hover:text-primary hover:border-brand/30 text-xs transition-all duration-200">
              取消
            </button>
          </>
        )}

        {outcomeResult && <span className="text-xs text-red-500/70">{outcomeResult}</span>}
      </div>
    </GlassCard>
  );
}
