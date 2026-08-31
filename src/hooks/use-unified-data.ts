"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { dataManager } from "@/lib/data-manager";
import { getStore, getDatasetRows, buildInlineDataset, computeStatsCached, DASHBOARD_ANALYSIS_CONTEXT } from "@/lib/store";
import { authFetch } from "@/lib/auth-fetch";
import { computeDataVersion } from "@/lib/store";
import { useDataContext } from "@/contexts/data-context";
import type { DecisionChainResponse, InsufficientDataResponse } from "@/lib/agent/api-types";
import type { Execution, Outcome } from "@/lib/loop/types";
import type { LoopHistory } from "@/lib/loop/client";
import { fetchLoopHistory } from "@/lib/loop/client";
import { parseApiError } from "@/lib/errors";

// ═══════════════════════════════════════════════
// useActiveDataset
// ═══════════════════════════════════════════════

export function useActiveDataset() {
  const { state, dispatch } = useDataContext();
  const { activeDatasetId, datasets, datasetRows } = state.dataset;

  const setActiveDataset = useCallback(
    (datasetId: string) => {
      dispatch({ type: "SET_ACTIVE_DATASET", payload: datasetId });
      // Notify other modules
      window.dispatchEvent(new CustomEvent("dataset:changed", { detail: { datasetId } }));
    },
    [dispatch]
  );

  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === activeDatasetId) || null;
  }, [datasets, activeDatasetId]);

  const activeRows = useMemo(() => {
    if (!activeDatasetId) return null;
    return datasetRows[activeDatasetId] || null;
  }, [datasetRows, activeDatasetId]);

  return {
    activeDatasetId,
    activeDataset,
    datasets,
    datasetRows,
    activeRows,
    setActiveDataset,
  };
}

// ═══════════════════════════════════════════════
// useAnalysisData
// ═══════════════════════════════════════════════

export function useAnalysisData(userId: string, datasetId: string | null) {
  const { state, dispatch, eventBus } = useDataContext();
  const { rawData, decisionChain, insufficientData, stats, agentLoading, pipelineError, degradedResponse } =
    state.analysis;

  const fetchAnalysis = useCallback(
    async (targetId: string, signal?: AbortSignal) => {
      if (!userId || !targetId) return;

      dispatch({ type: "SET_AGENT_LOADING", payload: true });
      dispatch({ type: "SET_PIPELINE_ERROR", payload: null });
      dispatch({ type: "SET_DECISION_CHAIN", payload: null });
      dispatch({ type: "SET_INSUFFICIENT_DATA", payload: null });
      dispatch({ type: "SET_DEGRADED_RESPONSE", payload: false });

      try {
        const storeData = getStore(userId);
        const dsMeta = storeData.datasets.find((d: any) => d.id === targetId);
        const dataVersion = dsMeta?.dataVersion || "";

        // Try cache first
        const cacheKey = `${targetId}:${DASHBOARD_ANALYSIS_CONTEXT}:${dataVersion || "legacy"}`;
        const cached = dataManager.fetch(
          cacheKey,
          async () => {
            // Cache miss: fetch from API
            const relatedIds = storeData.datasets
              .filter((d: any) => d.id !== targetId)
              .map((d: any) => d.id);

            const inlineDatasets: Record<string, any> = {};
            const activeRows = getDatasetRows(targetId);
            if (activeRows && activeRows.rows.length > 0) {
              const activeMeta = storeData.datasets.find((d: any) => d.id === targetId);
              if (activeMeta) {
                inlineDatasets[targetId] = buildInlineDataset(activeMeta, activeRows.rows, 500);
              }
            }
            for (const relId of relatedIds) {
              const relRows = getDatasetRows(relId);
              if (relRows && relRows.rows.length > 0) {
                const relMeta = storeData.datasets.find((d: any) => d.id === relId);
                if (relMeta) {
                  inlineDatasets[relId] = buildInlineDataset(relMeta, relRows.rows, 200);
                }
              }
            }

            const res = await authFetch("/api/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: "分析经营状况，给出决策建议",
                datasetId: targetId,
                relatedDatasetIds: relatedIds,
                inlineDatasets,
              }),
              signal,
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => null);
              throw new Error(parseApiError(errData)?.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            return data;
          },
          24 * 60 * 60 * 1000 // 24h TTL
        );

        if (signal?.aborted) return;

        const chainData = await cached;

        if (chainData.type === "decision_chain") {
          dispatch({ type: "SET_DECISION_CHAIN", payload: chainData as DecisionChainResponse });
          dispatch({ type: "SET_INSUFFICIENT_DATA", payload: null });
          dispatch({ type: "SET_PIPELINE_ERROR", payload: null });
          dispatch({ type: "SET_DEGRADED_RESPONSE", payload: !!(chainData as any).degraded });
          eventBus.emit("analysis:completed", { datasetId: targetId, data: chainData });
        } else if (chainData.type === "insufficient_data") {
          dispatch({ type: "SET_DECISION_CHAIN", payload: null });
          dispatch({ type: "SET_INSUFFICIENT_DATA", payload: chainData as InsufficientDataResponse });
          dispatch({ type: "SET_PIPELINE_ERROR", payload: null });
        } else if ((chainData as any).degraded) {
          const normalized = { ...chainData, type: "decision_chain" } as DecisionChainResponse;
          dispatch({ type: "SET_DECISION_CHAIN", payload: normalized });
          dispatch({ type: "SET_INSUFFICIENT_DATA", payload: null });
          dispatch({ type: "SET_PIPELINE_ERROR", payload: null });
          dispatch({ type: "SET_DEGRADED_RESPONSE", payload: true });
          eventBus.emit("analysis:completed", { datasetId, data: normalized });
        } else {
          const err = parseApiError(chainData);
          dispatch({ type: "SET_DECISION_CHAIN", payload: null });
          dispatch({ type: "SET_PIPELINE_ERROR", payload: err?.message || "分析失败" });
          eventBus.emit("analysis:error", { datasetId: targetId, error: err?.message });
        }
      } catch (e) {
        if (signal?.aborted) return;
        const msg = e instanceof Error ? e.message : "AI 服务暂时不可用";
        dispatch({ type: "SET_PIPELINE_ERROR", payload: msg });
        eventBus.emit("analysis:error", { datasetId: targetId, error: msg });
      } finally {
        dispatch({ type: "SET_AGENT_LOADING", payload: false });
      }
    },
    [userId, dispatch, eventBus]
  );

  const refetchAnalysis = useCallback(
    async (targetId: string) => {
      // Invalidate cache and refetch
      const storeData = getStore(userId);
      const dsMeta = storeData.datasets.find((d: any) => d.id === targetId);
      const dataVersion = dsMeta?.dataVersion || "";
      const cacheKey = `${targetId}:${DASHBOARD_ANALYSIS_CONTEXT}:${dataVersion || "legacy"}`;
      dataManager.invalidate(cacheKey);
      await fetchAnalysis(targetId);
    },
    [userId, fetchAnalysis]
  );

  // Auto-fetch analysis when dataset changes
  useEffect(function() {
    if (!datasetId) return;
    let cancelled = false;
    void fetchAnalysis(datasetId);
    return function() { cancelled = true; };
  }, [datasetId, fetchAnalysis]);

  return {
    rawData,
    decisionChain,
    insufficientData,
    stats,
    agentLoading,
    pipelineError,
    degradedResponse,
    fetchAnalysis,
    refetchAnalysis,
  };
}

// ═══════════════════════════════════════════════
// useLoopData
// ═══════════════════════════════════════════════

export function useLoopData(userId: string, datasetId: string | null) {
  const { state, dispatch, eventBus } = useDataContext();
  const { rows, loopLoading, loopError } = state.loop;

  const refreshLoopData = useCallback(
    async (currentDsId: string) => {
      if (!userId || !currentDsId) return;

      dispatch({ type: "SET_LOOP_DATA", payload: { rows: [], loading: true, error: null } });

      try {
        const data = await fetchLoopHistory(currentDsId, userId);
        const loopRows = (data as any).decisions.map((dd: any) => {
          const execMap: Record<string, Execution[]> = {};
          const outcomeMap: Record<string, Outcome[]> = {};
          const actionTasks = dd.actionTasks || [];
          for (const t of actionTasks) {
            if (dd.executions && dd.executions[t.id]) {
              execMap[t.id] = dd.executions[t.id];
            }
            if (dd.outcomes && dd.outcomes[t.id]) {
              outcomeMap[t.id] = dd.outcomes[t.id];
            }
          }
          return {
            decision: dd.decision,
            actionTasks,
            executions: execMap,
            outcomes: outcomeMap,
          };
        });

        dispatch({ type: "SET_LOOP_DATA", payload: { rows: loopRows, loading: false, error: null } });
        eventBus.emit("loop:refreshed", { datasetId: currentDsId, rows: loopRows });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "加载执行数据失败";
        dispatch({ type: "SET_LOOP_DATA", payload: { rows: [], loading: false, error: msg } });
      }
    },
    [userId, dispatch, eventBus]
  );

  // Auto-refresh loop data when dataset changes

  // Also listen for manual refresh triggers from components
  useEffect(function() {
    if (!datasetId) return;
    var handler = function() {
      void refreshLoopData(datasetId);
    };
    window.addEventListener('loop:refresh', handler);
    return function() { window.removeEventListener('loop:refresh', handler); };
  }, [datasetId, refreshLoopData]);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    void refreshLoopData(datasetId);
    return () => {
      cancelled = true;
    };
  }, [datasetId, refreshLoopData]);

  const updateExecution = useCallback(
    (actionTaskId: string, execution: Execution) => {
      dispatch({ type: "UPDATE_EXECUTION", payload: { actionTaskId, execution } });
      eventBus.emit("execution:started", { actionTaskId, execution });
    },
    [dispatch, eventBus]
  );

  const updateOutcome = useCallback(
    (actionTaskId: string, outcome: Outcome) => {
      dispatch({ type: "UPDATE_OUTCOME", payload: { actionTaskId, outcome } });
      eventBus.emit("outcome:saved", { actionTaskId, outcome });
    },
    [dispatch, eventBus]
  );

  // Computed aggregations
  const aggregations = useMemo(() => {
    let totalDecisions = 0;
    let totalActionTasks = 0;
    let executedTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;
    let totalOutcomes = 0;
    let verifiedProfit = 0;
    let expectedProfit = 0;
    let positiveOutcomes = 0;

    for (const row of rows) {
      totalDecisions++;
      const actionTasks = row.actionTasks || [];
      totalActionTasks += actionTasks.length;
      expectedProfit += Number(row.decision.expectedProfitImpact) || 0;

      for (const task of actionTasks) {
        const taskId = task.actionTaskId;
        if (!taskId) continue;
        const execs = row.executions[taskId] || [];
        const outs = row.outcomes[taskId] || [];

        if (execs.length > 0) executedTasks++;
        if (execs.some((e) => e.status === "completed")) completedTasks++;
        if (execs.some((e) => e.status === "failed")) failedTasks++;

        totalOutcomes += outs.length;
        for (const out of outs) {
          verifiedProfit += out.improvement;
          if (out.improvement > 0) positiveOutcomes++;
        }
      }
    }

    const completionRate = totalActionTasks > 0 ? Math.round((completedTasks / totalActionTasks) * 100) : 0;
    const positiveRate = totalOutcomes > 0 ? Math.round((positiveOutcomes / totalOutcomes) * 100) : 0;

    return {
      totalDecisions,
      totalActionTasks,
      executedTasks,
      completedTasks,
      failedTasks,
      totalOutcomes,
      verifiedProfit,
      expectedProfit,
      positiveOutcomes,
      completionRate,
      positiveRate,
    };
  }, [rows]);

  return {
    rows,
    loopLoading,
    loopError,
    refreshLoopData,
    updateExecution,
    updateOutcome,
    ...aggregations,
  };
}

// ═══════════════════════════════════════════════
// useUnifiedData (convenience hook combining all)
// ═══════════════════════════════════════════════

export function useUnifiedData(userId: string) {
  const dataset = useActiveDataset();
  const analysis = useAnalysisData(userId, dataset.activeDatasetId);
  const loop = useLoopData(userId, dataset.activeDatasetId);

  return {
    userId,
    ...dataset,
    ...analysis,
    ...loop,
  };
}
