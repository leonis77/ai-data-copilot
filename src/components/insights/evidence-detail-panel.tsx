"use client";

import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, AlertTriangle, Zap, ExternalLink, X, Filter, Hash, TrendingUp } from "lucide-react";
import type { EvidenceCard } from "@/lib/pipeline/types";

interface EvidenceDetailPanelProps {
  cards: EvidenceCard[];
  diagnoses: any[];
  selectedCardIndex?: number | null;
  selectedDiagnosisIndex?: number | null;
  onSelectCard?: (index: number | null) => void;
  onSelectDiagnosis?: (index: number | null) => void;
  filterContext?: {
    dateRange: number;
    amountField: string;
    productField: string;
    categoryField?: string;
    regionField?: string;
    rowCount: number;
    filteredRowCount: number;
  };
}

const VERDICT_META: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  buy_more: { icon: "📈", label: "加量采购", bg: "rgba(5,150,105,0.05)", text: "#059669", border: "rgba(5,150,105,0.12)" },
  hold:     { icon: "✅", label: "维持现状", bg: "rgba(79,70,229,0.05)", text: "#4F46E5", border: "rgba(79,70,229,0.10)" },
  reduce:   { icon: "⚠️", label: "减少采购", bg: "rgba(180,83,9,0.05)", text: "#B45309", border: "rgba(180,83,9,0.10)" },
  drop:     { icon: "🛑", label: "停止采购", bg: "rgba(220,38,38,0.05)", text: "#DC2626", border: "rgba(220,38,38,0.12)" },
};

const LEVEL_STYLES: Record<string, { icon: React.ReactNode; label: string; bg: string; text: string; border: string }> = {
  critical:     { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "严重", bg: "rgba(220,38,38,0.05)", text: "#DC2626", border: "rgba(220,38,38,0.12)" },
  warning:      { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "警告", bg: "rgba(217,119,6,0.05)", text: "#B45309", border: "rgba(217,119,6,0.12)" },
  opportunity:  { icon: <Zap className="w-3.5 h-3.5" />, label: "机会", bg: "rgba(5,150,105,0.05)", text: "#059669", border: "rgba(5,150,105,0.12)" },
};

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

function formatPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function EvidenceDetailPanel({
  cards,
  diagnoses,
  selectedCardIndex = null,
  selectedDiagnosisIndex = null,
  onSelectCard,
  onSelectDiagnosis,
  filterContext,
}: EvidenceDetailPanelProps) {
  var selectedCard = selectedCardIndex !== null && selectedCardIndex < cards.length ? cards[selectedCardIndex] : null;
  var selectedDiag = selectedDiagnosisIndex !== null && selectedDiagnosisIndex < diagnoses.length ? diagnoses[selectedDiagnosisIndex] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="space-y-4">
      {/* Empty state */}
      {cards.length === 0 && diagnoses.length === 0 && (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed" style={{ borderColor: "rgba(0,0,0,0.04)", background: "var(--color-bg-surface)" }}>
          <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(0,0,0,0.02)" }}>
            <Lightbulb className="w-4 h-4" style={{ color: "rgba(15,15,18,0.20)" }} />
          </div>
          <p className="text-xs text-secondary font-medium">暂无 AI 洞察</p>
          <p className="text-[10px] mt-1" style={{ color: "rgba(15,15,18,0.25)" }}>数据加载后将自动生成诊断与证据</p>
        </div>
      )}
      {/* ═══ Filter Context Badge ═══ */}
      {filterContext && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border" style={{ background: "rgba(0,0,0,0.01)", borderColor: "rgba(0,0,0,0.04)" }}>
          <Filter className="w-3 h-3 shrink-0" style={{ color: "rgba(15,15,18,0.30)" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>分析上下文</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.05)", color: "rgba(15,15,18,0.38)" }}>
            近 {filterContext.dateRange} 天
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.05)", color: "rgba(15,15,18,0.38)" }}>
            {filterContext.amountField}
          </span>
          {filterContext.productField && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.05)", color: "rgba(15,15,18,0.38)" }}>
              {filterContext.productField}
            </span>
          )}
          <span className="text-[10px] font-medium ml-auto" style={{ color: "rgba(15,15,18,0.30)" }}>
            {filterContext.filteredRowCount}/{filterContext.rowCount} 条记录
          </span>
        </div>
      )}

      {/* ═══ Diagnosis List ═══ */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>
            AI 诊断 ({diagnoses.length} 条)
          </div>
          <div className="space-y-2">
            {diagnoses.map(function(d: any, i: number) {
              var levelStyle = LEVEL_STYLES[d.level] || LEVEL_STYLES.warning;
              var isSelected = selectedDiagnosisIndex === i;
              return (
                <button key={i} onClick={() => onSelectDiagnosis?.(isSelected ? null : i)}
                  className={"w-full text-left p-3 rounded-xl border transition-all " + (isSelected ? "shadow-sm" : "hover:shadow-sm")}
                  style={{
                    background: isSelected ? "rgba(79,70,229,0.02)" : "var(--color-bg-surface)",
                    borderColor: isSelected ? "rgba(79,70,229,0.12)" : "rgba(0,0,0,0.04)",
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: levelStyle.bg, color: levelStyle.text, borderColor: levelStyle.border }}>
                      {levelStyle.icon}{levelStyle.label}
                    </span>
                    <span className="text-sm font-medium text-primary flex-1 truncate">{d.title}</span>
                  </div>
                  {d.detail && (
                    <p className="text-xs leading-relaxed mt-1.5 pl-1" style={{ color: "rgba(15,15,18,0.55)" }}>{d.detail}</p>
                  )}
                  {d.impact && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                      <TrendingUp className="w-3 h-3" />
                      <span>预期影响: {d.impact}</span>
                    </div>
                  )}
                  {d.reference && (
                    <div className="mt-2 pt-2 text-[10px] leading-relaxed" style={{ color: "rgba(15,15,18,0.30)", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                      参考: {d.reference}
                    </div>
                  )}
                  {d.products && d.products.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <Hash className="w-3 h-3" style={{ color: "rgba(15,15,18,0.20)" }} />
                      {d.products.slice(0, 5).map(function(p: string, pi: number) {
                        return (
                          <span key={pi} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.38)", border: "1px solid rgba(0,0,0,0.04)" }}>
                            {p}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Evidence Cards List ═══ */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,18,0.38)" }}>
            证据卡 ({cards.length} 张)
          </div>
          <div className="grid grid-cols-1 gap-2">
            {cards.map(function(card: EvidenceCard, i: number) {
              var vm = VERDICT_META[card.verdict] || VERDICT_META.hold;
              var isSelected = selectedCardIndex === i;
              return (
                <button key={i} onClick={() => onSelectCard?.(isSelected ? null : i)}
                  className={"w-full text-left p-3 rounded-xl border transition-all " + (isSelected ? "shadow-sm" : "hover:shadow-sm")}
                  style={{
                    background: isSelected ? vm.bg : "var(--color-bg-surface)",
                    borderColor: isSelected ? vm.border : "rgba(0,0,0,0.04)",
                  }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.05)", color: "rgba(15,15,18,0.30)" }}>
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium text-primary flex-1 truncate">{card.productName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0" style={{ background: vm.bg, color: vm.text, borderColor: vm.border }}>
                      {vm.icon} {vm.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.015)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(15,15,18,0.30)" }}>售价</div>
                      <div className="text-xs font-bold font-mono text-primary">¥{card.sellPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.015)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(15,15,18,0.30)" }}>月利润</div>
                      <div className={"text-xs font-bold font-mono " + (card.profit.netMonthly >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {formatMoney(card.profit.netMonthly)}
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.015)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(15,15,18,0.30)" }}>利润率</div>
                      <div className={"text-xs font-bold font-mono " + (card.profit.margin >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {card.profit.margin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {card.profit.monthOverMonth && (
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-medium" style={{ color: "rgba(15,15,18,0.38)" }}>
                      <span>环比:</span>
                      {card.profit.monthOverMonth.profitDeltaPercent !== undefined && (
                        <span className={"font-bold " + (card.profit.monthOverMonth.profitDeltaPercent >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {formatPct(card.profit.monthOverMonth.profitDeltaPercent)}
                        </span>
                      )}
                    </div>
                  )}
                  {card.costBreakdown && (
                    <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(15,15,18,0.30)" }}>成本构成</div>
                      <div className="flex flex-wrap gap-1">
                        {card.costBreakdown.purchaseCost > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.38)" }}>
                            进货 ¥{card.costBreakdown.purchaseCost.toFixed(0)}
                          </span>
                        )}
                        {card.costBreakdown.commissionFee > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.02)", color: "rgba(15,15,18,0.38)" }}>
                            佣金 ¥{card.costBreakdown.commissionFee.toFixed(0)}
                          </span>
                        )}
                        {card.costBreakdown.totalCost > 0 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.03)", color: "rgba(15,15,18,0.45)" }}>
                            合计 ¥{card.costBreakdown.totalCost.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Selected Detail View ═══ */}
      <AnimatePresence>
        {(selectedCard || selectedDiag) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border overflow-hidden" style={{ background: "rgba(79,70,229,0.015)", borderColor: "rgba(79,70,229,0.08)" }}>
            <div className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(79,70,229,0.5)" }}>深度分析</div>
              {selectedCard && (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(15,15,18,0.62)", whiteSpace: "pre-wrap" }}>{selectedCard.verdictReason}</p>
                  {selectedCard.costAttribution && selectedCard.costAttribution.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(15,15,18,0.38)" }}>成本归因</div>
                      <div className="space-y-1">
                        {selectedCard.costAttribution.slice(0, 6).map(function(a: any, i: number) {
                          return (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <span className="flex-1 truncate" style={{ color: "rgba(15,15,18,0.55)" }}>{a.item}</span>
                              <span className="font-mono font-medium w-12 text-right" style={{ color: "rgba(15,15,18,0.45)" }}>{a.percentage.toFixed(1)}%</span>
                              {a.benchmarkDeviation && (
                                <span className="text-[10px] shrink-0" style={{ color: "#DC2626" }}>{a.benchmarkDeviation}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedCard.industryBenchmark && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(15,15,18,0.38)" }}>行业基准</div>
                      <div className="text-[10px] leading-relaxed" style={{ color: "rgba(15,15,18,0.45)" }}>{selectedCard.industryBenchmark.summary}</div>
                    </div>
                  )}
                </div>
              )}
              {selectedDiag && (
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(15,15,18,0.62)" }}>{selectedDiag.detail}</p>
                  {selectedDiag.action && (
                    <div className="p-2.5 rounded-lg border" style={{ background: "rgba(0,0,0,0.015)", borderColor: "rgba(0,0,0,0.04)" }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(15,15,18,0.38)" }}>建议行动</div>
                      <p className="text-xs" style={{ color: "rgba(15,15,18,0.55)" }}>{selectedDiag.action}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
