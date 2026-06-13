"use client";

import { useMemo } from "react";
import { ModuleShell } from "./module-shell";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

function detectAnomalies(rows: any[], amountField: string): { index: number; value: number; zScore: number; row: any }[] {
  if (rows.length < 5) return [];
  const values = rows.map(r => Number(r[amountField]) || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  if (std === 0) return [];
  return values
    .map((v, i) => ({ index: i, value: v, zScore: Math.abs((v - mean) / std), row: rows[i] }))
    .filter(a => a.zScore > 2)
    .sort((a, b) => b.zScore - a.zScore)
    .slice(0, 10);
}

export function AnomalyDetection({ rows, amountField, aiSummary }: { rows: any[]; amountField: string; aiSummary?: string }) {
  const anomalies = useMemo(() => detectAnomalies(rows, amountField), [rows, amountField]);

  return (
    <ModuleShell title="\u5f02\u5e38\u68c0\u6d4b" aiSummary={aiSummary}>
      {anomalies.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/30">\u672a\u68c0\u6d4b\u5230\u663e\u8457\u5f02\u5e38</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-white/40 mb-3">\u68c0\u6d4b\u5230 {anomalies.length} \u6761\u5f02\u5e38\u8bb0\u5f55\uff08Z-score\uff0c\u9608\u503c 2.0\uff09</p>
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + (a.zScore > 3 ? "bg-red-500/20" : "bg-yellow-500/20")}>
                {a.zScore > 3 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm">\u8bb0\u5f55 #{"{"}{a.index + 1}{"}"} | \u91d1\u989d: {"\u00A5"}{"{"}{a.value.toLocaleString()}{"}"}</p>
                <p className="text-xs text-white/40">Z-score: {a.zScore.toFixed(1)} | \u504f\u79bb\u5ea6: {a.zScore > 3 ? "\u8f83\u9ad8" : "\u4e2d\u7b49"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
