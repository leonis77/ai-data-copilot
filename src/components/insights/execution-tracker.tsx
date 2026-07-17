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
  pending: "text-white/40",
  in_progress: "text-amber-400",
  completed: "text-green-400",
  cancelled: "text-white/20",
  running: "text-amber-400",
  failed: "text-red-400",
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
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span className={"inline-flex items-center gap-1 " + (latestExecution ? STATUS_COLOR[latestExecution.status] || "text-white/40" : "text-white/30")}>
          {latestExecution ? STATUS_LABEL[latestExecution.status] || latestExecution.status : "未执行"}
        </span>
        {latestOutcome && (
          <span className={"inline-flex items-center gap-1 " + (isPositive ? "text-green-400/70" : isNegative ? "text-red-400/70" : "text-white/40")}>
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.04] text-white/50">{priority}</span>
            <span className={"text-[10px] px-1.5 py-0.5 rounded " + (riskLevel === "high" ? "bg-red-500/10 text-red-400/70" : riskLevel === "medium" ? "bg-amber-500/10 text-amber-400/70" : "bg-green-500/10 text-green-400/70")}>
              {riskLevel === "high" ? "高风险" : riskLevel === "medium" ? "中风险" : "低风险"}
            </span>
            {latestExecution && (
              <span className={"text-[10px] px-1.5 py-0.5 rounded " + (STATUS_COLOR[latestExecution.status] || "text-white/40")}>
                {STATUS_LABEL[latestExecution.status] || latestExecution.status}
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-white/80 mb-1">{title}</h4>
          {description && <p className="text-xs text-white/40 leading-relaxed">{description}</p>}
          {expectedProfitImpact > 0 && (
            <p className="text-xs text-green-400/60 mt-1">预期收益: {formatMoney(expectedProfitImpact)}</p>
          )}
        </div>
      </div>

      {latestExecution && (
        <div className="space-y-1">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">执行记录</div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {latestExecution.status === "running" && <span className="text-amber-400 flex items-center gap-1"><Play className="w-3 h-3" /> 执行中...</span>}
            {latestExecution.status === "completed" && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 已完成</span>}
            {latestExecution.status === "failed" && <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> 失败</span>}
            {latestExecution.status === "cancelled" && <span className="text-white/30 flex items-center gap-1"><XCircle className="w-3 h-3" /> 已取消</span>}
            {latestExecution.executedBy && <span className="text-white/25">by {latestExecution.executedBy}</span>}
            {latestExecution.executedAt && <span className="text-white/20">{new Date(latestExecution.executedAt).toLocaleString()}</span>}
          </div>
          {latestExecution.result && <p className="text-xs text-white/35 bg-white/[0.02] rounded-lg px-3 py-2">{latestExecution.result}</p>}
        </div>
      )}

      {latestOutcome && (
        <div className="space-y-1">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">结果验证</div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-white/50">{latestOutcome.metric}</span>
            <span className="text-white/30">基线: {formatMoney(latestOutcome.beforeValue)}</span>
            <span className="text-white/30">→ 实际: {formatMoney(latestOutcome.afterValue)}</span>
            <span className={"flex items-center gap-1 " + (isPositive ? "text-green-400/70" : isNegative ? "text-red-400/70" : "text-white/40")}>
              <TrendingUp className="w-3 h-3" />
              {isPositive ? "+" : ""}{improvementPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] flex-wrap">
        {latestExecution && latestExecution.status === "completed" ? null : (
          <button
            onClick={handleStart}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs transition-colors disabled:opacity-50">
            <Play className="w-3 h-3" />
            开始执行
          </button>
        )}
        {latestExecution && latestExecution.status === "running" ? (
          <button
            onClick={handleComplete}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-300 text-xs transition-colors disabled:opacity-50">
            <CheckCircle2 className="w-3 h-3" />
            完成执行
          </button>
        ) : null}

        {latestExecution && latestExecution.status === "completed" && !showOutcomeForm && !latestOutcome && (
          <button
            onClick={function() { setShowOutcomeForm(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors">
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
              className="flex-1 min-w-[80px] glass px-2 py-1 rounded-lg text-xs text-white/70 outline-none"
            />
            <input
              type="number"
              value={beforeValue}
              onChange={function(e) { setBeforeValue(e.target.value); }}
              placeholder="执行前"
              className="w-20 glass px-2 py-1 rounded-lg text-xs text-white/70 outline-none"
            />
            <input
              type="number"
              value={afterValue}
              onChange={function(e) { setAfterValue(e.target.value); }}
              placeholder="执行后"
              className="w-20 glass px-2 py-1 rounded-lg text-xs text-white/70 outline-none"
            />
            <button
              onClick={handleSaveOutcome}
              disabled={running}
              className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-300 text-xs transition-colors disabled:opacity-50">
              保存
            </button>
            <button
              onClick={function() { setShowOutcomeForm(false); setOutcomeResult(null); }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-xs transition-colors">
              取消
            </button>
          </>
        )}

        {outcomeResult && <span className="text-[10px] text-red-400/60">{outcomeResult}</span>}
      </div>
    </GlassCard>
  );
}
