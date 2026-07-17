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
import { logger } from "@/lib/logger";
import type { DecisionChainResponse, InsufficientDataResponse } from "@/lib/agent/api-types";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import { getPlatformLabel } from "@/lib/platform/detect";
import { parseApiError } from "@/lib/errors";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [datasetData, setDatasetData] = useState<any>(null);
  const [decisionChain, setDecisionChain] = useState<DecisionChainResponse | null>(null);
  const [insufficientData, setInsufficientData] = useState<InsufficientDataResponse | null>(null);
  const [pipelineError, setPipelineError] = useState("");

  useEffect(function() { loadData(""); }, []);

  function handleSelect(newId: string) { setLoading(true); setDecisionChain(null); setInsufficientData(null); setPipelineError(""); loadData(newId); }

  async function loadData(dsId: string) {
    try {
      let id = dsId;
      if (!id) { var saved = getStore(); id = saved.activeId || ""; }
      if (!id) { setLoading(false); return; }
      setDatasetId(id);
      // ⭐ 优先从 localStorage 读取数据（Vercel serverless 实例不共享内存）
      var localData = getDatasetRows(id);
      var data: any = null;
      if (localData && localData.rows.length > 0) {
        data = { columns: localData.columns, rows: localData.rows };
      } else {
        // 回退到服务端 API（Supabase 或其他持久化存储）
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
      // Build related dataset IDs for cross-platform analysis
      var relatedIds: string[] = [];
      if (storeData.datasets.length > 1) {
        for (var i = 0; i < storeData.datasets.length; i++) {
          if (storeData.datasets[i].id !== id) {
            relatedIds.push(storeData.datasets[i].id);
          }
        }
      }
      // ⭐ 构建内联数据集：当前 + 所有关联数据集的行数据（从 localStorage 直传后端 Pipeline）
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
      // Fetch DecisionChain from backend pipeline
      try {
        var chainRes = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: "分析经营状况，给出决策建议", datasetId: id, relatedDatasetIds: relatedIds, inlineDatasets: inlineDatasets }),
        });
        var chainData = await chainRes.json().catch(function() { return null; });
        if (chainRes.ok && chainData?.type === "decision_chain") {
          setDecisionChain(chainData as DecisionChainResponse);
          setInsufficientData(null);
          setPipelineError("");
          logger.info("Dashboard loaded DecisionChain from pipeline", {
            evidenceCards: chainData.evidenceCards?.length || 0,
            actions: chainData.actions?.length || 0,
            diagnoses: chainData.diagnoses?.length || 0,
            crossPlatform: chainData.crossPlatform?.length || 0,
          });
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
        logger.warn("DecisionChain fetch failed", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } catch(e) { setLoading(false); }
  }

  // ═══ Loading state ═══
  if (loading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-4 w-64 skeleton rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        </div>
      </div>
    );
  }

  // ═══ Empty state ═══
  if (!hasData) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center max-w-md px-6">
          <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-8"
            style={{ background: "radial-gradient(circle, rgba(124,92,255,0.15) 0%, transparent 70%)" }}>
            <BarChart3 className="w-10 h-10 text-indigo-400/60" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3 text-white/80">上传数据开始分析</h2>
          <p className="text-white/30 mb-10 leading-relaxed">
            拖拽上传 Excel 或 CSV 文件<br />AI 将自动诊断您的经营状况
          </p>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
              <Upload className="w-5 h-5" />
              上传数据
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ═══ Derived data ═══
  var storeData = getStore();
  var dataProfile = storeData.datasets.find(function(d) { return d.id === datasetId; })?.profile || "unknown";
  var currentPlatform = storeData.datasets.find(function(d) { return d.id === datasetId; })?.platform || "";
  var relations: DatasetRelation[] = [];
  try { relations = detectRelations(storeData.datasets.map(function(d: any) { return { id: d.id, originalName: d.originalName, semanticRoles: d.semanticRoles || null }; })); } catch(e) {}
  var allPlatforms: string[] = storeData.datasets.map(function(d) { return d.platform || ""; }).filter(function(p) { return p !== ""; });
  var hasMultiPlatform = new Set(allPlatforms).size >= 2;

  // Pipeline data (single source of truth)
  var evidenceCards = decisionChain?.evidenceCards || [];
  var diagnoses = decisionChain?.diagnoses || [];
  var actions = decisionChain?.actions || [];
  var aiSummary = decisionChain?.content || "";
  var crossPlatform: CrossPlatformComparison[] = decisionChain?.crossPlatform || [];

  // ═══ Unknown data ═══
  if (dataProfile === "unknown") {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold text-white/90">
                  <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">数据画像</span>
                </h1>
                {datasetName && <p className="text-sm text-white/30 mt-1">{datasetName}</p>}
              </div>
              <TableSelector onSelect={handleSelect} className="ml-auto" />
            </div>
          </motion.div>
          <GenericOverview columns={datasetData.columns} rows={datasetData.rows} datasetName={datasetName} />
        </div>
      </div>
    );
  }

  // ═══ Supply data ═══
  if (dataProfile === "supply") {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold text-white/90">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">供货分析</span>
                </h1>
                {datasetName && <p className="text-sm text-white/30 mt-1">{datasetName}</p>}
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
  // Main Dashboard: Pipeline-driven business view
  // ═══════════════════════════════════════════════

  var criticalDiagnoses = diagnoses.filter(function(d: any) { return d.level === "critical"; });
  var warningDiagnoses = diagnoses.filter(function(d: any) { return d.level === "warning"; });
  var opportunityDiagnoses = diagnoses.filter(function(d: any) { return d.level === "opportunity"; });

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Ambient glow — hidden on mobile to save GPU */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, rgba(124,92,255,1) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, rgba(0,212,255,1) 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white/90">
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">经营诊断</span>
              </h1>
              {datasetName && <p className="text-xs md:text-sm text-white/30 mt-1 truncate max-w-[200px] md:max-w-none">{datasetName}</p>}
            </div>
            <TableSelector onSelect={handleSelect} className="ml-auto" />
          </div>
          {/* Cross-table relation banner */}
          {relations.length > 0 && (
            <div className="mt-3 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-300/80">
                检测到 {relations.length} 组数据关联关系：{relations[0].description}
              </span>
              <Link href="/chat?auto=compare" className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0">
                AI 跨平台分析 →
              </Link>
            </div>
          )}
        </motion.div>

        {/* ═══ Row 1: Profit KPI Bar ═══ */}
        {evidenceCards.length > 0 && (
          <div className="mb-6">
            <ProfitBar evidenceCards={evidenceCards} />
          </div>
        )}

        {/* ═══ Row 2: Profit Ranking + Cost Structure ═══ */}
        {evidenceCards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 mb-6">
            <div className="md:col-span-3">
              <ProfitRanking evidenceCards={evidenceCards} />
            </div>
            <div className="md:col-span-2">
              <CostStructure evidenceCards={evidenceCards} />
            </div>
          </div>
        )}

        {/* ═══ Row 3: Diagnoses Feed ═══ */}
        {diagnoses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-white/40 font-medium">经营诊断</span>
              <span className="text-[10px] text-white/20">
                {criticalDiagnoses.length > 0 ? "🔴 " + criticalDiagnoses.length + " 紧急 " : ""}
                {warningDiagnoses.length > 0 ? "🟡 " + warningDiagnoses.length + " 警告 " : ""}
                {opportunityDiagnoses.length > 0 ? "🟢 " + opportunityDiagnoses.length + " 机会" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {/* Critical first */}
              {criticalDiagnoses.map(function(d: any, i: number) {
                var linkedCards = evidenceCards.filter(function(c: any) {
                  return d.products && d.products.some(function(p: string) { return c.productName === p || (typeof p === "string" && p.includes(c.productName)); });
                });
                return (
                  <motion.div key={"crit-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl p-4 border border-red-500/20 bg-red-500/[0.04]">
                    <div className="flex items-start gap-3">
                      <span className="text-red-400 text-sm mt-0.5">❌</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-red-300/90">{d.title}</h4>
                        <p className="text-xs text-white/45 mt-1 leading-relaxed">{d.detail}</p>
                        {d.action && <p className="text-xs text-indigo-400/70 mt-1">→ {d.action}</p>}
                        {d.impact && <p className="text-xs text-green-400/60 mt-0.5">预期: {d.impact}</p>}
                        {d.reference && <p className="text-[10px] text-white/25 mt-1">📎 {d.reference}</p>}
                        {d.products && d.products.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {d.products.map(function(p: string, pi: number) {
                              var cardIdx = evidenceCards.findIndex(function(c: any) { return c.productName === p; });
                              return (
                                <span key={pi} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25">
                                  {p}{cardIdx >= 0 ? " · 卡片#" + cardIdx : ""}
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
              {/* Warnings */}
              {warningDiagnoses.map(function(d: any, i: number) {
                return (
                  <motion.div key={"warn-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.15 }}
                    className="rounded-xl p-4 border border-amber-500/15 bg-amber-500/[0.03]">
                    <div className="flex items-start gap-3">
                      <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-amber-300/80">{d.title}</h4>
                        <p className="text-xs text-white/40 mt-1 leading-relaxed">{d.detail}</p>
                        {d.action && <p className="text-xs text-indigo-400/60 mt-1">→ {d.action}</p>}
                        {d.reference && <p className="text-[10px] text-white/20 mt-1">📎 {d.reference}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {/* Opportunities */}
              {opportunityDiagnoses.map(function(d: any, i: number) {
                return (
                  <motion.div key={"opp-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.3 }}
                    className="rounded-xl p-4 border border-green-500/10 bg-green-500/[0.02]">
                    <div className="flex items-start gap-3">
                      <span className="text-green-400 text-sm mt-0.5">💡</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-green-300/70">{d.title}</h4>
                        <p className="text-xs text-white/40 mt-1 leading-relaxed">{d.detail}</p>
                        {d.action && <p className="text-xs text-indigo-400/60 mt-1">→ {d.action}</p>}
                        {d.impact && <p className="text-xs text-green-400/50 mt-0.5">预期: {d.impact}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty diagnosis state — show only if no evidence cards either */}
        {diagnoses.length === 0 && evidenceCards.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-6 rounded-2xl border border-white/[0.04] text-center"
            style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.3)" }}>
            <Sparkles className="w-6 h-6 text-white/15 mx-auto mb-2" />
            <p className="text-sm text-white/30">AI 正在分析您的经营数据...</p>
            <p className="text-xs text-white/15 mt-1">若持续未显示，请确认数据中包含价格和商品名称字段</p>
          </motion.div>
        )}

        {/* ═══ Row 4: Actions + Cross-platform ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Actions */}
          {actions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-white/40 font-medium">行动建议</span>
                <span className="text-[10px] text-white/20">{actions.length} 条</span>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {actions.map(function(act, ai) {
                  return <ActionCardView key={ai} action={act} index={ai} />;
                })}
              </div>
            </motion.div>
          )}

          {/* Cross-platform comparison */}
          {hasMultiPlatform && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
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

          {/* Single platform hint */}
          {!hasMultiPlatform && currentPlatform && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="rounded-2xl p-5 border border-indigo-500/10 bg-indigo-500/[0.03] flex items-center gap-3"
              style={{ backdropFilter: "blur(16px)" }}>
              <Sparkles className="w-5 h-5 text-indigo-400/40 shrink-0" />
              <div>
                <p className="text-sm text-white/50">
                  当前仅{getPlatformLabel(currentPlatform)}平台数据
                </p>
                <p className="text-xs text-white/25 mt-0.5">上传其他平台数据后将自动展示跨平台利润对比</p>
              </div>
              <Link href="/upload" className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0">
                上传更多 →
              </Link>
            </motion.div>
          )}
        </div>

        {/* ═══ Row 4.5: Evidence Cards ═══ */}
        {evidenceCards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-white/40 font-medium">证据卡</span>
              <span className="text-[10px] text-white/20">{evidenceCards.length} 张</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {evidenceCards.slice(0, 3).map(function(card, ci) {
                return <EvidenceCardView key={ci} card={card} defaultExpanded={ci === 0} />;
              })}
            </div>
            {evidenceCards.length > 3 && (
              <p className="text-[10px] text-white/15 text-center mt-2">
                +{evidenceCards.length - 3} 张更多证据卡 · 切换到 Chat 查看全部
              </p>
            )}
          </motion.div>
        )}

        {/* ═══ Row 5: AI Analysis (auto-expanded from Pipeline) ═══ */}
        {aiSummary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-2xl p-6 border border-white/[0.06]"
            style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.4)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm text-white/40 font-medium">AI 综合分析</h2>
              {decisionChain?.aiExplanation?.confidence !== undefined && (
                <span className={"text-[10px] px-2 py-0.5 rounded-full " + (
                  decisionChain.aiExplanation.confidence >= 0.8 ? "bg-green-500/10 text-green-400/70" :
                  decisionChain.aiExplanation.confidence >= 0.5 ? "bg-amber-500/10 text-amber-400/70" :
                  "bg-red-500/10 text-red-400/70"
                )}>
                  置信度 {Math.round(decisionChain.aiExplanation.confidence * 100)}%
                </span>
              )}
              <span className="text-[10px] text-white/15 ml-auto">
                基于 {evidenceCards.length} 张证据卡 · {diagnoses.length} 条诊断 · {actions.length} 条建议
              </span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </div>
            {/* DecisionChain meta */}
            {decisionChain?.meta && (
              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-4 text-[10px] text-white/20">
                <span>行业: {decisionChain.meta.industry?.name || "—"}</span>
                {decisionChain.meta.pipelineLatency !== undefined && (
                  <span>分析耗时: {(decisionChain.meta.pipelineLatency / 1000).toFixed(1)}s</span>
                )}
                {decisionChain.meta.freshnessScore !== undefined && (
                  <span>知识时效: {Math.round(decisionChain.meta.freshnessScore)}%</span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Data limitation state */}
        {insufficientData && !decisionChain && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="rounded-2xl p-6 border border-amber-500/15 bg-amber-500/[0.03]"
            style={{ backdropFilter: "blur(16px)" }}>
            <p className="text-sm text-amber-300/80 font-medium">当前数据不足以生成完整经营决策</p>
            <p className="text-xs text-white/35 mt-1">{insufficientData.content}</p>
            {insufficientData.limitations.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-white/30 list-disc pl-4">
                {insufficientData.limitations.map(function(item) { return <li key={item}>{item}</li>; })}
              </ul>
            )}
          </motion.div>
        )}

        {/* Pipeline error state */}
        {pipelineError && !decisionChain && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="rounded-2xl p-6 border border-red-500/15 bg-red-500/[0.03]"
            style={{ backdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-4">
              <span className="text-red-400 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm text-red-300/80 font-medium">AI 分析暂时不可用</p>
                <p className="text-xs text-white/30 mt-1">{pipelineError}</p>
              </div>
              <button
                onClick={() => { setPipelineError(""); setDecisionChain(null); setInsufficientData(null); loadData(datasetId); }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/60 hover:text-white/80 transition-colors shrink-0">
                重试
              </button>
            </div>
          </motion.div>
        )}

        {/* Pipeline loading state */}
        {!decisionChain && !insufficientData && !pipelineError && !aiSummary && evidenceCards.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="rounded-2xl p-6 border border-white/[0.04]"
            style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.2)" }}>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400/40 animate-bounce" style={{animationDelay:"0ms"}} />
                <span className="w-2 h-2 rounded-full bg-indigo-400/40 animate-bounce" style={{animationDelay:"150ms"}} />
                <span className="w-2 h-2 rounded-full bg-indigo-400/40 animate-bounce" style={{animationDelay:"300ms"}} />
              </div>
              <span className="text-sm text-white/25">AI 正在分析经营数据并生成诊断...</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
