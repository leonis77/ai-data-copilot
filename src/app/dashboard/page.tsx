"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Upload, ArrowRight, Sparkles, BarChart3, AlertTriangle, Target } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { PieChart, BarChart } from "@/components/charts";
import { CardSkeleton } from "@/components/ui/skeleton";
import { HealthCard } from "@/components/insights/health-card";
import { DecisionCard } from "@/components/insights/decision-card";
import { AIInsightPanel } from "@/components/insights/ai-insight-panel";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore } from "@/lib/store";
import { computeStats } from "@/lib/parser";
import { computeProductMetrics, diagnoseProducts, computeHealthScore, generateActions } from "@/lib/engines";
import { ProcurementPanel } from "@/components/procurement";
import { logger } from "@/lib/logger";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [datasetData, setDatasetData] = useState<any>(null);

  useEffect(function() { loadData(""); }, []);

  function handleSelect(newId: string) { setLoading(true); setAnalysis(null); loadData(newId); }

  async function loadData(dsId: string) {
    try {
      let id = dsId;
      if (!id) { var saved = getStore(); id = saved.activeId || ""; }
      if (!id) { setLoading(false); return; }
      setDatasetId(id);
      var res = await fetch("/api/upload?id=" + id);
      if (!res.ok) { setLoading(false); return; }
      var data = await res.json();
      if (!data || !data.columns) { setLoading(false); return; }
      if (data.rowCount && data.rowCount >= 5000) {
        logger.warn("Large dataset truncated", { rowCount: data.rowCount, limit: 5000 });
        // Show notification handled by parser returning rowCount
      }
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
      setDatasetName(data.original_name || "");
      setLoading(false);
      try {
        var ar = await fetch("/api/analyze?dataset=" + id);
        if (ar.ok) { var ad = await ar.json(); if (ad.summary) setAnalysis(ad); }
      } catch(e) {}
    } catch(e) { setLoading(false); }
  }

  async function runAnalysis() {
    if (!datasetId) return; setAnalyzing(true);
    try {
      var summary = JSON.stringify({ rows: (datasetData?.rows || []).slice(0, 50), columns: datasetData?.columns || [], rowCount: (datasetData?.rows || []).length });
      var ar = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataSummary: summary, question: "" }) });
      if (ar.ok) { var ad = await ar.json(); setAnalysis(ad); }
    } catch(e) { console.error(e); }
    finally { setAnalyzing(false); }
  }

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
          <h2 className="text-2xl font-bold mb-3 text-white/80">{"\u4e0a\u4f20\u6570\u636e\u5f00\u59cb\u5206\u6790"}</h2>
          <p className="text-white/30 mb-10 leading-relaxed">
            {"\u62d6\u62fd\u4e0a\u4f20 Excel \u6216 CSV \u6587\u4ef6"}<br />{"AI \u5c06\u81ea\u52a8\u8bca\u65ad\u60a8\u7684\u7ecf\u8425\u72b6\u51b5"}
          </p>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
              <Upload className="w-5 h-5" />
              {"\u4e0a\u4f20\u6570\u636e"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  function findCol(cols: string[], patterns: RegExp[]): string | undefined {
    for (var i = 0; i < patterns.length; i++) {
      var found = cols.find(function(c) { return patterns[i].test(c); });
      if (found) return found;
    }
    return undefined;
  }

  var productMetrics: any[] = [];
  var diagnosis: any[] = [];
  var healthScore: any = { score: 0 };
  var actions: any[] = [];
  if (datasetData?.rows?.length > 0) {
    try {
      var rows = datasetData.rows;
      var cols = datasetData.columns;
      var nameCol = findCol(cols, [/\u540d\u79f0/, /\u5546\u54c1/, /\u4ea7\u54c1/, /\u6807\u9898/, /\u5b9d\u8d1d/, /name/, /title/, /product/, /item/]);
      var priceCol = findCol(cols, [/\u91d1\u989d/, /\u4ef7\u683c/, /\u5b9e\u4ed8/, /\u603b\u4ef7/, /amount/, /price/, /pay/, /total/, /revenue/]);
      var qtyCol = findCol(cols, [/\u6570\u91cf/, /\u9500\u91cf/, /quantity/, /qty/, /count/, /num/]);
      var stockCol = findCol(cols, [/\u5e93\u5b58/, /stock/, /inventory/]);
      if (nameCol && priceCol) {
        productMetrics = computeProductMetrics(rows, nameCol, priceCol, qtyCol, stockCol);
        diagnosis = diagnoseProducts(productMetrics);
        healthScore = computeHealthScore(productMetrics, diagnosis);
        actions = generateActions(diagnosis);
      }
    } catch(e) {}
  }

  var criticalIssues = diagnosis.filter(function(d: any) { return d.level === "critical"; });
  var numStats = stats ? Object.entries(stats.stats) : [];
  var rankedCols = (numStats as any[]).sort(function(a, b) { return (b[1].max - b[1].min) - (a[1].max - a[1].min); });
  var topMetrics = rankedCols.slice(0, 3);
  var distCols = stats ? Object.keys(stats.distributions) : [];
  var d0 = distCols.length > 0 && stats ? stats.distributions[distCols[0]] : null;

  var dataProfile = "unknown";
  if (datasetData && datasetData.columns) {
    var colsStr = datasetData.columns.join(",").toLowerCase();
    if (/orderId|order|buyer|address|amount|pay|refund|status/.test(colsStr)) dataProfile = "order";
    else if (/sku|supply|category|spec|express|logistics/.test(colsStr) && !/buyer|customer|address/.test(colsStr)) dataProfile = "supply";
  }

  // Supply data rendering
  if (dataProfile === "supply") {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold text-white/90">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {"供货分析"}
                  </span>
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

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Ambient background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, rgba(124,92,255,1) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, rgba(0,212,255,1) 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white/90">
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {"\u7ecf\u8425\u8bca\u65ad"}
                </span>
              </h1>
              {datasetName && <p className="text-sm text-white/30 mt-1">{datasetName}</p>}
            </div>
            <TableSelector onSelect={handleSelect} className="ml-auto" />
          </div>
        </motion.div>

        {/* Level 1: ACTION - Health Score + Decision Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <HealthCard score={healthScore?.score || 0} breakdown={healthScore?.breakdown} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            {actions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm text-white/40 uppercase tracking-widest font-medium">{"\u4eca\u65e5\u6700\u91cd\u8981\u7684\u7ecf\u8425\u52a8\u4f5c"}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {actions.slice(0, 3).map(function(a: any, i: number) {
                    return <DecisionCard key={i} index={i} title={a.action} description={a.reason || ""} impact={a.expected_impact || ""} priority={a.priority || "P1"} />;
                  })}
                </div>
              </div>
            )}

            {/* Level 2: PROBLEMS */}
            {criticalIssues.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="relative overflow-hidden rounded-2xl p-5 border border-red-500/10"
                style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400/70 uppercase tracking-wider font-medium">{"\u5173\u952e\u95ee\u9898"}</span>
                </div>
                <div className="space-y-2">
                  {criticalIssues.map(function(d: any, i: number) {
                    return <div key={i} className="flex items-start gap-2 text-sm"><span className="text-red-400 mt-0.5">{"\u2022"}</span><span className="text-white/60">{d.title}: {d.detail}</span></div>;
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Level 3: DATA - Quick metrics + Charts */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {topMetrics.map(function(entry: any, i: number) {
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative overflow-hidden rounded-xl p-5 border border-white/[0.05]"
                style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}>
                <CountUp end={Math.round(entry[1].avg)} duration={1.2} className="text-2xl font-bold bg-gradient-to-r from-white/90 to-white/50 bg-clip-text text-transparent block mb-1" />
                <p className="text-xs text-white/30">{entry[0]} {"\u5e73\u5747\u503c"}</p>
              </motion.div>
            );
          })}
        </div>

        {d0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8"
            style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.3)", borderRadius: "1rem", padding: "1.5rem", border: "1px solid rgba(255,255,255,0.05)" }}>
            <PieChart title={distCols[0]} data={Object.entries(d0).slice(0, 8).map(function(e) { return { name: e[0] as string, value: e[1] as number }; })} />
          </motion.div>
        )}

        {/* AI Analysis */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm text-white/40 uppercase tracking-widest font-medium">AI {"\u667a\u80fd\u5206\u6790"}</h2>
            </div>
            {!analysis && !analyzing && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={runAnalysis}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all">
                <Sparkles className="w-4 h-4" />
                {"\u5f00\u59cb\u5206\u6790"}
              </motion.button>
            )}
          </div>
          <AIInsightPanel analysis={analysis} loading={analyzing} />
        </motion.div>
      </div>
    </div>
  );
}
