"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModuleShell } from "./module-shell";
import { BarChart } from "@/components/charts";
import { useChartBridge, createChartClickHandler } from "@/hooks/use-chart-bridge";
import type { EvidenceCard } from "@/lib/pipeline/types";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";

function rankProducts(rows: any[], productField: string, amountField: string, limit: number): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][productField] || "Unknown");
    const val = Number(rows[i][amountField]) || 0;
    map[name] = (map[name] || 0) + val;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k, v]) => ({ name: k.length > 15 ? k.substring(0, 15) + "..." : k, value: Math.round(v) }));
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

export function ProductRank({ rows, productField, amountField, aiSummary, evidenceCards, actions, onNavigateToAction }: { rows: any[]; productField: string; amountField: string; aiSummary?: string; evidenceCards?: EvidenceCard[]; actions?: PrioritizedAction[]; onNavigateToAction?: (action: PrioritizedAction) => void }) {
  const data = useMemo(() => rankProducts(rows, productField, amountField, 10), [rows, productField, amountField]);
  const bridge = useChartBridge();
  const cards = evidenceCards || [];
  const acts = actions || [];

  const clickHandler = useMemo(function() {
    return createChartClickHandler("product", bridge, cards, acts);
  }, [bridge, cards, acts]);

  return (
    <ModuleShell title={t.workspace.productRank} aiSummary={aiSummary}>
      {data.length > 0 ? <BarChart title={t.workspace.top10Revenue} data={data} height={350} onClick={clickHandler} /> : <p className="text-sm text-faint text-center py-8">{t.workspace.noProductData}</p>}
      <AnimatePresence>
        {bridge.selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-4 p-4 rounded-xl border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>选中商品</div>
              <button onClick={bridge.clearSelection} className="p-1 rounded-md hover:bg-gray-100" style={{ color: "rgba(15,15,18,0.30)" }}><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="text-sm font-bold text-primary">{bridge.selected.label}</div>
            <div className="text-lg font-extrabold gradient-text mt-1">{"¥"}{bridge.selected.value.toLocaleString()}</div>
            {bridge.relatedCards.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {bridge.relatedCards.slice(0, 2).map(function(card, i) {
                  var verdictColor = card.verdict === "buy_more" ? "#059669" : card.verdict === "hold" ? "#4F46E5" : card.verdict === "reduce" ? "#B45309" : "#DC2626";
                  return (
                    <div key={i} className="text-[10px]">
                      <span className="font-bold text-primary">{card.productName}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md border" style={{ background: "rgba(0,0,0,0.02)", color: verdictColor, borderColor: "rgba(0,0,0,0.05)" }}>
                        {card.verdict === "buy_more" ? "加量" : card.verdict === "hold" ? "维持" : card.verdict === "reduce" ? "减量" : "止损"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {bridge.relatedActions.length > 0 && (
              <div className="mt-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.45)" }}>
                {bridge.relatedActions.length > 0 ? bridge.relatedActions.slice(0, 2).map(function(a, i) { return (<span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border cursor-pointer transition-colors hover:bg-brand/5" style={{ color: "#4F46E5", borderColor: "rgba(79,70,229,0.12)" }} onClick={() => onNavigateToAction?.(a)}>查看行动 {i + 1} →</span>); }) : "无相关行动"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ModuleShell>
  );
}
