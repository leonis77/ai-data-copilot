"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, ArrowRight, Sparkles, Layers, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { TemplateBadge } from "@/components/ui/template-badge";
import { ColumnSelector } from "@/components/ui/column-selector";
import { SheetPicker } from "@/components/ui/sheet-picker";
import { ColumnMapper } from "@/components/ui/column-mapper";
import { matchTemplate, applyTemplate, templates } from "@/lib/templates";
import type { ColumnMeta } from "@/lib/templates/types";
import { getStore, addDataset } from "@/lib/store";

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
  var [sheets, setSheets] = useState<{name:string;rowCount:number}[]>([]);
  var [selectedSheet, setSelectedSheet] = useState("");
  var [fileData, setFileData] = useState("");
  var [template, setTemplate] = useState<any>(null);

  var clearAll = function() {
    localStorage.removeItem("aicopilot");
    setFile(null); setResult(null); setCols([]); setSheets([]); setSelectedSheet(""); setFileData(""); setTemplate(null);
  };

  var onDrop = useCallback(function(files: File[]) {
    var f = files[0]; if (!f) return;
    var ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") { setError("Only xlsx/xls/csv supported"); return; }
    setError(""); setFile(f); setResult(null); setCols([]); setSheets([]); setTemplate(null);
  }, []);

  var { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"], "text/csv": [".csv"] }, maxFiles: 1 });

  var downloadTemplate = function() {
    var csv = "OrderID,ProductName,Spec,Quantity,Amount,OrderTime,Status,Address,BuyerName\n";
    csv += "Example: ORD001,iPhone 15 Pro,128GB,1,8999,2025-01-15,Completed,Hangzhou,ZhangSan\n";
    var blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "order-template.csv";
    a.click(); URL.revokeObjectURL(url);
  };

  var handleUpload = async function(sheet?: string) {
    if (!file) return; setUploading(true); setError("");
    try {
      var b64 = await fileToBase64(file);
      if (!sheet) setFileData(b64);
      var body: any = { fileName: file.name, fileData: sheet ? fileData : b64 };
      if (sheet) body.sheetName = sheet;
      var res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { var err = await res.json().catch(function() { return {}; }); throw new Error(err.error || "Upload failed"); }
      var data = await res.json();
      if (data.sheets && data.sheets.length > 1 && !sheet) {
        setSheets(data.sheets); setSelectedSheet(data.sheets[0].name); setUploading(false); return;
      }
      setResult(data);
      var tmpl = matchTemplate(data.columns); setTemplate(tmpl);
      var meta = applyTemplate(data.columns, tmpl); setCols(meta);
      addDataset(data.id, file.name, data.rowCount, data.columns);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  var handleConfirm = function() {
    var storeObj = JSON.parse(localStorage.getItem("aicopilot") || "{}");
    storeObj.columnConfig = {
      datasetId: result.id,
      templateId: template ? template.id : null,
      selectedColumns: cols.filter(function(c) { return c.selected; }).map(function(c) { return c.name; }),
    };
    localStorage.setItem("aicopilot", JSON.stringify(storeObj));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen py-12"><div className="max-w-4xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"><Upload className="w-4 h-4 text-primary-light" /><span className="text-sm text-white/60">Data Upload</span></div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4"><span className="gradient-text">Upload Data</span><span className="text-white/90">, Start Analysis</span></h1>
        <p className="text-white/40 text-lg">Supports Excel (.xlsx/.xls) and CSV, drag and drop or click to upload</p>
        <button onClick={clearAll} className="absolute top-0 right-0 px-3 py-1.5 rounded-lg glass text-xs text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1"><Trash2 className="w-3 h-3" />Clear Cache</button>
      </motion.div>

      {sheets.length > 1 && !result && cols.length === 0 ? (
        <motion.div key="sheets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <GlassCard gradient>
            <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center"><Layers className="w-5 h-5 text-accent-cyan" /></div>
              <div><h3 className="font-semibold text-lg">{file?.name || ""}</h3><p className="text-sm text-white/40">Contains {sheets.length} sheets, select which to analyze</p></div>
            </div>
            <SheetPicker sheets={sheets} selected={selectedSheet} onSelect={function(s) { setSelectedSheet(s); }} />
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={function() { setFile(null); setSheets([]); setSelectedSheet(""); setFileData(""); }} className="px-6 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors font-medium">Cancel</button>
              <button onClick={function() { handleUpload(selectedSheet); }} disabled={!selectedSheet} className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">Confirm<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></button>
            </div>
          </GlassCard>
        </motion.div>
      ) : null}

      {!result && cols.length === 0 && sheets.length <= 1 ? (
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
                  <div><p className="font-semibold text-lg text-white/60">{isDragActive ? "Release to upload" : "Drag files here or click to select"}</p><p className="text-sm text-white/30 mt-1">.xlsx .xls .csv, max 50MB</p><button onClick={function(e) { e.stopPropagation(); downloadTemplate(); }} className="mt-4 text-xs text-primary-light/70 hover:text-primary-light transition-colors underline">Download Standard Template (CSV)</button></div>
                </div>
              )}
            </div>
            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-sm text-red-400">{error}</p></motion.div>}
            {file && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex justify-center">
              <button onClick={function() { handleUpload(); }} disabled={uploading} className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">
                {uploading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Parsing...</> : <><Sparkles className="w-5 h-5" />Start Parsing</>}
              </button>
            </motion.div>}
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <GlassCard gradient>
            <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-400" /></div>
              <div><h3 className="font-semibold text-lg">Parse Successful</h3><div className="flex items-center gap-2 mt-1">{template ? <TemplateBadge name={template.name} /> : <span className="text-sm text-white/40">Generic Mode</span>}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-white/[0.03]"><CountUp end={result.rowCount} className="text-2xl font-bold gradient-text block mb-1" /><p className="text-xs text-white/40">Rows</p></div>
              <div className="text-center p-4 rounded-xl bg-white/[0.03]"><CountUp end={cols.length} className="text-2xl font-bold gradient-text block mb-1" /><p className="text-xs text-white/40">Columns</p></div>
            </div>
            {cols.length > 0 && <ColumnSelector columns={cols} onChange={function(c: ColumnMeta[]) { setCols(c); }} />}
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={function() { setFile(null); setResult(null); setCols([]); setTemplate(null); }} className="px-6 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors font-medium">Re-upload</button>
              <button onClick={handleConfirm} disabled={cols.filter(function(c) { return c.selected; }).length === 0} className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25">View Analysis<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div></div>
  );
}
