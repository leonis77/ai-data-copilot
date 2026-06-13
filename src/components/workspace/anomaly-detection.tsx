"use client";

import { useMemo } from "react";
import { ModuleShell } from "./module-shell";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { t } from "@/lib/i18n";

function detectAnomalies(rows: any[], amountField: string): { index: number; value: number; zScore: number; row: any }[] {
  if (rows.length < 5) return [];
  const values = rows.map(r => Number(r[amountField]) || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  if (std === 0) return [];
  return values.map((v, i) => ({ index: i, value: v, zScore: Math.abs((v - mean) / std), row: rows[i] })).filter(a => a.zScore > 2).sort((a, b) => b.zScore - a.zScore).slice(0, 10);
}

export function AnomalyDetection({ rows, amountField, aiSummary }: { rows: any[]; amountField: string; aiSummary?: string }) {
  const anomalies = useMemo(() => detectAnomalies(rows, amountField), [rows, amountField]);

  return (
    <ModuleShell title={t.workspace.anomalyDetection} aiSummary={aiSummary}>
      {anomalies.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/30">{t.workspace.noAnomalies}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-white/40 mb-3">{t.workspace.detected} {anomalies.length} {t.workspace.anomalyRecords}</p>
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + (a.zScore > 3 ? "bg-red-500/20" : "bg-yellow-500/20")}>
                {a.zScore > 3 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm">{t.workspace.record}{a.index + 1} | {t.workspace.amount}{"¥"}{a.value.toLocaleString()}</p>
                <p className="text-xs text-white/40">{t.workspace.zscore} {a.zScore.toFixed(1)} | {t.workspace.deviation} {a.zScore > 3 ? t.workspace.high : t.workspace.medium}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
