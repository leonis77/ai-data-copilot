"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModuleShell } from "./module-shell";
import { AlertTriangle, TrendingUp, X } from "lucide-react";
import { useChartBridge } from "@/hooks/use-chart-bridge";
import type { EvidenceCard } from "@/lib/pipeline/types";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import { t } from "@/lib/i18n";

function detectAnomalies(rows: any[], amountField: string): { index: number; value: number; zScore: number; row: any }[] {
  if (rows.length < 5) return [];
  const values = rows.map(r => Number(r[amountField]) || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  if (std === 0) return [];
  return values.map((v, i) => ({ index: i, value: v, zScore: Math.abs((v - mean) / std), row: rows[i] })).filter(a => a.zScore > 2).sort((a, b) => b.zScore - a.zScore).slice(0, 10);
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

export function AnomalyDetection({ rows, amountField, aiSummary, evidenceCards, actions, onNavigateToAction }: { rows: any[]; amountField: string; aiSummary?: string; evidenceCards?: EvidenceCard[]; actions?: PrioritizedAction[]; onNavigateToAction?: (action: PrioritizedAction) => void }) {
  const anomalies = useMemo(() => detectAnomalies(rows, amountField), [rows, amountField]);
  const bridge = useChartBridge();
  const cards = evidenceCards || [];
  const acts = actions || [];
  var selectedAnomaly: { index: number; value: number; zScore: number; row: any } | null = null;
  if (bridge.selected && bridge.selected.type === "anomaly") {
    selectedAnomaly = anomalies.find(function(a) { return String(a.value) === String(bridge.selected!.value); }) || null;
  }

  return (
    <ModuleShell title={t.workspace.anomalyDetection} aiSummary={aiSummary} accent={anomalies.length > 0 ? "red" : "blue"}>
      {anomalies.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-faint mx-auto mb-3" />
          <p className="text-sm text-faint">{t.workspace.noAnomalies}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-tertiary mb-3">{t.workspace.detected} {anomalies.length} {t.workspace.anomalyRecords}</p>
          {anomalies.map((a, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                bridge.selectDataPoint({ type: "anomaly", label: (a.row && a.row[Object.keys(a.row)[0]]) || (t.workspace.record + " " + (a.index + 1)), value: a.value }, cards, acts);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm text-left"
              style={{ background: a.zScore > 3 ? "rgba(220,38,38,0.02)" : "rgba(217,119,6,0.02)", borderColor: a.zScore > 3 ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)" }}
            >
              <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + (a.zScore > 3 ? "bg-red-500/10" : "bg-amber-500/10")}>
                {a.zScore > 3 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{(a.row && a.row[Object.keys(a.row)[0]]) || t.workspace.record + " " + (a.index + 1)}</p>
                <p className="text-xs text-tertiary mt-0.5">{t.workspace.amount}{"¥"}{a.value.toLocaleString()} · Z-Score {a.zScore.toFixed(1)}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0" style={{
                background: a.zScore > 3 ? "rgba(220,38,38,0.05)" : "rgba(217,119,6,0.05)",
                color: a.zScore > 3 ? "#DC2626" : "#B45309",
                borderColor: a.zScore > 3 ? "rgba(220,38,38,0.12)" : "rgba(217,119,6,0.12)",
              }}>
                {a.zScore > 3 ? "严重" : "偏高"}
              </span>
            </motion.button>
          ))}
        </div>
      )}
      <AnimatePresence>
        {selectedAnomaly && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-4 p-4 rounded-xl border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>异常详情</div>
              <button onClick={bridge.clearSelection} className="p-1 rounded-md hover:bg-gray-100" style={{ color: "rgba(15,15,18,0.30)" }}><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="text-sm font-bold text-primary">{(selectedAnomaly.row && selectedAnomaly.row[Object.keys(selectedAnomaly.row)[0]]) || ""}</div>
            <div className="text-lg font-extrabold gradient-text mt-1">{"¥"}{selectedAnomaly.value.toLocaleString()}</div>
            <div className="text-[10px] mt-1 font-medium" style={{ color: "rgba(15,15,18,0.45)" }}>Z-Score: {selectedAnomaly.zScore.toFixed(2)}</div>
            {cards.length > 0 && (
              <div className="mt-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.45)" }}>
                关联证据卡: {cards.slice(0, 2).map((c) => c.productName).join(", ")}
              </div>
            )}
            {acts.length > 0 && (
              <div className="mt-1 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.45)" }}>
                相关行动: {acts.length} 个
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ModuleShell>
  );
}
