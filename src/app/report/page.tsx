"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Printer, Upload, ArrowRight, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore } from "@/lib/store";

export default function ReportPage() {
  const [hasData, setHasData] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [checking, setChecking] = useState(true);
  const [dsId, setDsId] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);

  useEffect(function() { check(); }, []);

  function check() {
    try {
      const s = getStore();
      if (s.activeId && s.datasets.length > 0) {
        setHasData(true); setDsId(s.activeId);
        const item = s.datasets.find(function(d) { return d.id === s.activeId; });
        if (item) setDatasetName(item.originalName);
      }
    } catch(e) {} finally { setChecking(false); }
  }

  function handleSelect(id: string) {
    setDsId(id); setReportLoaded(false); setAiReport("");
    const s = getStore();
    const item = s.datasets.find(function(d) { return d.id === id; });
    if (item) setDatasetName(item.originalName);
  }

  async function generateReport() {
    if (!dsId) return; setLoading(true); setAiReport("");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ datasetId: dsId, question: "Generate a business analysis report" }) });
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      var report = "# AI Business Analysis Report\n\n";
      report += "**Dataset**: " + datasetName + "\n\n";
      if (data.summary) report += "## Overview\n" + data.summary + "\n\n";
      if (data.insights && data.insights.length > 0) { report += "## Key Findings\n"; data.insights.forEach(function(s: any) { report += "- " + s + "\n"; }); report += "\n"; }
      if (data.risks && data.risks.length > 0) { report += "## Risks\n"; data.risks.forEach(function(s: any) { report += "- " + s + "\n"; }); report += "\n"; }
      if (data.suggestions && data.suggestions.length > 0) { report += "## Suggestions\n"; data.suggestions.forEach(function(s: any) { report += "- " + s + "\n"; }); }
      setAiReport(report); setReportLoaded(true);
    } catch(e) {} finally { setLoading(false); }
  }

  function printReport() {
    if (!aiReport) return;
    var h = aiReport.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>").replace(/## (.+)/g,"<h2>$1</h2>");
    var html = "<!DOCTYPE html><html lang=en><head><meta charset=utf-8><style>*{margin:0;padding:0}body{font-family:system-ui,sans-serif;font-size:13px;line-height:1.8;padding:30px 40px;color:#1a1a2e}h1{font-size:24px;color:#4F46E5;margin-bottom:16px}h2{font-size:16px;color:#6366F1;margin:20px 0 8px;border-bottom:1px solid #e0e0e0}@media print{body{padding:15px 25px}}</style></head><body>"+h+"</body></html>";
    var w = window.open("","_blank","width=1200,height=800"); if(!w) return; var ww=w!;
    ww.document.write(html); ww.document.close(); setTimeout(function(){ww.print()},500);
  }

  if (checking) return <div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[400px] glass mt-6" /></div></div>;

  return (
    <div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-12">
        <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center"><FileText className="w-5 h-5 text-accent-purple" /></div>
          <div><h1 className="text-3xl font-bold"><span className="gradient-text">Report</span></h1><p className="text-sm text-white/40">AI-powered business analysis report</p></div>
          {hasData && <TableSelector onSelect={handleSelect} className="ml-auto" />}
        </div>
      </motion.div>
      {!hasData ? (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6"><FileText className="w-10 h-10 text-accent-purple/50" /></div>
          <h2 className="text-2xl font-bold mb-3">No Data</h2><p className="text-white/40 mb-8">Please upload a dataset first</p>
          <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />Upload Data<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
        </motion.div>
      ) : (
        <div className="space-y-6"><GlassCard gradient>
          <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold mb-2">AI Analysis Report</h2><p className="text-sm text-white/50 leading-relaxed max-w-lg">Based on <span className="text-primary-light font-medium">{datasetName}</span></p></div>
            <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center shrink-0"><Sparkles className="w-8 h-8 text-accent-purple/50" /></div>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{label:"AI Analysis",desc:"DeepSeek powered insights"},{label:"Key Metrics",desc:"Summary + risk detection"},{label:"Print Ready",desc:"Browser native PDF output"}].map(function(item,i){return <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03]"><CheckCircle className="w-5 h-5 text-green-400/50 shrink-0" /><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-white/30">{item.desc}</p></div></div>;})}
          </div>
          {!reportLoaded && (
            <div className="mt-8 flex justify-center">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={generateReport} disabled={loading} className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-purple to-primary text-white font-bold text-lg shadow-lg shadow-accent-purple/25 disabled:opacity-50 transition-all hover:shadow-xl hover:shadow-accent-purple/30">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5" />Generate Report</>}
              </motion.button>
            </div>
          )}
          {aiReport && (
            <div className="mt-6 space-y-4">
              <div className="glass p-6 rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-white/70 max-h-96 overflow-y-auto">{aiReport}</div>
              <div className="flex justify-center">
                <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={printReport} className="group flex items-center gap-3 px-8 py-3 rounded-2xl bg-gradient-to-r from-accent-purple to-primary text-white font-bold shadow-lg shadow-accent-purple/25 transition-all hover:shadow-xl hover:shadow-accent-purple/30"><Printer className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />Print Report</motion.button>
              </div>
            </div>
          )}
        </GlassCard></div>
      )}
    </div></div>
  );
}
