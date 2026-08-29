"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModuleShell } from "./module-shell";
import { LineChart } from "@/components/charts";
import { useChartBridge, createChartClickHandler, type DataPointType } from "@/hooks/use-chart-bridge";
import type { EvidenceCard } from "@/lib/pipeline/types";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";

function aggregateByDate(rows: any[], dateField: string, amountField: string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const dv = String(rows[i][dateField] || "");
    const d = dv.substring(0, 10);
    const val = Number(rows[i][amountField]) || 0;
    map[d] = (map[d] || 0) + val;
  }
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ name: k, value: Math.round(v) }));
}

const DATE_TYPE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  date: { icon: null, label: "日期" },
};

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

export function SalesTrend({ rows, amountField, orderTimeField, dateRange, aiSummary, evidenceCards, actions, onNavigateToAction }: { rows: any[]; amountField: string; orderTimeField: string; dateRange: number; aiSummary?: string; evidenceCards?: EvidenceCard[]; actions?: PrioritizedAction[]; onNavigateToAction?: (action: PrioritizedAction) => void }) {
  const data = useMemo(() => aggregateByDate(rows, orderTimeField, amountField), [rows, orderTimeField, amountField]);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const bridge = useChartBridge();
  const cards = evidenceCards || [];
  const acts = actions || [];

  const clickHandler = useMemo(function() {
    return createChartClickHandler("date", bridge, cards, acts);
  }, [bridge, cards, acts]);

  return (
    <ModuleShell title={t.workspace.salesTrend} aiSummary={aiSummary}>
      <div className="mb-4">
        <span className="text-3xl font-bold gradient-text">{"¥"}{total.toLocaleString()}</span>
        <span className="text-sm text-tertiary ml-2">{t.workspace.last}{dateRange}{t.workspace.days}</span>
      </div>
      {data.length > 0 ? (
        <LineChart title={t.workspace.dailySales} data={data} height={300} onClick={clickHandler} />
      ) : (
        <p className="text-sm text-faint text-center py-8">{t.workspace.noTimeData}</p>
      )}
      <AnimatePresence>
        {bridge.selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-4 p-4 rounded-xl border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>选中数据点</div>
              <button onClick={bridge.clearSelection} className="p-1 rounded-md hover:bg-gray-100" style={{ color: "rgba(15,15,18,0.30)" }}><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="text-sm font-bold text-primary">{bridge.selected.label}</div>
            <div className="text-lg font-extrabold gradient-text mt-1">{"¥"}{bridge.selected.value.toLocaleString()}</div>
            {bridge.relatedCards.length > 0 && (
              <div className="mt-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.45)" }}>
                关联证据卡: {bridge.relatedCards.slice(0, 2).map((c) => c.productName).join(", ")}
              </div>
            )}
            {bridge.relatedActions.length > 0 && (
              <div className="mt-1 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.45)" }}>
                {bridge.relatedActions.length > 0 ? bridge.relatedActions.slice(0, 2).map(function(a, i) { return (<span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border cursor-pointer transition-colors hover:bg-brand/5" style={{ color: "#4F46E5", borderColor: "rgba(79,70,229,0.12)" }} onClick={() => onNavigateToAction?.(a)}>查看行动 {i + 1} →</span>); }) : "无相关行动"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ModuleShell>
  );
}
