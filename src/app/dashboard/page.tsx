"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, TrendingUp, DollarSign, BarChart3, Upload, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { PieChart, BarChart, LineChart } from "@/components/charts";
import { AnalysisPanel } from "@/components/ai/analysis-panel";
import { CardSkeleton } from "@/components/ui/skeleton";
import { computeProductMetrics, diagnoseProducts, computeHealthScore, generateActions } from "@/lib/engines";
import { HealthCard } from "@/components/insights/health-card";
import { RiskCard } from "@/components/insights/risk-card";
import { OpportunityCard } from "@/components/insights/opportunity-card";
import { ActionCard } from "@/components/insights/action-card";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore } from "@/lib/store";
import { computeStats } from "@/lib/parser";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [datasetData, setDatasetData] = useState<any>(null);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);

  useEffect(() => { loadData(""); }, []);

  function handleSelect(newId: string) { setLoading(true); setAnalysis(null); loadData(newId); }

  async function loadData(dsId: string) {
    try {
      let id = dsId;
      if (!id) {
        const saved = getStore();
        id = saved.activeId || "";
      }
      if (!id) { setLoading(false); return; }
      setDatasetId(id);
      const res = await fetch("/api/upload?id=" + id);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      if (!data || !data.columns) { setLoading(false); return; }

      let cfg: any = {};
      try { cfg = JSON.parse(localStorage.getItem("columnConfig") || "{}"); } catch (e) {}
      let selCols: string[] = cfg.selectedColumns || data.columns || [];
      if (selCols.length === 0) selCols = data.columns || [];
      setSelectedCols(selCols);

      const filteredRows = data.rows.map((r: any) => {
        const o: Record<string, unknown> = {};
        for (let i = 0; i < selCols.length; i++) { o[selCols[i]] = r[selCols[i]]; }
        return o;
      });
      const parsed = computeStats(filteredRows, selCols);
      setDatasetData({ ...data, rows: filteredRows, columns: selCols });
      setStats(parsed);
      setHasData(true);
      setDatasetName(data.original_name || "");
      setLoading(false);

      try {
        const ar = await fetch("/api/analyze?dataset=" + id);
        if (ar.ok) { const ad = await ar.json(); if (ad.summary) setAnalysis(ad); }
      } catch {}
    } catch { setLoading(false); }
  }

  async function runAnalysis() {
    if (!datasetId) return;
    setAnalyzing(true);
    try {
      let data = datasetData;
      if (!data || !data.rows) {
        const res = await fetch("/api/upload?id=" + datasetId);
        if (!res.ok) { setAnalyzing(false); return; }
        data = await res.json();
        setDatasetData(data);
      }
      const summary = JSON.stringify({
        rows: (data.rows || []).slice(0, 50),
        columns: data.columns || [],
        rowCount: (data.rows || []).length,
      });
      const ar = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSummary: summary, question: "" })
      });
      if (ar.ok) { const ad = await ar.json(); setAnalysis(ad); }
    } catch (e) { console.error("runAnalysis error", e); }
    finally { setAnalyzing(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-4 w-64 skeleton rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <BarChart3 className="w-10 h-10 text-primary-light/50" />
          </div>
          <h2 className="text-2xl font-bold mb-3">暂无数据</h2>
          <p className="text-white/40 mb-8">请先上传数据文件</p>
          <Link href="/upload">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25">
              <Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  function findCol(cols: string[], patterns: RegExp[]): string | undefined {
    for (const p of patterns) {
      const found = cols.find(c => p.test(c));
      if (found) return found;
    }
    return undefined;
  }

  const numStats = stats ? Object.entries(stats.stats) : [];
  const distCols = stats ? Object.keys(stats.distributions) : [];
  const rankedCols = numStats.sort((a: any, b: any) => (b[1].max - b[1].min) - (a[1].max - a[1].min));
  const topCols = rankedCols.slice(0, 4);
  const d0 = distCols.length > 0 && stats ? stats.distributions[distCols[0]] : null;
  const d1 = distCols.length > 1 && stats ? stats.distributions[distCols[1]] : null;

  let productMetrics: any[] = [];
  let diagnosis: any[] = [];
  let healthScore: any = null;
  if (datasetData?.rows?.length > 0) {
    try {
      const rows = datasetData.rows || [];
      const cols = datasetData.columns || [];
      const nameCol = findCol(cols, [/名称/, /商品/, /产品/, /name/, /title/]);
      const priceCol = findCol(cols, [/金额/, /价格/, /price/, /amount/, /实付/]);
      const qtyCol = findCol(cols, [/数量/, /quantity/, /qty/]);
      const stockCol = findCol(cols, [/库存/, /stock/]);
      if (nameCol && priceCol) {
        productMetrics = computeProductMetrics(rows, nameCol, priceCol, qtyCol, stockCol);
        diagnosis = diagnoseProducts(productMetrics);
        healthScore = computeHealthScore(productMetrics, diagnosis);
      }
    } catch(e) {}
  }

  const criticalIssues = diagnosis.filter(d => d.level === "critical");
  const warnings = diagnosis.filter(d => d.level === "warning");
  const opportunities = diagnosis.filter(d => d.level === "opportunity");
  const hasDiagnosis = diagnosis.length > 0;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <h1 className="text-3xl font-bold"><span className="gradient-text">经营诊断</span></h1>
            </div>
            <TableSelector onSelect={handleSelect} className="ml-auto" />
          </div>
          {datasetName && <p className="text-sm text-white/40 ml-14">{datasetName}</p>}
        </motion.div>

        {hasDiagnosis ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <HealthCard score={healthScore?.score || 0} breakdown={healthScore?.breakdown} />
              </div>
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                {topCols.map((entry: any, i: number) => {
                  const col = entry[0], s = entry[1];
                  return (
                    <GlassCard key={i} delay={i * 0.1}>
                      <CountUp end={Math.round(s.avg)} className="text-xl font-bold block mb-1" />
                      <p className="text-xs text-white/40">{col}</p>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {criticalIssues.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-400/70 uppercase tracking-wide mb-3">关键问题</h3>
                <div className="space-y-2">
                  {criticalIssues.map((d, i) => <RiskCard key={i} title={d.title} detail={d.detail} level="critical" />)}
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-yellow-400/70 uppercase tracking-wide mb-3">预警</h3>
                <div className="space-y-2">
                  {warnings.map((d, i) => <RiskCard key={i} title={d.title} detail={d.detail} level="warning" />)}
                </div>
              </div>
            )}

            {opportunities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-green-400/70 uppercase tracking-wide mb-3">机会</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {opportunities.map((d, i) => (
                    <OpportunityCard key={i} title={d.title} detail={d.detail} action={d.action} impact={d.impact} />
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const actions = generateActions(diagnosis);
              if (actions.length === 0) return null;
              return (
                <div>
                  <h3 className="text-sm font-medium text-white/50 uppercase tracking-wide mb-3">今日最重要的经营动作</h3>
                  <div className="space-y-2">
                    {actions.slice(0, 5).map((a: any, i: number) => (
                      <ActionCard key={i} title={a.action} target={a.target} priority={a.priority} impact={a.expected_impact} confidence={a.confidence} reason={a.reason} risk={a.risk} index={i} />
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              {d0 && <GlassCard><PieChart title={distCols[0]} data={Object.entries(d0).slice(0, 8).map(([k, v]) => ({ name: k, value: v as number }))} /></GlassCard>}
              {d1 && <GlassCard><BarChart title={distCols[1]} data={Object.entries(d1).slice(0, 8).map(([k, v]) => ({ name: k, value: v as number }))} /></GlassCard>}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {topCols.map((entry: any, i: number) => {
                const col = entry[0], s = entry[1];
                return (
                  <GlassCard key={i} delay={i * 0.1}>
                    <CountUp end={Math.round(s.avg)} className="text-2xl font-bold block mb-1" />
                    <p className="text-xs text-white/40">{col} 平均值</p>
                  </GlassCard>
                );
              })}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {d0 && <GlassCard><PieChart title={distCols[0]} data={Object.entries(d0).slice(0, 8).map(([k, v]) => ({ name: k, value: v as number }))} /></GlassCard>}
              {d1 && <GlassCard><BarChart title={distCols[1]} data={Object.entries(d1).slice(0, 8).map(([k, v]) => ({ name: k, value: v as number }))} /></GlassCard>}
            </div>
          </div>
        )}

        <div className="mb-8 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold"><span className="gradient-text">AI 智能分析</span></h2>
            {!analysis && (
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={runAnalysis} disabled={analyzing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-medium text-sm disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">
                {analyzing ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />开始 AI 分析</>
                )}
              </motion.button>
            )}
          </div>
          <AnalysisPanel analysis={analysis} loading={analyzing} />
        </div>
      </div>
    </div>
  );
}
