"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GitCompare, Upload, ArrowRight, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getStore } from "@/lib/store";

interface DatasetMeta { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string; }

export default function ComparePage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selA, setSelA] = useState("");
  const [selB, setSelB] = useState("");
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(function() {
    const s = getStore();
    if (s.datasets.length > 0) {
      setDatasets(s.datasets); setHasData(true);
      if (s.datasets.length >= 2) { setSelA(s.datasets[0].id); setSelB(s.datasets[1].id); }
      else if (s.datasets.length === 1) { setSelA(s.datasets[0].id); }
    }
  }, []);

  async function doCompare() {
    if (!selA || !selB) return; setComparing(true); setResult(null);
    try {
      const res = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ datasetIdA: selA, datasetIdB: selB }) });
      if (res.ok) { const data = await res.json(); setResult(data); }
    } catch {} finally { setComparing(false); }
  }

  const dsA = datasets.find(function(d) { return d.id === selA; });
  const dsB = datasets.find(function(d) { return d.id === selB; });

  if (!hasData) return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><GitCompare className="w-10 h-10 text-primary-light/50" /></div>
        <h2 className="text-2xl font-bold mb-3">Need at least 2 datasets</h2>
        <p className="text-white/40 mb-8">Please upload multiple data files to compare</p>
        <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />Upload Data<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
      </motion.div>
    </div>
  );

  if (datasets.length < 2) return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><GitCompare className="w-10 h-10 text-primary-light/50" /></div>
        <h2 className="text-2xl font-bold mb-3">Insufficient Data</h2>
        <p className="text-white/40 mb-8">Need at least 2 datasets to compare, currently have {datasets.length}</p>
        <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />Upload More Data<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen py-12"><div className="max-w-6xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center"><GitCompare className="w-5 h-5 text-accent-cyan" /></div>
          <div><h1 className="text-3xl font-bold"><span className="gradient-text">Data Comparison</span></h1><p className="text-sm text-white/40">Compare differences between two datasets</p></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <GlassCard>
          <label className="text-sm text-white/40 mb-2 block">Dataset A</label>
          <select value={selA} onChange={function(e: any) { setSelA(e.target.value); }} className="w-full glass px-4 py-3 rounded-xl text-sm text-white/80 outline-none">
            {datasets.map(function(d) { return <option key={d.id} value={d.id}>{d.originalName} ({d.rowCount} rows)</option>; })}
          </select>
          {dsA && <p className="text-xs text-white/30 mt-2">{dsA.columns.length} cols | {dsA.rowCount} rows</p>}
        </GlassCard>
        <GlassCard>
          <label className="text-sm text-white/40 mb-2 block">Dataset B</label>
          <select value={selB} onChange={function(e: any) { setSelB(e.target.value); }} className="w-full glass px-4 py-3 rounded-xl text-sm text-white/80 outline-none">
            {datasets.map(function(d) { return <option key={d.id} value={d.id}>{d.originalName} ({d.rowCount} rows)</option>; })}
          </select>
          {dsB && <p className="text-xs text-white/30 mt-2">{dsB.columns.length} cols | {dsB.rowCount} rows</p>}
        </GlassCard>
      </div>

      <div className="flex justify-center mb-8">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={doCompare} disabled={!selA || !selB || comparing}
          className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all">
          {comparing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Comparing...</> : <><GitCompare className="w-4 h-4" />Start Comparison</>}
        </motion.button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {result.differences && Object.keys(result.differences).length > 0 && (
            <GlassCard>
              <h3 className="font-semibold text-lg mb-4">Metric Differences</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/5"><th className="text-left py-2 text-white/40 font-medium">Metric</th><th className="text-right py-2 text-white/40 font-medium">{dsA?.originalName || "A"}</th><th className="text-right py-2 text-white/40 font-medium">{dsB?.originalName || "B"}</th><th className="text-right py-2 text-white/40 font-medium">Change</th></tr></thead>
                  <tbody>
                    {Object.entries(result.differences).map(function([key, val]: [string, any]) {
                      return (<tr key={key} className="border-b border-white/5"><td className="py-2 text-white/70">{key}</td><td className="py-2 text-right">{val.a.toLocaleString()}</td><td className="py-2 text-right">{val.b.toLocaleString()}</td><td className={"py-2 text-right font-medium " + (val.delta > 0 ? "text-green-400" : val.delta < 0 ? "text-red-400" : "text-white/40")}>{val.delta > 0 ? "+" : ""}{val.delta.toLocaleString()}</td></tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
          {result.narrative && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-primary-light" /><h3 className="font-semibold">AI Comparison Analysis</h3></div>
              <p className="text-sm text-white/60 leading-relaxed">{result.narrative}</p>
            </GlassCard>
          )}
        </motion.div>
      )}
    </div></div>
  );
}
