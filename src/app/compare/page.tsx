"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GitCompare, Upload, ArrowRight, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

  useEffect(() => {
    const s = getStore();
    if (s.datasets.length > 0) {
      setDatasets(s.datasets);
      setHasData(true);
      if (s.datasets.length >= 2) {
        setSelA(s.datasets[0].id);
        setSelB(s.datasets[1].id);
      } else if (s.datasets.length === 1) {
        setSelA(s.datasets[0].id);
      }
    }
  }, []);

  async function doCompare() {
    if (!selA || !selB) return;
    setComparing(true);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetIdA: selA, datasetIdB: selB })
      });
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setResult(data);
    } catch {} finally { setComparing(false); }
  }

  const dsA = datasets.find(d => d.id === selA);
  const dsB = datasets.find(d => d.id === selB);

  if (!hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <GitCompare className="w-10 h-10 text-primary-light/50" />
          </div>
          <h2 className="text-2xl font-bold mb-3">?????????</h2>
          <p className="text-white/40 mb-8">?????????????????</p>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25">
              <Upload className="w-5 h-5" />????
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (datasets.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <GitCompare className="w-10 h-10 text-primary-light/50" />
          </div>
          <h2 className="text-2xl font-bold mb-3">????</h2>
          <p className="text-white/40 mb-8">???????????????????? {datasets.length} ?</p>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25">
              <Upload className="w-5 h-5" />??????
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <h1 className="text-3xl font-bold"><span className="gradient-text">????</span></h1>
              <p className="text-sm text-white/40">??????????</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <GlassCard>
            <label className="text-sm text-white/40 mb-2 block">??? A</label>
            <select value={selA} onChange={e => setSelA(e.target.value)}
              className="w-full glass px-4 py-3 rounded-xl text-sm text-white/80 outline-none">
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.originalName} ({d.rowCount} ?)</option>
              ))}
            </select>
            {dsA && <p className="text-xs text-white/30 mt-2">{dsA.columns.length} ? | {dsA.rowCount} ?</p>}
          </GlassCard>
          <GlassCard>
            <label className="text-sm text-white/40 mb-2 block">??? B</label>
            <select value={selB} onChange={e => setSelB(e.target.value)}
              className="w-full glass px-4 py-3 rounded-xl text-sm text-white/80 outline-none">
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.originalName} ({d.rowCount} ?)</option>
              ))}
            </select>
            {dsB && <p className="text-xs text-white/30 mt-2">{dsB.columns.length} ? | {dsB.rowCount} ?</p>}
          </GlassCard>
        </div>

        <div className="flex justify-center mb-8">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={doCompare} disabled={!selA || !selB || comparing}
            className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all">
            {comparing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />???...</>
            ) : (
              <><GitCompare className="w-4 h-4" />????</>
            )}
          </motion.button>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {result.differences && Object.keys(result.differences).length > 0 && (
              <GlassCard>
                <h3 className="font-semibold text-lg mb-4">??????</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 text-white/40 font-medium">??</th>
                        <th className="text-right py-2 text-white/40 font-medium">{dsA?.originalName || "A"}</th>
                        <th className="text-right py-2 text-white/40 font-medium">{dsB?.originalName || "B"}</th>
                        <th className="text-right py-2 text-white/40 font-medium">??</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.differences).map(([key, val]: [string, any]) => (
                        <tr key={key} className="border-b border-white/5">
                          <td className="py-2 text-white/70">{key}</td>
                          <td className="py-2 text-right">{val.a.toLocaleString()}</td>
                          <td className="py-2 text-right">{val.b.toLocaleString()}</td>
                          <td className={"py-2 text-right font-medium " + (val.delta > 0 ? "text-green-400" : val.delta < 0 ? "text-red-400" : "text-white/40")}>
                            {val.delta > 0 ? "+" : ""}{val.delta.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}
            {result.narrative && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary-light" />
                  <h3 className="font-semibold">AI ????</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{result.narrative}</p>
              </GlassCard>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
