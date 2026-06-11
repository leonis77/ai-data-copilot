"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Printer, Upload, ArrowRight, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

const SK = "currentDataset";

export default function ReportPage() {
  const [hasData, setHasData] = useState(false);
  const [dsName, setDsName] = useState("");
  const [checking, setChecking] = useState(true);
  useEffect(() => { check(); }, []);
  function check() {
    try {
      const r = localStorage.getItem(SK);
      if (!r) { setChecking(false); return; }
      const o = JSON.parse(r);
      if (o && o.columns && o.rows) { setHasData(true); setDsName(o.fileName || "数据集"); }
    } catch {} finally { setChecking(false); }
  }
  function print() {
    const r = localStorage.getItem(SK); if (!r) return;
    const ds = JSON.parse(r);
    const cols = ds.columns || [];
    const rows = ds.rows || [];
    const now = new Date().toLocaleString("zh-CN");
    const prev = rows.slice(0, 100);
    let hc = ""; for (let i = 0; i < cols.length; i++) hc += "<th>" + cols[i] + "</th>";
    let dc = "";
    for (let i = 0; i < prev.length; i++) {
      const row = prev[i]; dc += "<tr>";
      for (let j = 0; j < cols.length; j++) {
        const v = row[cols[j]]; const t = v != null ? String(v) : "";
        dc += "<td>" + esc(t) + "</td>";
      }
      dc += "</tr>";
    }
    const h = bhtml(dsName, now, cols.length, rows.length, prev.length, hc, dc);
    const w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return;
    w.document.write(h); w.document.close(); w.focus();
    setTimeout(function() { w.print(); }, 600);
  }
  if (checking) return <div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[400px] glass mt-6" /></div></div>;
  return (<div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center"><FileText className="w-5 h-5 text-accent-purple" /></div>
        <div><h1 className="text-3xl font-bold"><span className="gradient-text">分析报告</span></h1><p className="text-sm text-white/40">打印或保存为 PDF 报告</p></div>
      </div></motion.div>
    {!hasData ? (<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center py-20">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6"><FileText className="w-10 h-10 text-accent-purple/50" /></div>
      <h2 className="text-2xl font-bold mb-3">暂无数据</h2><p className="text-white/40 mb-8">请先上传数据文件</p>
      <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
    </motion.div>) : (<div className="space-y-6"><GlassCard gradient>
      <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold mb-2">打印报告</h2>
        <p className="text-sm text-white/50 leading-relaxed max-w-lg">基于数据集 <span className="text-primary-light font-medium">{dsName}</span> 生成报告。浏览器打印对话框中选择「另存为 PDF」即可保存。</p></div>
        <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center shrink-0"><FileText className="w-8 h-8 text-accent-purple/50" /></div></div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Item icon={<CheckCircle className="w-5 h-5 text-green-400/50 shrink-0" />} label={"系统字体"} desc={"苹方/微软雅黑，无需加载"} />
        <Item icon={<CheckCircle className="w-5 h-5 text-green-400/50 shrink-0" />} label={"数据完整"} desc={"包含全部记录明细"} />
        <Item icon={<CheckCircle className="w-5 h-5 text-green-400/50 shrink-0" />} label={"即点即印"} desc={"浏览器原生打印引擎"} />
      </div>
      <div className="mt-8 flex justify-center"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={print} className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-purple to-primary text-white font-bold text-lg shadow-lg shadow-accent-purple/25 transition-all duration-300 hover:shadow-xl hover:shadow-accent-purple/30"><Printer className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />打印报告</motion.button></div>
    </GlassCard></div>)}
  </div></div>);
}

function Item({icon, label, desc}: {icon: React.ReactNode; label: string; desc: string}) {
  return <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03]">{icon}<div><p className="text-sm font-medium">{label}</p><p className="text-xs text-white/30">{desc}</p></div></div>;
}

function bhtml(name: string, now: string, cl: number, rl: number, pl: number, hc: string, dc: string): string {
  return "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>AI Data Copilot Report</title><style>" +
    "*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,\x27Segoe UI\x27,\x27PingFang SC\x27,\x27Microsoft YaHei\x27,sans-serif;font-size:11px;color:#1a1a2e;line-height:1.6;padding:24px 32px}" +
    ".cover{text-align:center;padding:60px 0 40px;page-break-after:always}.cover h1{font-size:32px;color:#4F46E5;margin-bottom:8px;font-weight:800}" +
    ".cover .sub{font-size:16px;color:#666;margin-bottom:30px}.cover .meta{font-size:12px;color:#888;line-height:1.8}" +
    "h2{font-size:18px;color:#4F46E5;margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #4F46E5}" +
    "p.hint{font-size:12px;color:#888;margin-bottom:12px}" +
    "table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10px}" +
    "th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;word-break:break-all}" +
    "th{background:#4F46E5;color:#fff;font-weight:700;font-size:11px}" +
    "tr:nth-child(even) td{background:#f8f9ff}@page{margin:15mm}@media print{body{padding:0}}" +
    "</style></head><body>" +
    "<div class=\x27cover\x27><h1>AI Data Copilot</h1><div class=\x27sub\x27>智能数据分析报告</div>" +
    "<div class=\x27meta\x27><div>数据集：" + name + "</div><div>生成时间：" + now + "</div><div>记录数：" + rl + " | 字段数：" + cl + "</div></div></div>" +
    "<h2>数据明细</h2><p class=\x27hint\x27>共 " + rl + " 条记录，显示前 " + pl + " 条</p>" +
    "<table><thead><tr>" + hc + "</tr></thead><tbody>" + dc + "</tbody></table></body></html>";
}

function esc(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
