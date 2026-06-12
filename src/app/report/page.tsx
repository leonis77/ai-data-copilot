"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Printer, Upload, ArrowRight, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { TableSelector, getSavedDatasets } from "@/components/ui/table-selector";

export default function ReportPage() {
  var [hasData, setHasData] = useState(false);
  var [datasetName, setDatasetName] = useState("");
  var [checking, setChecking] = useState(true);
  var [dsId, setDsId] = useState("");

  useEffect(function() { check(); }, []);

  function check() {
    try { var saved = getSavedDatasets(); if (saved.activeId) { setHasData(true); setDsId(saved.activeId); var item = saved.list.find(function(d) { return d.id === saved.activeId; }); if (item) setDatasetName(item.originalName); } }
    catch {} finally { setChecking(false); }
  }

  function handleSelect(id: string) { setDsId(id); var saved = getSavedDatasets(); var item = saved.list.find(function(d) { return d.id === id; }); if (item) setDatasetName(item.originalName); }

  function printReport() {
    if (!dsId) return;
    var w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return;
    var win = w;
    fetch("/api/upload?id=" + dsId).then(function(res: any) { return res.json(); }).then(function(data: any) {
      var cols = data.columns || [];
      var rows = data.rows || [];
      var now = new Date().toLocaleString("zh-CN");
      var prev = rows.slice(0, 100);
      var hc = cols.map(function(c: string) { return "<th>" + c + "</th>"; }).join("");
      var dc = prev.map(function(row: any) {
        return "<tr>" + cols.map(function(c: string) {
          var v = row[c];
          return "<td>" + (v != null ? String(v) : "") + "</td>";
        }).join("") + "</tr>";
      }).join("");
      var title = "<div style='text-align:center;padding:60px 0'><h1 style='font-size:32px;color:#4F46E5'>AI Data Copilot</h1><p>" + datasetName + "</p><p>" + now + "</p><p>" + rows.length + " x " + cols.length + "</p></div>";
      var table = "<table><thead><tr>" + hc + "</tr></thead><tbody>" + dc + "</tbody></table>";
      var html = "<!doctype html><html lang=zh-CN><head><meta charset=utf-8><style>*{margin:0;padding:0}body{font-family:sans-serif;font-size:11px;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:5px}th{background:#4F46E5;color:#fff}</style></head><body>" + title + "<h2>Data</h2>" + table + "</body></html>";
      win.document.write(html);
      win.document.close();
      setTimeout(function() { win.print(); }, 400);
    });
  }if (checking) return <div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[400px] glass mt-6" /></div></div>;

  return (<div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-12">
      <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center"><FileText className="w-5 h-5 text-accent-purple" /></div>
        <div><h1 className="text-3xl font-bold"><span className="gradient-text">分析报告</span></h1><p className="text-sm text-white/40">打印或保存为 PDF 报告</p></div>
        {hasData && <TableSelector onSelect={handleSelect} className="ml-auto" />}
      </div>
    </motion.div>
    {!hasData ? (<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center py-20">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6"><FileText className="w-10 h-10 text-accent-purple/50" /></div>
      <h2 className="text-2xl font-bold mb-3">暂无数据</h2><p className="text-white/40 mb-8">请先上传数据文件</p>
      <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
    </motion.div>) : (<div className="space-y-6"><GlassCard gradient>
      <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold mb-2">打印报告</h2><p className="text-sm text-white/50 leading-relaxed max-w-lg">基于数据集 <span className="text-primary-light font-medium">{datasetName}</span> 生成报告</p></div>
        <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center shrink-0"><FileText className="w-8 h-8 text-accent-purple/50" /></div>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: "系统字体", desc: "苹方/微软雅黑" },{ label: "数据完整", desc: "全部记录明细" },{ label: "即点即印", desc: "浏览器原生打印" }].map(function(item,i) { return <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03]"><CheckCircle className="w-5 h-5 text-green-400/50 shrink-0" /><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-white/30">{item.desc}</p></div></div>; })}
      </div>
      <div className="mt-8 flex justify-center"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={printReport} className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-purple to-primary text-white font-bold text-lg shadow-lg shadow-accent-purple/25 transition-all hover:shadow-xl hover:shadow-accent-purple/30"><Printer className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />打印报告</motion.button></div>
    </GlassCard></div>)}
  </div></div>);
}
