"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BarChart3, Upload, ArrowRight, TrendingUp, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { SalesTrend } from "@/components/workspace/sales-trend";
import { ProductRank } from "@/components/workspace/product-rank";
import { CategoryBreakdown } from "@/components/workspace/category-breakdown";
import { RegionMap } from "@/components/workspace/region-map";
import { AnomalyDetection } from "@/components/workspace/anomaly-detection";
import { getStore, getDatasetRows } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { RequireAuth } from "@/hooks/use-auth-guard";
import { useObservability } from "@/hooks/use-observability";
import { t } from "@/lib/i18n";
import { useDataFetch } from "@/hooks/use-data-fetch";
import { WorkspaceSkeleton } from "@/components/app/skeleton/workspace-skeleton";
import { DataProvider, useDataContext } from "@/contexts/data-context";
import { EvidenceDetailPanel } from "@/components/insights/evidence-detail-panel";
import { UnifiedTimeline } from "@/components/insights/unified-timeline";
import { AIInsightAnchor } from "@/components/insights/ai-insight-anchor";
import type { DecisionChainResponse } from "@/lib/agent/api-types";
import type { EvidenceCard } from "@/lib/pipeline/types";

function findCol(cols: string[], patterns: RegExp[], exclude?: RegExp[]): string {
  let best = ""; let bestScore = 0;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    if (exclude) { let skip = false; for (let ei = 0; ei < exclude.length; ei++) { if (exclude[ei].test(c)) { skip = true; break; } } if (skip) continue; }
    for (let j = 0; j < patterns.length; j++) {
      if (patterns[j].test(c)) { const score = patterns.length - j; if (score > bestScore) { bestScore = score; best = c; } }
    }
  }
  return best;
}

// ══�?Inner page that consumes DataContext ══�?
function WorkspaceInner() {
  const { user } = useAuth();
  const { state } = useDataContext();
  const [data, setData] = useState<any>(null);
  const [hasData, setHasData] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [aiInsights, setAiInsights] = useState<{ anomalies: string[]; trends: string[]; opportunities: string[] }>({ anomalies: [], trends: [], opportunities: [] });
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [selectedDiagnosisIndex, setSelectedDiagnosisIndex] = useState<number | null>(null);
  const [highlightedChart, setHighlightedChart] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const dsId = state.dataset.activeDatasetId || getStore(user?.id || "").activeId || "";

  const { data: rawData, loading, error, refetch } = useDataFetch(
    ["workspace", user?.id, dsId].join(":"),
    (signal: AbortSignal) => fetchWorkspaceData(signal, user?.id as string, dsId),
    [user?.id, dsId],
    { enabled: !!user?.id }
  );

  // Get AI decision chain from DataContext
  const decisionChain = state.analysis.decisionChain as DecisionChainResponse | null;
  const evidenceCards: EvidenceCard[] = decisionChain?.evidenceCards || [];
  const diagnoses = decisionChain?.diagnoses || [];
  const actions = decisionChain?.actions || [];
  const chainCreatedAt = decisionChain?.analysisRunId || "";

  // Extract lightweight insights for display
  useEffect(function() {
    if (!decisionChain) return;
    var result = { anomalies: [] as string[], trends: [] as string[], opportunities: [] as string[] };
    var diags = decisionChain.diagnoses || [];
    for (var i = 0; i < diags.length; i++) {
      var d = diags[i];
      if (d.level === "critical" || d.level === "warning") {
        result.anomalies.push(d.title + (d.detail ? ": " + d.detail.slice(0, 60) : ""));
      } else if (d.level === "opportunity") {
        result.opportunities.push(d.title + (d.impact ? " (预期: " + d.impact + ")" : ""));
      }
    }
    var acts = decisionChain.actions || [];
    for (var j = 0; j < Math.min(acts.length, 3); j++) {
      if (acts[j].reason) result.trends.push(acts[j].reason.slice(0, 80));
    }
    setAiInsights(result);
  }, [decisionChain]);

  // Build anchor insights from diagnoses
  var anchorInsights = useMemo(function() {
    var insights: Array<{ id: string; type: "anomaly" | "opportunity" | "trend"; title: string; detail?: string; severity: "high" | "medium" | "low"; relatedProduct?: string; chartAnchor?: { chartId: string } }> = [];
    var diags = diagnoses;
    for (var i = 0; i < diags.length; i++) {
      var d = diags[i];
      var severity: "high" | "medium" | "low" = d.level === "critical" ? "high" : d.level === "warning" ? "medium" : "low";
      insights.push({
        id: 'diag-' + i,
        type: d.level === 'opportunity' ? 'opportunity' : 'anomaly',
        title: d.title,
        detail: d.detail,
        severity: severity,
        relatedProduct: d.products && d.products.length > 0 ? d.products[0] : undefined,
        chartAnchor: { chartId: d.level === 'opportunity' ? 'chart-sales-trend' : 'chart-anomaly-detection' },
      });
    }
    return insights;
  }, [diagnoses]);

  // Scroll to related chart when insight anchor is selected
  useEffect(function() {
    if (!selectedInsightId) return;
    var chartId = 'chart-' + selectedInsightId;
    var match = anchorInsights.find(function(ins: any) { return ins.id === selectedInsightId; });
    if (match && match.chartAnchor) {
      chartId = match.chartAnchor.chartId;
    }
    setHighlightedChart(chartId);
    var el = document.getElementById(chartId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-brand/20', 'ring-offset-2');
    }
    var timer = setTimeout(function() { setHighlightedChart(null); }, 2000);
    return function() { clearTimeout(timer); };
  }, [selectedInsightId, anchorInsights]);

  // Scroll to related action when selected from chart
  useEffect(function() {
    if (!selectedActionId) return;
    var el = document.getElementById('action-' + selectedActionId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-brand/20', 'ring-offset-2');
    var timer = setTimeout(function() {
      (el as HTMLElement).classList.remove('ring-2', 'ring-brand/20', 'ring-offset-2');
    }, 2000);
    return function() { clearTimeout(timer); };
  }, [selectedActionId]);



  // Navigate from chart action to related evidence card
  useEffect(function() {
    if (!selectedActionId) return;
    // Find the action that was selected
    var action = (actions || []).find(function(a: any) { return a.actionTaskId === selectedActionId; });
    if (!action) return;
    // Find related evidence card via evidenceRefs
    var refs = action.evidenceRefs || [];
    var cardIndex = refs.length > 0 ? refs[0] : -1;
    if (cardIndex >= 0 && cardIndex < evidenceCards.length) {
      setSelectedCardIndex(cardIndex);
    }
    // Clear after navigation
    var timer = setTimeout(function() { setSelectedActionId(null); }, 3000);
    return function() { clearTimeout(timer); };
  }, [selectedActionId, evidenceCards, actions]);



  useEffect(function() {
    if (rawData) {
      setData(rawData);
      setHasData(true);
    }
  }, [rawData]);

  if (loading && !rawData) return <WorkspaceSkeleton />;
  if (error) {
    return (
      <div className="min-h-screen py-12 pt-20 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-title mb-4">数据加载失败</h2>
          <p className="text-body mb-8">{error.message}</p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={refetch} className="btn-primary">重试</motion.button>
        </motion.div>
      </div>
    );
  }

  if (!hasData || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.7, ease: "easeOut"}} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-brand/10 flex items-center justify-center mb-6"><BarChart3 className="w-10 h-10 text-brand" /></div>
          <h2 className="text-title mb-4 text-primary">{t.workspace.noData}</h2>
          <p className="text-body mb-8">{t.workspace.noDataHint}</p>
          <div className="space-y-3">
            <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="btn-primary text-lg px-8 py-4 rounded-2xl flex items-center gap-2 mx-auto"><Upload className="w-5 h-5" />{t.workspace.uploadData}<ArrowRight className="w-5 h-5" /></motion.button></Link>
            <p className="text-xs text-tertiary">或前往 <Link href="/dashboard" className="text-brand font-medium hover:underline">Dashboard</Link> �?AI 自动分析您的数据</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const cols: string[] = data.columns || [];
  const allRows: any[] = data.rows || [];
  const amtField = findCol(cols, [/实付/, /金额/, /amount/, /价格/, /price/]);
  const dtField = findCol(cols, [/时间/, /日期/, /time/, /date/, /下单/, /order/]);
  const prodField = findCol(cols, [/商品/, /产品/, /标题/, /宝贝/, /name/, /title/], [/店铺/, /shop/]);
  const catField = findCol(cols, [/sku/, /分类/, /规格/, /品类/]);
  const addrField = findCol(cols, [/地址/, /addr/, /收货/, /区域/, /地区/]);

  let rows = allRows;
  if (dtField) {
    rows = allRows.filter((r: any) => {
      const dv = r[dtField]; if (!dv) return true;
      const d = new Date(dv); if (isNaN(d.getTime())) return true;
      const daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= dateRange;
    });
  }

  // Compute metrics
  var metrics = useMemo(function() {
    if (!data) return null;
    var totalRevenue = 0;
    var productSet: Record<string, boolean> = {};
    for (var i = 0; i < rows.length; i++) {
      totalRevenue += Number(rows[i][amtField]) || 0;
      if (prodField && rows[i][prodField]) productSet[String(rows[i][prodField])] = true;
    }
    return { totalRevenue: totalRevenue, orderCount: rows.length, productCount: Object.keys(productSet).length, anomalyCount: aiInsights.anomalies.length };
  }, [data, rows, amtField, prodField, aiInsights]);

  return (
    <RequireAuth>
      <div className="min-h-screen py-12 pt-20">
        <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.7, ease: "easeOut"}} className="page-header">
          <div className="flex items-center gap-3 mb-2">
            <div className="icon-box bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"><BarChart3 className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-title"><span className="gradient-text">{t.workspace.title}</span></h1><p className="text-caption mt-1">{rows.length}/{allRows.length} {t.workspace.records}</p></div>
          </div>
        </motion.div>

        {/* ══�?Key Metrics Strip ══�?*/}
        {metrics && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl p-4 border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(15,15,18,0.38)" }}>总营收</div>
              <div className="text-xl font-extrabold tracking-tight gradient-text">{"¥"}{metrics.totalRevenue.toLocaleString()}</div>
              <div className="text-[10px] mt-1 font-medium" style={{ color: "rgba(15,15,18,0.28)" }}>{metrics.orderCount} 笔订单</div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(15,15,18,0.38)" }}>商品数</div>
              <div className="text-xl font-extrabold tracking-tight text-primary">{metrics.productCount}</div>
              <div className="text-[10px] mt-1 font-medium" style={{ color: "rgba(15,15,18,0.28)" }}>独立 SKU</div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(15,15,18,0.38)" }}>客单价</div>
              <div className="text-xl font-extrabold tracking-tight text-primary">{"¥"}{metrics.orderCount > 0 ? Math.round(metrics.totalRevenue / metrics.orderCount).toLocaleString() : "0"}</div>
              <div className="text-[10px] mt-1 font-medium" style={{ color: "rgba(15,15,18,0.28)" }}>平均每单</div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: metrics.anomalyCount > 0 ? "rgba(220,38,38,0.02)" : "var(--color-bg-surface)", borderColor: metrics.anomalyCount > 0 ? "rgba(220,38,38,0.10)" : "rgba(0,0,0,0.04)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: metrics.anomalyCount > 0 ? "#DC2626" : "rgba(15,15,18,0.38)" }}>AI 异常预警</div>
              <div className="text-xl font-extrabold tracking-tight" style={{ color: metrics.anomalyCount > 0 ? "#DC2626" : "rgba(15,15,18,0.30)" }}>{metrics.anomalyCount}</div>
              <div className="text-[10px] mt-1 font-medium" style={{ color: "rgba(15,15,18,0.28)" }}>{metrics.anomalyCount > 0 ? "需关注" : "暂无异常"}</div>
            </div>
          </motion.div>
        )}

        {/* ══�?AI Insight Banner ══�?*/}
        {(aiInsights.anomalies.length > 0 || aiInsights.opportunities.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6 p-4 rounded-2xl border" style={{ background: "rgba(79,70,229,0.02)", borderColor: "rgba(79,70,229,0.08)" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>AI 洞察摘要</span>
            </div>
            <div className="space-y-1.5">
              {aiInsights.anomalies.slice(0, 2).map(function(a: string, i: number) {
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
                    <span style={{ color: "rgba(15,15,18,0.62)" }}>{a}</span>
                  </div>
                );
              })}
              {aiInsights.opportunities.slice(0, 2).map(function(o: string, i: number) {
                return (
                  <div key={"opp-" + i} className="flex items-start gap-2 text-xs">
                    <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#059669" }} />
                    <span style={{ color: "rgba(15,15,18,0.62)" }}>{o}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══�?Date Filter ══�?*/}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDateRange(d)} className={"px-3 py-2 rounded-md text-xs font-medium transition-all " + (dateRange === d ? "bg-white text-primary shadow-sm" : "text-tertiary hover:text-primary")}>{t.workspace.last}{d}{t.workspace.days}</button>
            ))}
          </div>
        </div>

        {/* ══�?Phase 2: AI Insight Anchors (chart-level linking) ══�?*/}
        {anchorInsights.length > 0 && (
          <AIInsightAnchor
            insights={anchorInsights}
            selectedId={selectedInsightId}
            onSelect={setSelectedInsightId}
          />
        )}

        {/* ══�?Phase 2: Two-column layout with Evidence Panel ══�?*/}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Charts column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-safe md:pb-0">
              <motion.div
                id="chart-sales-trend" style={{ touchAction: "manipulation" }}
                animate={highlightedChart === "chart-sales-trend" ? { boxShadow: "0 0 0 2px rgba(79,70,229,0.25)" } : {}}
                transition={{ duration: 0.3 }}
              >
                <SalesTrend rows={rows} amountField={amtField} orderTimeField={dtField} dateRange={dateRange} aiSummary={aiInsights.trends[0]} evidenceCards={evidenceCards} actions={actions} onNavigateToAction={(action) => setSelectedActionId(action.actionTaskId || null)} />
              </motion.div>
              <motion.div
                id="chart-product-rank" style={{ touchAction: "manipulation" }}
                animate={highlightedChart === "chart-product-rank" ? { boxShadow: "0 0 0 2px rgba(79,70,229,0.25)" } : {}}
                transition={{ duration: 0.3 }}
              >
                <ProductRank rows={rows} productField={prodField} amountField={amtField} aiSummary={aiInsights.anomalies[0]} evidenceCards={evidenceCards} actions={actions} onNavigateToAction={(action) => setSelectedActionId(action.actionTaskId || null)} />
              </motion.div>
              <motion.div
                id="chart-category-breakdown" style={{ touchAction: "manipulation" }}
                animate={highlightedChart === "chart-category-breakdown" ? { boxShadow: "0 0 0 2px rgba(79,70,229,0.25)" } : {}}
                transition={{ duration: 0.3 }}
              >
                <CategoryBreakdown rows={rows} categoryField={catField || prodField} amountField={amtField} evidenceCards={evidenceCards} actions={actions} onNavigateToAction={(action) => setSelectedActionId(action.actionTaskId || null)} />
              </motion.div>
              <motion.div
                id="chart-region-map" style={{ touchAction: "manipulation" }}
                animate={highlightedChart === "chart-region-map" ? { boxShadow: "0 0 0 2px rgba(79,70,229,0.25)" } : {}}
                transition={{ duration: 0.3 }}
              >
                <RegionMap rows={rows} addressField={addrField} amountField={amtField} evidenceCards={evidenceCards} actions={actions} onNavigateToAction={(action) => setSelectedActionId(action.actionTaskId || null)} />
              </motion.div>
              <motion.div
                id="chart-anomaly-detection" style={{ touchAction: "manipulation" }}
                animate={highlightedChart === "chart-anomaly-detection" ? { boxShadow: "0 0 0 2px rgba(79,70,229,0.25)" } : {}}
                transition={{ duration: 0.3 }}
                className="lg:col-span-2"
              >
                <AnomalyDetection rows={rows} amountField={amtField} aiSummary={aiInsights.anomalies[0]} evidenceCards={evidenceCards} actions={actions} onNavigateToAction={(action) => setSelectedActionId(action.actionTaskId || null)} />
              </motion.div>
            </div>
          </div>

          {/* Phase 2: AI Evidence + Timeline sidebar */}
          <div className="space-y-4 md:sticky md:top-24 md:self-start">
            <EvidenceDetailPanel
              cards={evidenceCards}
              diagnoses={diagnoses}
              selectedCardIndex={selectedCardIndex}
              selectedDiagnosisIndex={selectedDiagnosisIndex}
              onSelectCard={setSelectedCardIndex}
              onSelectDiagnosis={setSelectedDiagnosisIndex}
              filterContext={{
                dateRange,
                amountField: amtField,
                productField: prodField,
                categoryField: catField,
                regionField: addrField,
                rowCount: allRows.length,
                filteredRowCount: rows.length,
              }}
            />
            
            {state.loop.rows.length > 0 ? (
              <UnifiedTimeline decisionChain={decisionChain} loopRows={state.loop.rows} />
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: 'rgba(0,0,0,0.04)', background: 'var(--color-bg-surface)' }}>
                <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
                  <Clock className="w-4 h-4" style={{ color: 'rgba(15,15,18,0.25)' }} />
                </div>
                <p className="text-xs text-secondary font-medium">暂无执行复盘数据</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(15,15,18,0.25)' }}>批准并执行行动建议后，执行记录将显示在此处</p>
              </div>
            )}
  
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}

// ══�?Export with DataProvider wrapper ══�?
export default function WorkspacePage() {
  const { user } = useAuth();
  return (
    <DataProvider userId={user?.id || ""}>
      <WorkspaceInner />
    </DataProvider>
  );
}

// ══�?Data Fetcher ══�?
async function fetchWorkspaceData(signal: AbortSignal, userId: string, dsId: string) {
  if (!dsId) return null;
  const localData = getDatasetRows(dsId);
  if (localData && localData.rows.length > 0) {
    return { columns: localData.columns, rows: localData.rows };
  }
  const res = await authFetch("/api/upload?id=" + dsId, { signal });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data || !data.columns) return null;
  return data;
}

