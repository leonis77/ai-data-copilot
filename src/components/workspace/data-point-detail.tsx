"use client";

import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Play, Zap, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import type { EvidenceCard } from "@/lib/pipeline/types";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import type { DataPoint } from "@/hooks/use-chart-bridge";

interface DataPointDetailProps {
  point: DataPoint | null;
  cards: EvidenceCard[];
  actions: PrioritizedAction[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAction?: (action: PrioritizedAction) => void;
}

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; bg: string; text: string; border: string }> = {
  product:   { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "商品", bg: "rgba(79,70,229,0.05)", text: "#4F46E5", border: "rgba(79,70,229,0.12)" },
  category:  { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "品类", bg: "rgba(180,83,9,0.05)", text: "#B45309", border: "rgba(180,83,9,0.12)" },
  region:    { icon: <ExternalLink className="w-3.5 h-3.5" />, label: "地区", bg: "rgba(5,150,105,0.05)", text: "#059669", border: "rgba(5,150,105,0.12)" },
  date:      { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "日期", bg: "rgba(217,119,6,0.05)", text: "#B45309", border: "rgba(217,119,6,0.12)" },
  anomaly:   { icon: <Zap className="w-3.5 h-3.5" />, label: "异常", bg: "rgba(220,38,38,0.05)", text: "#DC2626", border: "rgba(220,38,38,0.12)" },
};

const PRIORITY_META: Record<string, { bg: string; text: string; border: string }> = {
  P0: { bg: "rgba(220,38,38,0.06)", text: "#DC2626", border: "rgba(220,38,38,0.15)" },
  P1: { bg: "rgba(217,119,6,0.06)", text: "#B45309", border: "rgba(217,119,6,0.15)" },
  P2: { bg: "rgba(0,0,0,0.02)", text: "rgba(15,15,18,0.38)", border: "rgba(0,0,0,0.05)" },
};

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

export function DataPointDetail({
  point,
  cards,
  actions,
  isOpen,
  onClose,
  onNavigateToAction,
}: DataPointDetailProps) {
  if (!point) return null;

  var typeMeta = TYPE_META[point.type] || TYPE_META.product;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full lg:w-80 space-y-3"
        >
          {/* Selected Data Point Header */}
          <div className="rounded-xl border p-4" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: typeMeta.bg, color: typeMeta.text, borderColor: typeMeta.border }}>
                  {typeMeta.icon}{typeMeta.label}
                </span>
                <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>已选中</span>
              </div>
              <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-gray-100" style={{ color: "rgba(15,15,18,0.30)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-sm font-bold text-primary truncate mb-1">{point.label}</div>
            <div className="text-xl font-extrabold gradient-text tracking-tight">{"¥"}{point.value.toLocaleString()}</div>
          </div>

          {/* Related Evidence Cards */}
          {cards.length > 0 && (
            <div className="rounded-xl border p-4" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(15,15,18,0.38)" }}>
                关联证据卡 ({cards.length})
              </div>
              <div className="space-y-2">
                {cards.slice(0, 3).map(function(card, i) {
                  var verdictLabel = card.verdict === "buy_more" ? "加量" : card.verdict === "hold" ? "维持" : card.verdict === "reduce" ? "减量" : "止损";
                  var verdictColor = card.verdict === "buy_more" ? "#059669" : card.verdict === "hold" ? "#4F46E5" : card.verdict === "reduce" ? "#B45309" : "#DC2626";
                  return (
                    <div key={i} className="p-3 rounded-lg border" style={{ background: "rgba(0,0,0,0.01)", borderColor: "rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary">{card.productName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: verdictColor, border: "1px solid rgba(0,0,0,0.05)" }}>
                          {verdictLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span style={{ color: "rgba(15,15,18,0.30)" }}>售价</span>
                          <span className="font-mono font-bold text-primary ml-1">¥{card.sellPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span style={{ color: "rgba(15,15,18,0.30)" }}>月利润</span>
                          <span className={"font-mono font-bold ml-1 " + (card.profit.netMonthly >= 0 ? "text-emerald-500" : "text-red-500")}>
                            {formatMoney(card.profit.netMonthly)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Actions - One-Click Execute */}
          {actions.length > 0 && (
            <div className="rounded-xl border p-4" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(15,15,18,0.38)" }}>
                相关行动 ({actions.length})
              </div>
              <div className="space-y-2">
                {actions.map(function(action, i) {
                  var pm = PRIORITY_META[action.priority] || PRIORITY_META.P2;
                  return (
                    <div key={i} className="p-3 rounded-lg border" style={{ background: "rgba(0,0,0,0.01)", borderColor: "rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0" style={{ background: pm.bg, color: pm.text, borderColor: pm.border }}>
                          {action.priority}
                        </span>
                        <span className="text-xs font-medium text-primary flex-1 leading-snug">
                          {action.title || action.action}
                        </span>
                      </div>
                      {action.expectedProfitImpact !== undefined && action.expectedProfitImpact !== 0 && (
                        <div className="text-[10px] font-medium mb-2" style={{ color: "rgba(15,15,18,0.38)" }}>
                          预期收益: <span className="font-mono font-bold" style={{ color: action.expectedProfitImpact >= 0 ? "#059669" : "#DC2626" }}>
                            {action.expectedProfitImpact >= 0 ? "+" : ""}{formatMoney(action.expectedProfitImpact)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {onNavigateToAction ? (
                          <button
                            onClick={() => onNavigateToAction(action)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                            style={{ background: "rgba(79,70,229,0.05)", color: "#4F46E5", border: "1px solid rgba(79,70,229,0.12)" }}
                          >
                            查看详情 <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>
                            请到下方执行复盘开始执行
                          </span>
                        )}
                        {action.actionTaskId && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-50 text-brand border border-blue-200">
                            可执行
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state for no related actions */}
          {cards.length === 0 && actions.length === 0 && (
            <div className="rounded-xl border p-4 text-center" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.30)" }}>
                未找到与该数据点直接关联的行动
              </p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(15,15,18,0.20)" }}>
                请查看下方行动建议或执行复盘看板
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
