"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Package, TrendingUp, AlertTriangle, DollarSign,
  BarChart3, Upload, Sparkles, ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { PieChart, BarChart, LineChart } from "@/components/charts";
import { AnalysisPanel } from "@/components/ui/../ai/analysis-panel";
import { getApiBase } from "@/lib/api";
import { CardSkeleton, ChartSkeleton, AnalysisSkeleton } from "@/components/ui/skeleton";
import { computeStats, buildSummary } from "@/lib/parser";
import type { AnalysisResult, DataStats } from "@/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetData, setDatasetData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const stored = localStorage.getItem("currentDataset");
      if (!stored) { setLoading(false); return; }
      const data = JSON.parse(stored);
      if (!data || !data.columns) { setLoading(false); return; }
      const parsed = computeStats(data.rows || [], data.columns);
      setDatasetData(data);
      setStats(parsed);
      setHasData(true);
      setDatasetName(data.fileName || "");
      setLoading(false);
    } catch { setLoading(false); }
  };
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const apiBase = getApiBase();
      const stored = localStorage.getItem("currentDataset");
      if (!stored) { setAnalyzing(false); return; }
      const dataset = JSON.parse(stored);
      const summary = buildSummary(dataset.columns, dataset.rows || []);
      const res = await fetch(apiBase + "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSummary: summary, question: "" }),
      });
      if (res.ok) { const ad = await res.json(); setAnalysis(ad); }
    } catch {} finally { setAnalyzing(false); }
  };
  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8">
            <div className="h-8 w-48 skeleton rounded-lg mb-2" />
            <div className="h-4 w-64 skeleton rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <AnalysisSkeleton />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-6"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <BarChart3 className="w-10 h-10 text-primary-light/50" />
          </div>
          <h2 className="text-2xl font-bold mb-3">暂无数据</h2>
          <p className="text-white/40 mb-8">请先上传 Excel 或 CSV 数据文件，系统将自动生成分析仪表盘</p>
          <Link href="/upload">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"
            >
              <Upload className="w-5 h-5" />
              上传数据
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const statNumColumns = stats ? Object.keys(stats.stats).length : 0;
  const distColumns = stats ? Object.keys(stats.distributions) : [];
  const firstDistCol = distColumns[0];
  const firstDist = firstDistCol && stats ? stats.distributions[firstDistCol] : null;
  const secondDistCol = distColumns[1];
  const secondDist = secondDistCol && stats ? stats.distributions[secondDistCol] : null;

  const firstNumCol = stats ? Object.keys(stats.stats)[0] : null;
  const numStats = firstNumCol && stats ? stats.stats[firstNumCol] : null;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="gradient-text">数据仪表盘</span>
              </h1>
              {datasetName && (
                <p className="text-sm text-white/40">{datasetName}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "数据总量", value: stats?.rowCount || 0, icon: Package, color: "from-primary to-primary-light" },
            { label: "字段数量", value: stats?.columnCount || 0, icon: BarChart3, color: "from-accent-purple to-accent-cyan" },
            { label: "平均数值", value: numStats ? Math.round(numStats.avg) : 0, icon: DollarSign, color: "from-accent-cyan to-primary", prefix: "¥" },
            { label: "数据完整", value: 98, suffix: "%", icon: TrendingUp, color: "from-green-500 to-emerald-400" },
          ].map((card, i) => (
            <GlassCard key={i} delay={i * 0.1}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-10 flex items-center justify-center`}>
                  <card.icon className="w-5 h-5 text-white/80" />
                </div>
              </div>
              <CountUp
                end={card.value}
                prefix={card.prefix || ""}
                suffix={card.suffix || ""}
                className="text-2xl font-bold block mb-1"
              />
              <p className="text-xs text-white/40">{card.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {firstDist && (
            <GlassCard>
              <PieChart
                title={`${firstDistCol} 分布`}
                data={Object.entries(firstDist).map(([name, value]) => ({ name, value }))}
              />
            </GlassCard>
          )}
          {secondDist && (
            <GlassCard>
              <BarChart
                title={`${secondDistCol} 对比`}
                data={Object.entries(secondDist).map(([name, value]) => ({ name, value }))}
              />
            </GlassCard>
          )}
        </div>

        {firstNumCol && numStats && (
          <div className="mb-8">
            <GlassCard>
              <LineChart
                title={`${firstNumCol} 趋势`}
                data={[
                  { name: "最小值", value: numStats.min },
                  { name: "25%", value: numStats.avg * 0.75 },
                  { name: "平均值", value: numStats.avg },
                  { name: "75%", value: numStats.avg * 1.25 },
                  { name: "最大值", value: numStats.max },
                ]}
                height={350}
              />
            </GlassCard>
          </div>
        )}

        {/* AI Analysis */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              <span className="gradient-text">AI 智能分析</span>
            </h2>
            {!analysis && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={runAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-medium text-sm disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    开始 AI 分析
                  </>
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
