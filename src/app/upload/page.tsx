"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, ArrowRight, Sparkles, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { TemplateBadge } from "@/components/ui/template-badge";
import { ColumnSelector } from "@/components/ui/column-selector";
import { getSavedDatasets, saveDatasets } from "@/components/ui/table-selector";
import { matchTemplate, applyTemplate, templates } from "@/lib/templates";
import type { ColumnMeta } from "@/lib/templates/types";

async function fileToBase64(file: File): Promise<string> {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve((reader.result as string).split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  var router = useRouter();
  var [file, setFile] = useState<File | null>(null);
  var [uploading, setUploading] = useState(false);
  var [result, setResult] = useState<any>(null);
  var [error, setError] = useState("");
  var [cols, setCols] = useState<ColumnMeta[]>([]);
  var [template, setTemplate] = useState<any>(null);

  var onDrop = useCallback(function(files: File[]) {
    var f = files[0]; if (!f) return;
    var ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") { setError("仅支持 xlsx/xls/csv"); return; }
    setError(""); setFile(f);
  }, []);

  var { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"], "text/csv": [".csv"] }, maxFiles: 1 });

  var handleUpload = async function() {
    if (!file) return; setUploading(true); setError("");
    try {
      var b64 = await fileToBase64(file);
      var res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileData: b64 }) });
      if (!res.ok) { var err = await res.json().catch(function() { return {}; }); throw new Error(err.error || "失败"); }
      var data = await res.json(); setResult(data);

      // Template detection
      var tmpl = matchTemplate(data.columns);
      setTemplate(tmpl);
      var meta = applyTemplate(data.columns, tmpl);
      setCols(meta);

      // Save to dataset list
      var saved = getSavedDatasets();
      saved.activeId = data.id;
      saved.list = saved.list.filter(function(d) { return d.id !== data.id; });
      saved.list.unshift({ id: data.id, originalName: file.name, rowCount: data.rowCount, columns: data.columns, createdAt: new Date().toISOString() });
      if (saved.list.length > 5) saved.list = saved.list.slice(0, 5);
      saveDatasets(saved);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  var handleConfirm = function() {
    // Save column config
    localStorage.setItem("columnConfig", JSON.stringify({
      datasetId: result.id,
      templateId: template ? template.id : null,
      selectedColumns: cols.filter(function(c) { return c.selected; }).map(function(c) { return c.name; }),
      columnMeta: cols,
    }));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"><Upload className="w-4 h-4 text-primary-light" /><span className="text-sm text-white/60">数据上传</span></div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4"><span className="gradient-text">上传数据</span><span className="text-white/90">，开始分析</span></h1>
        <p className="text-white/40 text-lg">支持 Excel (.xlsx/.xls) 和 CSV，拖拽或点击上传</p>
      </motion.div>

      {!result ? (
        <motion.div key="upload" exit={{ opacity: 0, y: -20 }}>
          <GlassCard gradient className="p-10">
            <div {...getRootProps()} className={"relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all " + (isDragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]")}>
              <input {...getInputProps()} />
              {file ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">{file.name.endsWith(".csv") ? <FileText className="w-8 h-8 text-accent-cyan" /> : <FileSpreadsheet className="w-8 h-8 text-primary-light" />}</div>
                  <div><p className="font-semibold text-lg">{file.name}</p><p className="text-sm text-white/40">{(file.size / 1024).toFixed(1)} KB</p></div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center"><Upload className="w-10 h-10 text-primary-light/50" /></motion.div>
                  <div><p className="font-semibold text-lg text-white/60">{isDragActive ? "松开上传" : "拖拽文件到此处或点击选择"}</p><p className="text-sm text-white/30 mt-1">.xlsx .xls .csv，最大 50MB</p></div>
                </div>
              )}
            </div>
            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-sm text-red-400">{error}</p></motion.div>}
            {file && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex justify-center">
              <button onClick={handleUpload} disabled={uploading} className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">
                {uploading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />解析中</> : <><Sparkles className="w-5 h-5" />开始解析</>}
              </button>
            </motion.div>}
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <GlassCard gradient>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-400" /></div>
              <div>
                <h3 className="font-semibold text-lg">解析成功</h3>
                <div className="flex items-center gap-2 mt-1">
                  {template ? <TemplateBadge name={template.name} /> : <span className="text-sm text-white/40">通用模式</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-white/[0.03]">
                <CountUp end={result.rowCount} className="text-2xl font-bold gradient-text block mb-1" />
                <p className="text-xs text-white/40">行数</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/[0.03]">
                <CountUp end={cols.length} className="text-2xl font-bold gradient-text block mb-1" />
                <p className="text-xs text-white/40">字段</p>
              </div>
            </div>

            {cols.length > 0 && (
              <ColumnSelector columns={cols} onChange={function(c: ColumnMeta[]) { setCols(c); }} />
            )}

            <div className="mt-6 flex justify-center gap-4">
              <button onClick={function() { setFile(null); setResult(null); setCols([]); setTemplate(null); }} className="px-6 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors font-medium">重新上传</button>
              <button onClick={handleConfirm} disabled={cols.filter(function(c) { return c.selected; }).length === 0} className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">
                查看分析<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div></div>
  );
}
