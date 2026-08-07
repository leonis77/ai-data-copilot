"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Upload, ArrowRight, Sparkles, BarChart3 } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore, getDatasetRows, buildInlineDataset } from "@/lib/store";
import { computeStats } from "@/lib/parser";
import { ProcurementPanel } from "@/components/procurement";
import { detectRelations } from "@/lib/semantic";
import type { DatasetRelation } from "@/lib/semantic";
import { GenericOverview } from "@/components/insights/generic-overview";
import CrossPlatformView from "@/components/insights/cross-platform";
import { ProfitBar } from "@/components/dashboard/profit-bar";
import { ProfitRanking } from "@/components/dashboard/profit-ranking";
import { CostStructure } from "@/components/dashboard/cost-structure";
import { ActionCardView } from "@/components/insights/action-card-view";
import { EvidenceCardView } from "@/components/insights/evidence-card-view";
import ExecutionTracker from "@/components/insights/execution-tracker";
import LoopReviewBoard from "@/components/insights/loop-review-board";
import ScenarioPanel from "@/components/insights/scenario-panel";
import { logger } from "@/lib/logger";
import type { DecisionChainResponse, InsufficientDataResponse } from "@/lib/agent/api-types";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import type { Execution, Outcome } from "@/lib/loop/types";
import { fetchLoopHistory } from "@/lib/loop/client";
import { getPlatformLabel } from "@/lib/platform/detect";
import { parseApiError } from "@/lib/errors";
import { useObservability } from "@/hooks/use-observability";

export default function DashboardPage() {
  const obs = useObservability();
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [datasetData, setDatasetData] = useState<any>(null);
  const [decisionChain, setDecisionChain] = useState<DecisionChainResponse | null>(null);
  const [insufficientData, setInsufficientData] = useState<InsufficientDataResponse | null>(null);
  const [pipelineError, setPipelineError] = useState("");
  const [loopExecutions, setLoopExecutions] = useState<Record<string, Execution[]>>({});
  const [loopOutcomes, setLoopOutcomes] = useState<Record<string, Outcome[]>>({});

  useEffect(function() { loadData(""); }, []);
  useEffect(function() { if (hasData) obs.trackPageView("dashboard", { datasetId: datasetId || "none" }); }, [hasData]);

  function handleSelect(newId: string) { setLoading(true); setDecisionChain(null); setInsufficientData(null); setPipelineError(""); setLoopExecutions({}); setLoopOutcomes({}); loadData(newId); }

  async function loadData(dsId: string) {
    try {
      let id = dsId;
      if (!id) { var saved = getStore(); id = saved.activeId || ""; }
      if (!id) { setLoading(false); return; }
      setDatasetId(id);
      var localData = getDatasetRows(id);
      var data: any = null;
      if (localData && localData.rows.length > 0) {
        data = { columns: localData.columns, rows: localData.rows };
      } else {
        var res = await fetch("/api/upload?id=" + id);
        if (!res.ok) { setLoading(false); return; }
        data = await res.json();
      }
      if (!data || !data.columns) { setLoading(false); return; }
      var storeData = getStore();
      var selCols: string[] = data.columns || [];
      var filteredRows = (data.rows || []).map(function(r: any) {
        var o: Record<string, unknown> = {};
        for (var i = 0; i < selCols.length; i++) o[selCols[i]] = r[selCols[i]];
        return o;
      });
      setDatasetData({ ...data, rows: filteredRows, columns: selCols });
      var parsed = computeStats(filteredRows, selCols);
      setStats(parsed);
      setHasData(true);
      setDatasetName(data.original_name || storeData.datasets.find(function(d) { return d.id === id; })?.originalName || "");
      setLoading(false);
      var relatedIds: string[] = [];
      if (storeData.datasets.length > 1) {
        for (var i = 0; i < storeData.datasets.length; i++) {
          if (storeData.datasets[i].id !== id) {
            relatedIds.push(storeData.datasets[i].id);
          }
        }
      }
      var inlineDatasets: Record<string, any> = {};
      if (localData && localData.rows.length > 0) {
        var activeMeta = storeData.datasets.find(function(d) { return d.id === id; });
        if (activeMeta) inlineDatasets[id] = buildInlineDataset(activeMeta, localData.rows, 500);
      }
      for (var ri = 0; ri < relatedIds.length; ri++) {
        var relRows = getDatasetRows(relatedIds[ri]);
        if (relRows && relRows.rows.length > 0) {
          var relMeta = storeData.datasets.find(function(d) { return d.id === relatedIds[ri]; });
          if (relMeta) inlineDatasets[relatedIds[ri]] = buildInlineDataset(relMeta, relRows.rows, 200);
        }
      }
      try {
        var agentStart = Date.now();
        var chainRes = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: "分析经营状况，给出决策建议", datasetId: id, relatedDatasetIds: relatedIds, inlineDatasets: inlineDatasets }),
        });
        var chainData = await chainRes.json().catch(function() { return null; });
        var agentDuration = Date.now() - agentStart;
        obs.trackApiCall("/api/agent", agentDuration, chainRes.ok, { datasetId: id, type: chainData?.type });
        if (chainRes.ok && chainData?.type === "decision_chain") {
          setDecisionChain(chainData as DecisionChainResponse);
          setInsufficientData(null);
          setPipelineError("");
        } else if (chainRes.ok && chainData?.type === "insufficient_data") {
          setDecisionChain(null);
          setInsufficientData(chainData as InsufficientDataResponse);
          setPipelineError("");
        } else {
          var apiErr = chainData ? parseApiError(chainData) : null;
          setPipelineError(apiErr ? apiErr.message : (chainData?.content || "Pipeline 执行失败，请稍后重试。"));
        }
      } catch(e) {
        setPipelineError(e instanceof Error ? e.message : "Pipeline 执行失败，请稍后重试。");
        logger.warn("DecisionChain fetch failed", { message: e instanceof Error ? e.message : String(e) });
      }

      try {
        var loopData = await fetchLoopHistory(id);
        var execMap: Record<string, Execution[]> = {};
        var outcomeMap: Record<string, Outcome[]> = {};
        for (const dd of loopData.decisions) {
          const actionTasks = dd.actionTasks || [];
          for (const t of actionTasks) {
            if (dd.executions && dd.executions[t.id]) execMap[t.id] = dd.executions[t.id];
            if (dd.outcomes && dd.outcomes[t.id]) outcomeMap[t.id] = dd.outcomes[t.id];
          }
        }
        setLoopExecutions(execMap);
        setLoopOutcomes(outcomeMap);
      } catch (e) {
        logger.warn("Loop history fetch failed", { message: e instanceof Error ? e.message : String(e) });
      }
    } catch(e) { setLoading(false); }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="section-container py-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="icon-box bg-blue-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand animate-pulse" />
              </div>
              <div>
                <div className="h-6 w-40 skeleton rounded-lg mb-1.5" />
                <div className="h-4 w-64 skeleton rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              {[1, 2, 3].map(function(i) {
                return (
                  <div key={i} className="rounded-2xl p-6 border border-gray-200 bg-white card">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg skeleton-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-24 skeleton rounded mb-2" />
                        <div className="h-3 w-32 skeleton rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full skeleton rounded" />
                      <div className="h-3 w-3/4 skeleton rounded" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-md px-6">
          <motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 rounded-3xl bg-blue-50" />
            <BarChart3 className="w-10 h-10 text-brand relative z-10" />
          </motion.div>
          <h2 className="text-title text-balance mb-4">上传数据开始分析</h2>
          <p className="text-body mb-10 leading-relaxed">
            拖拽上传 Excel 或 CSV 文件<br />AI 将自动诊断您的经营状况
          </p>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="btn-primary text-lg px-8 py-4 rounded-2xl flex items-center gap-2">
              <Upload className="w-5 h-5" />上传数据
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Derived data
  var storeData = getStore();
  var dataProfile = storeData.datasets.find(function(d) { return d.id === datasetId; })?.profile || "unknown";
  var currentPlatform = storeData.datasets.find(function(d) { return d.id === datasetId; })?.platform || "";
  var relations: DatasetRelation[] = [];
  try { relations = detectRelations(storeData.datasets.map(function(d: any) { return { id: d.id, originalName: d.originalName, semanticRoles: d.semanticRoles || null }; })); } catch(e) {}
  var allPlatforms: string[] = storeData.datasets.map(function(d) { return d.platform || ""; }).filter(function(p) { return p !== ""; });
  var hasMultiPlatform = new Set(allPlatforms).size >= 2;

  // Pipeline data
  var evidenceCards = decisionChain?.evidenceCards || [];
  var diagnoses = decisionChain?.diagnoses || [];
  var actions = decisionChain?.actions || [];
  var aiSummary = decisionChain?.content || "";
  var scenarios = decisionChain?.scenarios;
  var hasScenarios = scenarios && scenarios.scenarios && scenarios.scenarios.length > 0;
  var crossPlatform: CrossPlatformComparison[] = decisionChain?.crossPlatform || [];

  // Unknown data
  if (dataProfile === "unknown") {
    return (
      <div className="min-h-screen pt-16">
        <div className="section-container py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h1 className="text-title">
                  <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">数据画像</span>
                </h1>
                {datasetName && <p className="text-caption mt-1">{datasetName}</p>}
              </div>
              <TableSelector onSelect={handleSelect} className="ml-auto" />
            </div>
          </motion.div>
          <GenericOverview columns={datasetData.columns} rows={datasetData.rows} datasetName={datasetName} />
        </div>
      </div>
    );
  }

  // Supply data
  if (dataProfile === "supply") {
    return (
      <div className="min-h-screen pt-16">
        <div className="section-container py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h1 className="text-title">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">供货分析</span>
                </h1>
                {datasetName && <p className="text-caption mt-1">{datasetName}</p>}
              </div>
              <TableSelector onSelect={handleSelect} className="ml-auto" />
            </div>
          </motion.div>
          <ProcurementPanel datasetData={datasetData} datasetName={datasetName} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // Main Dashboard
  // ═══════════════════════════════════════════════

  var criticalDiagnoses = diagnoses.filter(function(d: any) { return d.level === "critical"; });
  var warningDiagnoses = diagnoses.filter(function(d: any) { return d.level === "warning"; });
  var opportunityDiagnoses = diagnoses.filter(function(d: any) { return d.level === "opportunity"; });

  return (
    <div className="min-h-screen pt-16">
      <div className="section-container py-8 md:py-12 relative">
        {/* Ambient glow */}
        <div className="ambient-glow" />

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="page-header">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <h1 className="text-title">
                <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">经营诊断</span>
              </h1>
              {datasetName && <p className="text-caption mt-1.5 truncate max-w-[200px] md:max-w-none">{datasetName}</p>}
            </div>
            <TableSelector onSelect={handleSelect} className="ml-auto" />
          </div>
          {relations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center gap-3 hover-lift">
              <div className="icon-box bg-blue-100 shrink-0"><Sparkles className="w-4 h-4 text-brand" /></div>
              <span className="text-sm text-secondary">
                检测到 {relations.length} 组数据关联关系：{relations[0].description}
              </span>
              <Link href="/chat?auto=compare" className="ml-auto text-xs text-brand hover:text-brand-dark transition-colors duration-200 shrink-0 font-medium">
                AI 跨平台分析 →
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Row 1: Profit KPI Bar */}
        {evidenceCards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="section-gap">
            <ProfitBar evidenceCards={evidenceCards} />
          </motion.div>
        )}

        {/* Row 2: Profit Ranking + Cost Structure */}
        {evidenceCards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 section-gap">
            <div className="md:col-span-3">
              <ProfitRanking evidenceCards={evidenceCards} />
            </div>
            <div className="md:col-span-2">
              <CostStructure evidenceCards={evidenceCards} />
            </div>
          </motion.div>
        )}

        {/* Row 3: Diagnoses Feed */}
        {diagnoses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="section-gap">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-heading">经营诊断</span>
              <span className="text-caption">
                {criticalDiagnoses.length > 0 ? "🔴 " + criticalDiagnoses.length + " 紧急 " : ""}
                {warningDiagnoses.length > 0 ? "🟡 " + warningDiagnoses.length + " 警告 " : ""}
                {opportunityDiagnoses.length > 0 ? "🟢 " + opportunityDiagnoses.length + " 机会" : ""}
              </span>
            </div>
            <div className="space-y-2.5">
              {criticalDiagnoses.map(function(d: any, i: number) {
                var linkedCards = evidenceCards.filter(function(c: any) {
                  return d.products && d.products.some(function(p: string) { return c.productName === p || (typeof p === "string" && p.includes(c.productName)); });
                });
                return (
                  <motion.div key={"crit-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                    className="rounded-xl p-4 border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.06] transition-colors duration-200">
                    <div className="flex items-start gap-3">
                      <span className="text-red-400 text-sm mt-0.5">❌</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-red-300/90">{d.title}</h4>
                        <p className="text-body mt-1.5 leading-relaxed">{d.detail}</p>
                        {d.action && <p className="text-sm text-brand/80 mt-2 font-medium">→ {d.action}</p>}
                        {d.impact && <p className="text-xs text-emerald-500/60 mt-1.5">预期: {d.impact}</p>}
                        {d.reference && <p className="text-caption mt-1.5">📎 {d.reference}</p>}
                        {d.products && d.products.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-3">
                            {d.products.map(function(p: string, pi: number) {
                              var cardIdx = evidenceCards.findIndex(function(c: any) { return c.productName === p; });
                              return (
                                <span key={pi} className="text-caption px-2 py-0.5 rounded bg-gray-100 text-faint font-mono">
                                  {p}{cardIdx >= 0 ? " · #" + cardIdx : ""}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {warningDiagnoses.map(function(d: any, i: number) {
                return (
                  <motion.div key={"warn-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.15, duration: 0.4, ease: "easeOut" }}
                    className="rounded-xl p-4 border border-amber-500/15 bg-amber-500/[0.03] hover:bg-amber-500/[0.05] transition-colors duration-200">
                    <div className="flex items-start gap-3">
                      <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-amber-300/80">{d.title}</h4>
                        <p className="text-body mt-1.5 leading-relaxed">{d.detail}</p>
                        {d.action && <p className="text-sm text-brand/70 mt-2 font-medium">→ {d.action}</p>}
                        {d.reference && <p className="text-caption mt-1.5">📎 {d.reference}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {opportunityDiagnoses.map(function(d: any, i: number) {
                return (
                  <motion.div key={"opp-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.3, duration: 0.4, ease: "easeOut" }}
                    className="rounded-xl p-4 border border-emerald-500/10 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] transition-colors duration-200">
                    <div className="flex items-start gap-3">
                      <span className="text-emerald-400 text-sm mt-0.5">💡</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-emerald-300/70">{d.title}</h4>
                        <p className="text-body mt-1.5 leading-relaxed">{d.detail}</p>
                        {d.action && <p className="text-sm text-brand/70 mt-2 font-medium">→ {d.action}</p>}
                        {d.impact && <p className="text-xs text-emerald-400/50 mt-1.5">预期: {d.impact}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty diagnosis state */}
        {diagnoses.length === 0 && evidenceCards.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="section-gap p-8 rounded-2xl border border-gray-100 text-center card">
            <div className="icon-box bg-blue-50 mx-auto mb-3"><Sparkles className="w-5 h-5 text-brand" /></div>
            <p className="text-body">AI 正在分析您的经营数据...</p>
            <p className="text-caption mt-2">若持续未显示，请确认数据中包含价格和商品名称字段</p>
          </motion.div>
        )}

        {/* Row 4: Actions + Cross-platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 section-gap">
          {actions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-heading">行动建议</span>
                <span className="text-caption">{actions.length} 条</span>
              </div>
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                {actions.map(function(act, ai) {
                  return (
                    <div key={ai} className="space-y-2">
                      <ActionCardView action={act} index={ai} />
                      {act.actionTaskId && (
                        <ExecutionTracker
                          actionTaskId={act.actionTaskId}
                          title={act.title || act.action}
                          description={act.description || act.reason}
                          priority={act.priority}
                          riskLevel={act.riskLevel}
                          expectedProfitImpact={act.expectedProfitImpact}
                          executions={loopExecutions[act.actionTaskId] || []}
                          outcomes={loopOutcomes[act.actionTaskId] || []}
                          onRefresh={function() {
                            fetchLoopHistory(datasetId).then(function(data) {
                              var execMap: Record<string, Execution[]> = {};
                              var outcomeMap: Record<string, Outcome[]> = {};
                              for (const dd of data.decisions) {
                                for (const t of (dd.actionTasks || [])) {
                                  if (dd.executions && dd.executions[t.id]) execMap[t.id] = dd.executions[t.id];
                                  if (dd.outcomes && dd.outcomes[t.id]) outcomeMap[t.id] = dd.outcomes[t.id];
                                }
                              }
                              setLoopExecutions(execMap);
                              setLoopOutcomes(outcomeMap);
                            }).catch(function() {});
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {hasMultiPlatform && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}>
              <CrossPlatformView
                comparisons={crossPlatform}
                coveredPlatforms={
                  crossPlatform.length > 0
                    ? Array.from(new Set(
                        crossPlatform.flatMap(function(c) {
                          return c.platformResults.map(function(p) { return p.platform; });
                        })
                      ))
                    : Array.from(new Set(allPlatforms))
                }
              />
            </motion.div>
          )}

          {!hasMultiPlatform && currentPlatform && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-xl p-5 border border-blue-100 bg-blue-50/30 flex items-center gap-3 hover-lift">
              <div className="icon-box bg-blue-100 shrink-0"><Sparkles className="w-5 h-5 text-brand" /></div>
              <div>
                <p className="text-body">
                  当前仅{getPlatformLabel(currentPlatform)}平台数据
                </p>
                <p className="text-caption mt-1">上传其他平台数据后将自动展示跨平台利润对比</p>
              </div>
              <Link href="/upload" className="ml-auto text-xs text-brand hover:text-brand-dark transition-colors duration-200 shrink-0 font-medium">
                上传更多 →
              </Link>
            </motion.div>
          )}
        </div>

        {/* Row 4.6: Scenario Simulation */}
        {hasScenarios && (
          <ScenarioPanel scenarios={scenarios!} profitResults={decisionChain?.metrics?.profit || []} />
        )}

        {/* Row 4.5: Evidence Cards */}
        {evidenceCards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }} className="section-gap">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-heading">证据卡</span>
              <span className="text-caption">{evidenceCards.length} 张</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {evidenceCards.slice(0, 3).map(function(card, ci) {
                return <EvidenceCardView key={ci} card={card} defaultExpanded={ci === 0} />;
              })}
            </div>
            {evidenceCards.length > 3 && (
              <p className="text-caption text-center mt-3">
                +{evidenceCards.length - 3} 张更多证据卡 · 切换到 Chat 查看全部
              </p>
            )}
          </motion.div>
        )}

        {/* Row 5: AI Analysis */}
        {aiSummary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl p-6 border border-gray-200 card hover-lift">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="icon-box bg-blue-50"><Sparkles className="w-4 h-4 text-brand" /></div>
              <h2 className="text-heading">AI 综合分析</h2>
              {decisionChain?.aiExplanation?.confidence !== undefined && (
                <span className={"text-caption px-2.5 py-1 rounded-full " + (
                  decisionChain.aiExplanation.confidence >= 0.8 ? "badge-success" :
                  decisionChain.aiExplanation.confidence >= 0.5 ? "badge-warning" :
                  "badge-danger"
                )}>
                  置信度 {Math.round(decisionChain.aiExplanation.confidence * 100)}%
                </span>
              )}
              <span className="text-caption ml-auto">
                基于 {evidenceCards.length} 张证据卡 · {diagnoses.length} 条诊断 · {actions.length} 条建议
              </span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-body leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </div>
            {decisionChain?.meta && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-caption">
                <span className="font-mono">行业: {decisionChain.meta.industry?.name || "—"}</span>
                {decisionChain.meta.pipelineLatency !== undefined && (
                  <span className="font-mono">分析耗时: {(decisionChain.meta.pipelineLatency / 1000).toFixed(1)}s</span>
                )}
                {decisionChain.meta.freshnessScore !== undefined && (
                  <span className="font-mono">知识时效: {Math.round(decisionChain.meta.freshnessScore)}%</span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Data limitation state */}
        {insufficientData && !decisionChain && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-2xl p-6 border border-amber-200 bg-amber-50 card">
            <p className="text-sm text-amber-300/80 font-medium">当前数据不足以生成完整经营决策</p>
            <p className="text-body mt-2">{insufficientData.content}</p>
            {insufficientData.limitations.length > 0 && (
              <ul className="mt-4 space-y-2 text-body list-disc pl-5">
                {insufficientData.limitations.map(function(item: string) { return <li key={item}>{item}</li>; })}
              </ul>
            )}
          </motion.div>
        )}

        {/* Pipeline error state */}
        {pipelineError && !decisionChain && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-2xl p-6 border border-red-200 bg-red-50 card">
            <div className="flex items-center gap-4">
              <div className="icon-box bg-red-100 shrink-0"><span className="text-red-400 text-lg">⚠️</span></div>
              <div className="flex-1">
                <p className="text-sm text-red-300/80 font-medium">AI 分析暂时不可用</p>
                <p className="text-body mt-1">{pipelineError}</p>
              </div>
              <button
                onClick={() => { setPipelineError(""); setDecisionChain(null); setInsufficientData(null); loadData(datasetId); }}
                className="btn-ghost px-4 py-2 text-sm shrink-0">
                重试
              </button>
            </div>
          </motion.div>
        )}

        {/* Pipeline loading state */}
        {!decisionChain && !insufficientData && !pipelineError && !aiSummary && evidenceCards.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-2xl p-6 border border-gray-100 card">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{animationDelay:"0ms"}} />
                <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{animationDelay:"150ms"}} />
                <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{animationDelay:"300ms"}} />
              </div>
              <span className="text-body">AI 正在分析经营数据并生成诊断...</span>
            </div>
          </motion.div>
        )}

        {/* Row 6: Execution/Outcome Review Board */}
        {hasData && datasetId && <LoopReviewBoard datasetId={datasetId} />}
      </div>
    </div>
  );
}
