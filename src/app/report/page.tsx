"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Download, Upload, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";

export default function ReportPage() {
  const [hasData, setHasData] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = () => {
    try {
      const stored = localStorage.getItem("currentDataset");
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.columns) {
          setHasData(true);
          setDatasetName(data.fileName || data.original_name || "???");
        }
      }
    } catch {} finally { setChecking(false); }
  };
  const generateReport = async () => {
    setGenerating(true);
    try {
      const apiBase = getApiBase();
      const stored = localStorage.getItem("currentDataset");
      if (!stored) { setGenerating(false); return; }
      const dataset = JSON.parse(stored);
      const res = await fetch(apiBase + "/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: dataset.columns || [], rows: dataset.rows || [], datasetName: dataset.fileName || "???" }),
      });
      if (!res.ok) throw new Error("");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AI_Data_Copilot_Report_" + new Date().toISOString().slice(0, 10) + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setGenerated(true);
    } catch {} finally { setGenerating(false); }
  };
  if (checking) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-[400px] glass mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="gradient-text">分析报告</span>
              </h1>
              <p className="text-sm text-white/40">生成专业 PDF 数据分析报告</p>
            </div>
          </div>
        </motion.div>

        {!hasData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-accent-purple/50" />
            </div>
            <h2 className="text-2xl font-bold mb-3">暂无数据可生成报告</h2>
            <p className="text-white/40 mb-8">请先上传数据并完成分析，再生成 PDF 报告</p>
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
        ) : (
          <div className="space-y-6">
            <GlassCard gradient>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">生成 PDF 报告</h2>
                  <p className="text-sm text-white/50 leading-relaxed max-w-lg">
                    基于数据集 <span className="text-primary-light font-medium">{datasetName}</span> 生成专业分析报告，
                    包含数据概览、图表可视化和 AI 分析建议。
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-accent-purple/50" />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "数据概览", desc: "核心指标统计" },
                  { label: "可视化图表", desc: "分类与趋势展示" },
                  { label: "AI 分析建议", desc: "洞察与风险提示" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03]">
                    <CheckCircle className="w-5 h-5 text-green-400/50 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-white/30">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={generateReport}
                  disabled={generating}
                  className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-purple to-primary text-white font-bold text-lg shadow-lg shadow-accent-purple/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:shadow-accent-purple/30"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在生成报告...
                    </>
                  ) : generated ? (
                    <>
                      <Download className="w-5 h-5" />
                      再次下载报告
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      生成并下载 PDF 报告
                    </>
                  )}
                </motion.button>
              </div>

              {generated && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mt-4 text-sm text-green-400/70"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  报告已生成并开始下载
                </motion.p>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
