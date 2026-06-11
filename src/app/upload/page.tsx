"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:...;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    columns: string[];
    rowCount: number;
    summary: string;
    id: string;
  } | null>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "csv" && ext !== "xls") {
      setError("仅支持 .xlsx / .xls / .csv 格式文件");
      return;
    }
    setError("");
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "上传失败");
      }

      const data = await res.json();
      setResult(data);
      localStorage.setItem("currentDataset", JSON.stringify({ ...data, fileName: file.name }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Upload className="w-4 h-4 text-primary-light" />
            <span className="text-sm text-white/60">数据上传</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">上传数据</span>
            <span className="text-white/90">，开始分析</span>
          </h1>
          <p className="text-white/40 text-lg">支持 Excel (.xlsx/.xls) 和 CSV 格式，拖拽或点击上传</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard gradient className="p-10">
                <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="space-y-4"
                    >
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                        {file.name.endsWith(".csv") ? (
                          <FileText className="w-8 h-8 text-accent-cyan" />
                        ) : (
                          <FileSpreadsheet className="w-8 h-8 text-primary-light" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{file.name}</p>
                        <p className="text-sm text-white/40">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <p className="text-xs text-white/30">点击或拖拽更换文件</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center"
                      >
                        <Upload className="w-10 h-10 text-primary-light/50" />
                      </motion.div>
                      <div>
                        <p className="font-semibold text-lg text-white/60">
                          {isDragActive ? "松开以上传文件" : "拖拽文件到此处或点击选择"}
                        </p>
                        <p className="text-sm text-white/30 mt-1">支持 .xlsx .xls .csv，最大 50MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}

                {file && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 flex justify-center"
                  >
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                    >
                      {uploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          解析中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          开始解析
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <GlassCard gradient>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">数据解析成功</h3>
                    <p className="text-sm text-white/40">已识别数据结构，可以进行分析了</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "数据行数", value: result.rowCount },
                    { label: "字段数量", value: result.columns.length },
                    { label: "字段", value: result.columns.length },
                    { label: "数据完整", value: 100, suffix: "%" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-white/[0.03]">
                      <CountUp
                        end={typeof stat.value === "number" ? stat.value : 0}
                        suffix={stat.suffix || ""}
                        className="text-2xl font-bold gradient-text block mb-1"
                      />
                      <p className="text-xs text-white/40">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-white/[0.03]">
                  <h4 className="text-sm font-medium text-white/60 mb-2">字段列表</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.columns.map((col) => (
                      <span key={col} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary-light text-xs font-medium">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-white/[0.03]">
                  <h4 className="text-sm font-medium text-white/60 mb-2">数据摘要</h4>
                  <p className="text-sm text-white/50 leading-relaxed">{result.summary}</p>
                </div>
              </GlassCard>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                  className="px-6 py-3 rounded-xl glass text-white/60 hover:text-white transition-colors font-medium"
                >
                  重新上传
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                >
                  查看分析结果
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}