"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GitCompare, Upload, ArrowRight, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore } from "@/lib/store";
import { CompareCard } from "@/components/ai/compare-card";

export default function ComparePage() {
  var [hasData, setHasData] = useState(function() { var s = getStore(); return s.datasets.length >= 2; });
  var [idA, setIdA] = useState(function() { var s = getStore(); return s.datasets.length >= 2 ? s.datasets[0].id : ""; });
  var [idB, setIdB] = useState(function() { var s = getStore(); return s.datasets.length >= 2 ? s.datasets[1].id : ""; });
  var [comparing, setComparing] = useState(false);
  var [result, setResult] = useState<any>(null);

  function refresh() { var s = getStore(); setHasData(s.datasets.length >= 2); if (s.datasets.length >= 2) { if (!s.datasets.find(function(d: any) { return d.id === idA; })) setIdA(s.datasets[0].id); if (!s.datasets.find(function(d: any) { return d.id === idB; })) setIdB(s.datasets[1].id); } }

  async function doCompare() {
    if (!idA || !idB) return; setComparing(true); setResult(null);
    try {
      var res = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ datasetIdA: idA, datasetIdB: idB }) });
      if (!res.ok) throw new Error("fail");
      var data = await res.json(); setResult(data);
    } catch {} finally { setComparing(false); }
  }

  return (<div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-8">
      <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center"><GitCompare className="w-5 h-5 text-accent-cyan" /></div>
        <div><h1 className="text-3xl font-bold"><span className="gradient-text">表格对比</span></h1><p className="text-sm text-white/40">纵向对比两张表的公共指标</p></div>
      </div>
    </motion.div>
    {!hasData ? (<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center py-20">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-accent-cyan/10 flex items-center justify-center mb-6"><GitCompare className="w-10 h-10 text-accent-cyan/50" /></div>
      <h2 className="text-2xl font-bold mb-3">需要至少 2 张表</h2><p className="text-white/40 mb-8">请先上传两个数据集进行对比</p>
      <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
    </motion.div>) : (<div className="space-y-6">
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="flex-1"><p className="text-xs text-white/40 mb-2">表 A</p><TableSelector onSelect={function(id: string) { setIdA(id); }} /></div>
          <div className="text-white/30 text-lg">vs</div>
          <div className="flex-1"><p className="text-xs text-white/40 mb-2">表 B</p><TableSelector onSelect={function(id: string) { setIdB(id); }} /></div>
        </div>
        <div className="mt-6 flex justify-center">
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={doCompare} disabled={comparing || !idA || !idB} className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-cyan to-primary text-white font-bold text-lg shadow-lg shadow-accent-cyan/25 disabled:opacity-50 transition-all hover:shadow-xl hover:shadow-accent-cyan/30">
            {comparing ? <><Loader2 className="w-5 h-5 animate-spin" />对比中</> : <><GitCompare className="w-5 h-5" />开始对比</>}
          </motion.button>
        </div>
      </GlassCard>
      {result && <GlassCard><CompareCard data={result} /></GlassCard>}
    </div>)}
  </div></div>);
}
