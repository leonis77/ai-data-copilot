"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { TemplateBadge } from "@/components/ui/template-badge";
import { ColumnSelector } from "@/components/ui/column-selector";
import { SheetPicker } from "@/components/ui/sheet-picker";
import type { SheetInfo } from "@/components/ui/sheet-picker";
import { matchTemplate, applyTemplate } from "@/lib/templates";
import type { ColumnMeta } from "@/lib/templates/types";
import { addDataset } from "@/lib/store";
import { classifyByRoles } from "@/lib/classifier";

async function fileToBase64(file: File): Promise<string> {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function() { resolve((reader.result as string).split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function detectProfile(columns: string[], semanticRoles?: any): string {
  if (semanticRoles && semanticRoles.columns && semanticRoles.columns.length > 0) {
    var result = classifyByRoles(semanticRoles.columns);
    if (result.confidence >= 0.5) return result.class;
  }
  var joined = columns.join(",");
  if (/订单|买家|收货|支付|退款|实付|商品标题/.test(joined)) return "order";
  if (/sku|供货|产地|规格|物流|发货地|供应商/.test(joined)) return "supply";
  return "unknown";
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [cols, setCols] = useState<ColumnMeta[]>([]);
  const [template, setTemplate] = useState<any>(null);

  // Multi-sheet state
  const [sheets, setSheets] = useState<SheetInfo[] | null>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [fileDataB64, setFileDataB64] = useState("");

  const clearAll = function() {
    localStorage.removeItem("aicopilot");
    setFile(null); setResult(null); setCols([]); setTemplate(null);
    setSheets(null); setSelectedSheet(""); setFileDataB64("");
  };

  const onDrop = useCallback(function(files: File[]) {
    const f = files[0]; if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setError("仅支持 xlsx / xls / csv"); return;
    }
    setError(""); setFile(f); setResult(null); setCols([]); setTemplate(null);
    setSheets(null); setSelectedSheet(""); setFileDataB64("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"], "text/csv": [".csv"]
    }, maxFiles: 1,
  });

  const downloadTemplate = function() {
    const csv = "﻿订单编号,商品名称,规格,数量,实付金额,下单时间,订单状态,收货地址,买家名称\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "标准订单模板.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const doUpload = async function(sheet?: string) {
    if (!file) return; setUploading(true); setError("");
    try {
      const b64 = fileDataB64 || await fileToBase64(file);
      if (!fileDataB64) setFileDataB64(b64);

      const res = await fetch("/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileData: b64, sheetName: sheet || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(function() { return {}; });
        throw new Error(err.error || "解析失败");
      }
      const data = await res.json();
      if (!data || !data.columns || !Array.isArray(data.columns)) throw new Error("无效响应");

      // Multi-sheet: first upload (no sheetName) returns sheets list
      if (!sheet && data.sheets && Array.isArray(data.sheets) && data.sheets.length > 1) {
        setSheets(data.sheets);
        setSelectedSheet(data.sheets[0].name);
        setUploading(false);
        return;
      }

      // Single sheet or selected sheet -> proceed to column selector
      setSheets(null);
      setResult(data);
      const tmpl = matchTemplate(data.columns) || null; setTemplate(tmpl);
      setCols(applyTemplate(data.columns, tmpl));

      const profile = detectProfile(data.columns, data.semanticRoles);
      addDataset(data.id, file.name, data.rowCount, data.columns, profile, data.semanticRoles);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleUpload = function() { doUpload(); };
  const handleSheetConfirm = function() { doUpload(selectedSheet); };

  const handleConfirm = function() {
    const storeObj = JSON.parse(localStorage.getItem("aicopilot") || "{}");
    storeObj.columnConfig = {
      datasetId: result.id, templateId: template ? template.id : null,
      selectedColumns: cols.filter(function(c) { return c.selected; }).map(function(c) { return c.name; }),
    };
    localStorage.setItem("aicopilot", JSON.stringify(storeObj));
    router.push("/dashboard");
  };

  // ── Sheet selection view ──
  if (sheets && sheets.length > 1) {
    return (
      <div className="min-h-screen py-12 pt-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }} className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">选择工作表</span>
            </h1>
            <p className="text-white/40 text-lg">
              文件包含 {sheets.length} 个工作表，请选择一个进行分析
            </p>
          </motion.div>

          <GlassCard gradient className="p-8">
            <SheetPicker sheets={sheets} selected={selectedSheet} onSelect={setSelectedSheet} />
            <div className="flex justify-center gap-4 mt-8">
              <button onClick={clearAll} className="px-6 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors font-medium">
                重新上传
              </button>
              <button onClick={handleSheetConfirm} disabled={!selectedSheet}
                className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                {uploading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />解析中...</>
                ) : (
                  <>确认选择<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Main upload view ──
  return (
    <div className="min-h-screen py-12 pt-20"><div className="max-w-4xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }} className="text-center mb-12 relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
          <Upload className="w-4 h-4 text-primary-light" />
          <span className="text-sm text-white/60">数据上传</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="gradient-text">上传数据</span>
          <span className="text-white/90">，AI 自动解析</span>
        </h1>
        <p className="text-white/40 text-lg">支持 Excel / CSV，拖拽上传，AI 智能识别表格结构</p>
        <button onClick={clearAll} className="absolute top-0 right-0 px-3 py-1.5 rounded-lg glass text-xs text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1">
          <Trash2 className="w-3 h-3" />清除缓存
        </button>
      </motion.div>

      {!result ? (
        <motion.div key="upload"><GlassCard gradient className="p-6 md:p-10">
          <div {...getRootProps()}
            className={"relative border-2 border-dashed rounded-2xl p-8 md:p-16 text-center cursor-pointer transition-all touch-manipulation " +
              (isDragActive ? "border-indigo-400 bg-indigo-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]")}>
            <input {...getInputProps()} />
            {file ? (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  {file.name.endsWith(".csv")
                    ? <FileText className="w-8 h-8 text-accent-cyan" />
                    : <FileSpreadsheet className="w-8 h-8 text-primary-light" />}
                </div>
                <div>
                  <p className="font-semibold text-lg">{file.name}</p>
                  <p className="text-sm text-white/40">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-primary-light/50" />
                </motion.div>
                <div>
                  <p className="font-semibold text-lg text-white/60">
                    {isDragActive ? "松开上传" : "拖拽文件到此处或点击选择"}
                  </p>
                  <p className="text-sm text-white/30 mt-1">.xlsx .xls .csv，AI 自动识别表格结构</p>
                  <button onClick={function(e) { e.stopPropagation(); downloadTemplate(); }}
                    className="mt-4 text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors underline">
                    下载标准模板 (CSV)
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {file && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex justify-center">
              <button onClick={handleUpload} disabled={uploading}
                className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                {uploading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 解析中...</>
                ) : (
                  <><Sparkles className="w-5 h-5" />开始解析</>
                )}
              </button>
            </motion.div>
          )}
        </GlassCard></motion.div>
      ) : (
        <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="space-y-6">
          <GlassCard gradient>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">解析成功</h3>
                <div className="flex items-center gap-2 mt-1">
                  {template
                    ? <TemplateBadge name={template.name} />
                    : <span className="text-sm text-white/40">通用模式</span>}
                  {selectedSheet && <span className="text-xs text-white/20 ml-2">工作表: {selectedSheet}</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-white/[0.03]">
                <CountUp end={result.rowCount} duration={1.2} className="text-2xl font-bold gradient-text block mb-1" />
                <p className="text-xs text-white/40">行数</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/[0.03]">
                <CountUp end={cols.length} duration={1.2} className="text-2xl font-bold gradient-text block mb-1" />
                <p className="text-xs text-white/40">字段</p>
              </div>
            </div>
            {cols.length > 0 && <ColumnSelector columns={cols} onChange={function(c: ColumnMeta[]) { setCols(c); }} />}
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={function() { setFile(null); setResult(null); setCols([]); setTemplate(null); setSheets(null); }}
                className="px-6 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors font-medium">
                重新上传
              </button>
              <button onClick={handleConfirm}
                disabled={cols.filter(function(c) { return c.selected; }).length === 0}
                className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                查看分析<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div></div>
  );
}
