"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Upload, ArrowRight, Sparkles, BarChart3, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { PieChart, BarChart, LineChart } from "@/components/charts";
import { CardSkeleton } from "@/components/ui/skeleton";
import { HealthCard } from "@/components/insights/health-card";
import { DecisionCard } from "@/components/insights/decision-card";
import { AIInsightPanel } from "@/components/insights/ai-insight-panel";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore } from "@/lib/store";
import { computeStats } from "@/lib/parser";
import { computeProductMetrics, diagnoseProducts, computeHealthScore, generateActions } from "@/lib/engines";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [datasetData, setDatasetData] = useState<any>(null);

  useEffect(() => { loadData(""); }, []);

  function handleSelect(newId: string) { setLoading(true); setAnalysis(null); loadData(newId); }

  async function loadData(dsId: string) {
    try {
      let id = dsId;
      if (!id) { const saved = getStore(); id = saved.activeId || ""; }
      if (!id) { setLoading(false); return; }
      setDatasetId(id);
      const res = await fetch("/api/upload?id=" + id);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      if (!data || !data.columns) { setLoading(false); return; }
      let selCols: string[] = data.columns || [];
      const filteredRows = (data.rows || []).map((r: any) => {
        const o: Record<string, unknown> = {};
        for (let i = 0; i < selCols.length; i++) o[selCols[i]] = r[selCols[i]];
        return o;
      });
      setDatasetData({ ...data, rows: filteredRows, columns: selCols });
      const parsed = computeStats(filteredRows, selCols);
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
    if (!datasetId) return; setAnalyzing(true);
    try {
      const summary = JSON.stringify({ rows: (datasetData?.rows || []).slice(0, 50), columns: datasetData?.columns || [], rowCount: (datasetData?.rows || []).length });
      const ar = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataSummary: summary, question: "" }) });
      if (ar.ok) { const ad = await ar.json(); setAnalysis(ad); }
    } catch (e: any) { console.error(e); }
    finally { setAnalyzing(false); }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-4 w-64 skeleton rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // No data state - elegant empty
  if (!hasData) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-8"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
          >
            <BarChart3 className="w-10 h-10 text-indigo-400/60" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3 text-white/80">????????</h2>
          <p className="text-white/30 mb-10 leading-relaxed">
            ???? Excel ? CSV ??<br />AI ???????????
          </p>
          <Link href="/upload">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300"
            >
              <Upload className="w-5 h-5" />
              ????
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Diagnosis engine
  function findCol(cols: string[], patterns: RegExp[]): string | undefined {
    for (const p of patterns) { const found = cols.find(c => p.test(c)); if (found) return found; }
    return undefined;
  }

  let productMetrics: any[] = [];
  let diagnosis: any[] = [];
  let healthScore: any = { score: 0 };
  let actions: any[] = [];
  if (datasetData?.rows?.length > 0) {
    try {
      const rows = datasetData.rows;
      const cols = datasetData.columns;
      const nameCol = findCol(cols, [/name/, /title/, /product/, /item/, /goods/]);
      const priceCol = findCol(cols, [/name/, /title/, /product/, /item/, /goods/]);
      const qtyCol = findCol(cols, [/name/, /title/, /product/, /item/, /goods/]);
      const stockCol = findCol(cols, [/name/, /title/, /product/, /item/, /goods/]);
      if (nameCol && priceCol) {
        productMetrics = computeProductMetrics(rows, nameCol, priceCol, qtyCol, stockCol);
        diagnosis = diagnoseProducts(productMetrics);
        healthScore = computeHealthScore(productMetrics, diagnosis);
        actions = generateActions(diagnosis);
      }
    } catch(e) {}
  }

  const criticalIssues = diagnosis.filter((d: any) => d.level === "critical");
  const opportunities = diagnosis.filter((d: any) => d.level === "opportunity");

  // Stats for quick metrics
  const numStats = stats ? Object.entries(stats.stats) : [];
  const rankedCols = (numStats as any[]).sort((a, b) => (b[1].max - b[1].min) - (a[1].max - a[1].min));
  const topMetrics = rankedCols.slice(0, 3);

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Ambient background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,1) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-[0.02]"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,1) 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white/90">
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  ????
                </span>
              </h1>
              {datasetName && (
                <p className="text-sm text-white/30 mt-1">{datasetName}</p>
              )}
            </div>
            <TableSelector onSelect={handleSelect} className="ml-auto" />
          </div>
        </motion.div>

        {/* Main Grid: Health + Quick Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Health Score Card */}
          <div className="lg:col-span-1">
            <HealthCard score={healthScore?.score || 0} breakdown={healthScore?.breakdown} />
          </div>

          {/* Right side: Quick stats + Critical issues */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick metric cards */}
            <div className="grid grid-cols-3 gap-3">
              {topMetrics.map((entry: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative overflow-hidden rounded-xl p-5 border border-white/[0.05]"
                  style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}
                >
                  <CountUp end={Math.round(entry[1].avg)} className="text-2xl font-bold bg-gradient-to-r from-white/90 to-white/50 bg-clip-text text-transparent block mb-1" />
                  <p className="text-xs text-white/30">{entry[0]}</p>
                </motion.div>
              ))}
            </div>

            {/* Critical issues */}
            {criticalIssues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative overflow-hidden rounded-2xl p-5 border border-red-500/10"
                style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400/70 uppercase tracking-wider font-medium">????</span>
                </div>
                <div className="space-y-2">
                  {criticalIssues.map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-400 mt-0.5">?</span>
                      <span className="text-white/60">{d.title}: {d.detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Decision Center */}
        {actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm text-white/40 uppercase tracking-widest font-medium">??????????</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actions.slice(0, 4).map((a: any, i: number) => (
                <DecisionCard
                  key={i}
                  index={i}
                  title={a.action}
                  description={a.reason || ""}
                  impact={a.expected_impact || ""}
                  priority={a.priority || "P1"}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm text-white/40 uppercase tracking-widest font-medium">AI ????</h2>
            </div>
            {!analysis && !analyzing && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={runAnalysis}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                ????
              </motion.button>
            )}
          </div>
          <AIInsightPanel analysis={analysis} loading={analyzing} />
        </motion.div>
      </div>
    </div>
  );
}
