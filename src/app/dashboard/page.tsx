"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, TrendingUp, DollarSign, BarChart3, Upload, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { PieChart, BarChart, LineChart } from "@/components/charts";
import { AnalysisPanel } from "@/components/ai/analysis-panel";
import { CardSkeleton, ChartSkeleton, AnalysisSkeleton } from "@/components/ui/skeleton";
import { TableSelector } from "@/components/ui/table-selector";
import { computeStats, buildSummary } from "@/lib/parser";
import type { AnalysisResult, DataStats } from "@/types";

export default function DashboardPage() {
  var [loading, setLoading] = useState(true);
  var [hasData, setHasData] = useState(false);
  var [stats, setStats] = useState<DataStats | null>(null);
  var [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  var [analyzing, setAnalyzing] = useState(false);
  var [datasetName, setDatasetName] = useState("");
  var [datasetId, setDatasetId] = useState("");
  var [datasetData, setDatasetData] = useState<any>(null);
  var [selectedCols, setSelectedCols] = useState<string[]>([]);

  useEffect(function() { loadData(""); }, []);

  function handleSelect(newId: string) { setLoading(true); setAnalysis(null); loadData(newId); }

  async function loadData(dsId: string) {
    try {
      var id = dsId;
      if (!id) {
        var saved = JSON.parse(localStorage.getItem("datasets") || "{}");
        id = saved.activeId || "";
      }
      if (!id) { setLoading(false); return; }
      setDatasetId(id);
      var res = await fetch("/api/upload?id=" + id);
      if (!res.ok) { setLoading(false); return; }
      var data = await res.json();
      if (!data || !data.columns) { setLoading(false); return; }
      // Read column config - only analyze selected columns
      var cfg: any = {}; try { cfg = JSON.parse(localStorage.getItem("columnConfig") || "{}"); } catch (e) {}
      var selCols: string[] = cfg.selectedColumns || data.columns || [];
      if (selCols.length === 0) selCols = data.columns || [];
      setSelectedCols(selCols);
      // Filter rows to selected columns
      var filteredRows = data.rows.map(function(r: any) {
        var o: Record<string, unknown> = {};
        for (var i = 0; i < selCols.length; i++) { o[selCols[i]] = r[selCols[i]]; }
        return o;
      });
      var parsed = computeStats(filteredRows, selCols);
      setDatasetData({ ...data, rows: filteredRows, columns: selCols });
      setStats(parsed);
      setHasData(true);
      setDatasetName(data.original_name || "");
      setLoading(false);
      var ar = await fetch("/api/analyze?dataset=" + id);
      if (ar.ok) { var ad = await ar.json(); if (ad.summary) setAnalysis(ad); }
    } catch { setLoading(false); }
  }

  async function runAnalysis() {
    if (!datasetId) return; setAnalyzing(true);
    try {
      if (!datasetData) return;
      var selCols = selectedCols.length > 0 ? selectedCols : (datasetData.columns || []);
      var filteredRows = datasetData.rows.map(function(r: any) {
        var o: Record<string, unknown> = {};
        for (var i = 0; i < selCols.length; i++) { o[selCols[i]] = r[selCols[i]]; }
        return o;
      });
      var summary = buildSummary(selCols, filteredRows);
      var res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataSummary: summary, question: "" }) });
      if (res.ok) { var ad = await res.json(); setAnalysis(ad); }
    } catch {} finally { setAnalyzing(false); }
  }

  if (loading) return <div className="min-h-screen py-12"><div className="max-w-7xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-4 w-64 skeleton rounded-lg" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">{[1,2,3,4].map(function(i){return <CardSkeleton key={i} />})}</div></div></div>;

  if (!hasData) return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><BarChart3 className="w-10 h-10 text-primary-light/50" /></div>
        <h2 className="text-2xl font-bold mb-3">暂无数据</h2>
        <p className="text-white/40 mb-8">请先上传数据文件</p>
        <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
      </motion.div>
    </div>
  );

  var numStats = stats ? Object.entries(stats.stats)[0] : null;
  var distCols = stats ? Object.keys(stats.distributions) : [];
  var d0 = distCols.length > 0 && stats ? stats.distributions[distCols[0]] : null;
  var d1 = distCols.length > 1 && stats ? stats.distributions[distCols[1]] : null;
  var nk = numStats ? numStats[0] : "";
  var ns = numStats ? numStats[1] : null;

  return (
    <div className="min-h-screen py-12"><div className="max-w-7xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary-light" /></div>
          <div><h1 className="text-3xl font-bold"><span className="gradient-text">数据仪表盘</span></h1></div>
          <TableSelector onSelect={handleSelect} className="ml-auto" />
        </div>
        {datasetName && <p className="text-sm text-white/40 ml-14">{datasetName}{selectedCols.length > 0 && selectedCols.length !== (datasetData?.columns?.length || 99) ? " · 已选 " + selectedCols.length + " 列" : ""}</p>}
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[{ label: "数据总量", value: stats?.rowCount || 0, icon: Package },{ label: "字段数量", value: stats?.columnCount || 0, icon: BarChart3 },{ label: "平均值", value: ns ? Math.round(ns.avg) : 0, icon: DollarSign, prefix: "\u00A5" },{ label: "完整度", value: 98, icon: TrendingUp, suffix: "%" }].map(function(card, i) {
          return <GlassCard key={i} delay={i*0.1}>
            <div className="flex items-start justify-between mb-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><card.icon className="w-5 h-5 text-white/80" /></div></div>
            <CountUp end={card.value} prefix={card.prefix||""} suffix={card.suffix||""} className="text-2xl font-bold block mb-1" /><p className="text-xs text-white/40">{card.label}</p>
          </GlassCard>;
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {d0 && <GlassCard><PieChart title={distCols[0] + " 分布"} data={Object.entries(d0).map(function(e) { return { name: e[0], value: e[1] }; })} /></GlassCard>}
        {d1 && <GlassCard><BarChart title={distCols[1] + " 对比"} data={Object.entries(d1).map(function(e) { return { name: e[0], value: e[1] }; })} /></GlassCard>}
      </div>
      {nk && ns && (
        <div className="mb-8"><GlassCard><LineChart title={nk + " 趋势"} data={[{ name: "最小", value: ns.min },{ name: "25%", value: ns.avg*0.75 },{ name: "平均", value: ns.avg },{ name: "75%", value: ns.avg*1.25 },{ name: "最大", value: ns.max }]} height={350} /></GlassCard></div>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold"><span className="gradient-text">AI 智能分析</span></h2>
          {!analysis && <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={runAnalysis} disabled={analyzing} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-medium text-sm disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">{analyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中</> : <><Sparkles className="w-4 h-4" />开始 AI 分析</>}</motion.button>}
        </div>
        <AnalysisPanel analysis={analysis} loading={analyzing} />
      </div>
    </div></div>
  );
}
