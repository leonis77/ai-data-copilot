"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SlidersHorizontal, Globe, Shield, Lightbulb, AlertTriangle } from "lucide-react";
import type { ScenarioResult, PriceChangeScenario, PlatformSwitchScenario, StopLossScenario } from "@/lib/engines/scenario-engine";
import { simulatePriceChange, simulatePlatformSwitch, simulateStopLoss } from "@/lib/engines/scenario-engine";
import type { ProfitResult } from "@/lib/profit/engine";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ScenarioPanelProps {
  scenarios: ScenarioResult | undefined;
  profitResults: ProfitResult[];
}

interface InteractiveState {
  productIndex: number;
  priceChangePercent: number;
  targetPlatform: string;
}

// ═══════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════

const PLATFORM_NAMES: Record<string, string> = {
  tmall: "天猫",
  taobao: "淘宝",
  jd: "京东",
  pdd: "拼多多",
  douyin: "抖音",
};

const CONFIDENCE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high:   { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "高置信度" },
  medium: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "中置信度" },
  low:    { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", label: "低置信度" },
};

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function formatMoney(n: number): string {
  if (Math.abs(n) >= 10000) return "¥" + (n / 10000).toFixed(1) + "万";
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(1) + "k";
  return "¥" + n.toFixed(0);
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-emerald-50 text-emerald-600 border-emerald-200",
    medium: "bg-amber-50 text-amber-600 border-amber-200",
    low: "bg-red-50 text-red-500 border-red-200",
  };
  const labels: Record<string, string> = { high: "高", medium: "中", low: "低" };
  return (
    <span className={"text-caption px-2 py-0.5 rounded-lg border font-medium " + (colors[confidence] || colors.medium)}>
      {labels[confidence] || confidence}
    </span>
  );
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════

export default function ScenarioPanel({ scenarios, profitResults }: ScenarioPanelProps) {
  const [interactive, setInteractive] = useState<InteractiveState>({
    productIndex: 0,
    priceChangePercent: 10,
    targetPlatform: "",
  });

  // ── Derived: profitable products for interaction ──
  const interactiveProducts = useMemo(function() {
    if (!profitResults || profitResults.length === 0) return [];
    return profitResults
      .filter(function(p) { return p.netProfitPerItem > 0; })
      .sort(function(a, b) { return b.netProfitMonthly - a.netProfitMonthly; })
      .slice(0, 5);
  }, [profitResults]);

  // ── Derived: available platforms for switching ──
  const availablePlatforms = useMemo(function() {
    const currentPlatform = profitResults[0]?.platformKey || "";
    return Object.keys(PLATFORM_NAMES).filter(function(p) { return p !== currentPlatform; });
  }, [profitResults]);

  // ── Interactive price change recalculation ──
  const interactivePriceScenario = useMemo(function() {
    if (profitResults.length === 0) return null;
    const idx = Math.min(interactive.productIndex, profitResults.length - 1);
    const result = profitResults[idx];
    return simulatePriceChange(result, interactive.priceChangePercent);
  }, [interactive, profitResults]);

  // ── Interactive platform switch recalculation ──
  const interactivePlatformScenario = useMemo(function() {
    if (profitResults.length === 0 || !interactive.targetPlatform) return null;
    const idx = Math.min(interactive.productIndex, profitResults.length - 1);
    const result = profitResults[idx];
    return simulatePlatformSwitch(result, interactive.targetPlatform);
  }, [interactive, profitResults]);

  // ── Stop-loss scenario ──
  const stopLossScenario = useMemo(function() {
    return simulateStopLoss(profitResults);
  }, [profitResults]);

  // ── Pre-generated scenarios from engine ──
  const priceScenarios = useMemo(function() {
    if (!scenarios) return [];
    return scenarios.scenarios.filter(function(s): s is PriceChangeScenario { return s.type === "price_change"; });
  }, [scenarios]);

  const platformScenarios = useMemo(function() {
    if (!scenarios) return [];
    return scenarios.scenarios.filter(function(s): s is PlatformSwitchScenario { return s.type === "platform_switch"; });
  }, [scenarios]);

  const stopLossScenarios = useMemo(function() {
    if (!scenarios) return [];
    return scenarios.scenarios.filter(function(s): s is StopLossScenario { return s.type === "stop_loss"; });
  }, [scenarios]);

  const positiveCount = useMemo(function() {
    if (!scenarios) return 0;
    return scenarios.scenarios.filter(function(s) {
      if (s.type === "price_change") return (s as PriceChangeScenario).profitDelta > 0;
      if (s.type === "platform_switch") return (s as PlatformSwitchScenario).profitDelta > 0;
      if (s.type === "stop_loss") return (s as StopLossScenario).monthlySavings > 0;
      return false;
    }).length;
  }, [scenarios]);

  if (profitResults.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-brand">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <div>
          <h2 className="text-heading font-semibold text-primary tracking-tight leading-tight">场景模拟</h2>
          <p className="text-caption text-tertiary mt-0.5">调整参数，实时预览经营变化</p>
        </div>
        <span className="text-caption text-faint ml-auto">{scenarios ? scenarios.scenarios.length : 0} 个预设场景</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══ Left: Interactive Price Change Simulator ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="card-elevated p-6 hover-lift"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-body font-semibold text-primary tracking-tight">价格调整模拟</h3>
          </div>

          {/* Product selector */}
          <div className="mb-5">
            <label className="text-caption text-tertiary uppercase tracking-widest font-semibold block mb-2">选择商品</label>
            <div className="flex flex-wrap gap-2">
              {profitResults.slice(0, 5).map(function(pr, i) {
                const isActive = interactive.productIndex === i;
                return (
                  <motion.button
                    key={i}
                    onClick={() => setInteractive(function(s) { return { ...s, productIndex: i }; })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={"text-sm px-3 py-1.5 rounded-xl border transition-all duration-200 font-medium " + (
                      isActive
                        ? "border-blue-200 bg-blue-50 text-brand shadow-sm"
                        : "border-gray-200 bg-white text-tertiary hover:text-secondary hover:border-gray-300 hover:bg-gray-50"
                    )}>
                    {pr.productName}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Price change slider */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-caption text-tertiary uppercase tracking-widest font-semibold">调整幅度</label>
              <motion.span
                key={interactive.priceChangePercent}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={"text-sm font-mono font-bold " + (interactive.priceChangePercent >= 0 ? "text-emerald-500" : "text-red-500")}>
                {interactive.priceChangePercent >= 0 ? "+" : ""}{interactive.priceChangePercent}%
              </motion.span>
            </div>
            <div className="relative px-1">
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={interactive.priceChangePercent}
                onChange={function(e) {
                  setInteractive(function(s) { return { ...s, priceChangePercent: Number(e.target.value) }; });
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  accentColor: "#2563EB",
                  background: interactive.priceChangePercent >= 0
                    ? "linear-gradient(to right, rgba(16,185,129,0.4), rgba(16,185,129,0.08))"
                    : "linear-gradient(to left, rgba(239,68,68,0.4), rgba(239,68,68,0.08))",
                }}
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-brand shadow-md pointer-events-none"
                style={{ left: "calc(" + ((interactive.priceChangePercent + 30) / 60 * 100) + "% - 8px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-caption text-faint font-mono">-30%</span>
              <span className="text-caption text-faint font-mono">0%</span>
              <span className="text-caption text-faint font-mono">+30%</span>
            </div>
          </div>

          {/* Results */}
          {interactivePriceScenario && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3">
              {/* Price comparison */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100">
                <div>
                  <div className="text-caption text-faint uppercase tracking-widest font-semibold mb-0.5">原售价</div>
                  <div className="text-body font-mono text-secondary font-semibold">¥{interactivePriceScenario.originalPrice.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2 text-faint">
                  <div className="w-6 h-px bg-gray-200" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300">
            <polyline points="15 3 21 3 21 9" />
            <path d="M21 3L10 14" />
          </svg>
                  <div className="w-6 h-px bg-gray-200" />
                </div>
                <div className="text-right">
                  <div className="text-caption text-faint uppercase tracking-widest font-semibold mb-0.5">新售价</div>
                  <motion.div
                    key={interactivePriceScenario.newPrice.toFixed(2)}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-body font-mono text-primary font-bold">
                    ¥{interactivePriceScenario.newPrice.toFixed(2)}
                  </motion.div>
                </div>
              </div>

              {/* Profit comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.div layout className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                  <div className="text-caption text-faint mb-1 uppercase tracking-widest font-semibold">原月利润</div>
                  <div className={"text-body font-mono font-bold " + (interactivePriceScenario.originalMonthlyProfit >= 0 ? "text-secondary" : "text-red-500")}>
                    {interactivePriceScenario.originalMonthlyProfit >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePriceScenario.originalMonthlyProfit)).toLocaleString()}
                  </div>
                  <div className="text-caption text-faint mt-0.5">利润率 {interactivePriceScenario.originalProfitMargin.toFixed(1)}%</div>
                </motion.div>
                <motion.div layout className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                  <div className="text-caption text-blue-400/70 mb-1 uppercase tracking-widest font-semibold">新月利润</div>
                  <div className={"text-body font-mono font-bold " + (interactivePriceScenario.newMonthlyProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {interactivePriceScenario.newMonthlyProfit >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePriceScenario.newMonthlyProfit)).toLocaleString()}
                  </div>
                  <div className="text-caption text-blue-400/50 mt-0.5">利润率 {interactivePriceScenario.newProfitMargin.toFixed(1)}%</div>
                </motion.div>
              </div>

              {/* Delta */}
              <motion.div layout className={"p-4 rounded-xl border " + (
                interactivePriceScenario.profitDelta >= 0
                  ? "bg-emerald-50/60 border-emerald-100"
                  : "bg-red-50/60 border-red-100"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-caption text-faint uppercase tracking-widest font-semibold">利润变化</span>
                  <ConfidenceBadge confidence={interactivePriceScenario.confidence} />
                </div>
                <div className={"text-xl font-mono font-bold mt-2 tracking-tight " + (interactivePriceScenario.profitDelta >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {interactivePriceScenario.profitDelta >= 0 ? "+" : ""}{interactivePriceScenario.profitDelta.toFixed(0)} 元/月
                  <span className="text-caption ml-1.5 text-faint font-normal">({interactivePriceScenario.profitDeltaPercent >= 0 ? "+" : ""}{interactivePriceScenario.profitDeltaPercent.toFixed(1)}%)</span>
                </div>
              </motion.div>

              {/* Recommendation */}
              <div className="p-4 rounded-xl bg-white border border-gray-100">
                <p className="text-body text-sm leading-relaxed">{interactivePriceScenario.recommendation}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ═══ Right: Platform Switch + Stop Loss ═══ */}
        <div className="space-y-5">
          {/* Platform switch simulator */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="card-elevated p-6 hover-lift"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <h3 className="text-body font-semibold text-primary tracking-tight">跨平台切换模拟</h3>
            </div>

            {/* Platform selector */}
            <div className="mb-5">
              <label className="text-caption text-tertiary uppercase tracking-widest font-semibold block mb-2">
                当前平台：{profitResults[interactive.productIndex]?.platform || "—"}
              </label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map(function(plat) {
                  const isActive = interactive.targetPlatform === plat;
                  return (
                    <motion.button
                      key={plat}
                      onClick={() => setInteractive(function(s) { return { ...s, targetPlatform: plat }; })}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={"text-sm px-3 py-1.5 rounded-xl border transition-all duration-200 font-medium " + (
                        isActive
                          ? "border-sky-200 bg-sky-50 text-sky-600 shadow-sm"
                          : "border-gray-200 bg-white text-tertiary hover:text-secondary hover:border-gray-300 hover:bg-gray-50"
                      )}>
                      {PLATFORM_NAMES[plat] || plat}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Platform switch result */}
            {interactivePlatformScenario ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                    <div className="text-caption text-faint mb-1 uppercase tracking-widest font-semibold">当前平台月利润</div>
                    <div className={"text-body font-mono font-bold " + (interactivePlatformScenario.originalProfit.netProfitMonthly >= 0 ? "text-secondary" : "text-red-500")}>
                      {interactivePlatformScenario.originalProfit.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePlatformScenario.originalProfit.netProfitMonthly)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100">
                    <div className="text-caption text-sky-500/70 mb-1 uppercase tracking-widest font-semibold">
                      切换到{interactivePlatformScenario.toPlatform}月利润
                    </div>
                    <div className={"text-body font-mono font-bold " + (interactivePlatformScenario.switchedProfit.netProfitMonthly >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {interactivePlatformScenario.switchedProfit.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePlatformScenario.switchedProfit.netProfitMonthly)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <motion.div layout className={"p-4 rounded-xl border " + (
                  interactivePlatformScenario.profitDelta >= 0
                    ? "bg-emerald-50/60 border-emerald-100"
                    : "bg-red-50/60 border-red-100"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-faint uppercase tracking-widest font-semibold">利润差异</span>
                    <ConfidenceBadge confidence={interactivePlatformScenario.confidence} />
                  </div>
                  <div className={"text-xl font-mono font-bold mt-2 tracking-tight " + (interactivePlatformScenario.profitDelta >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {interactivePlatformScenario.profitDelta >= 0 ? "+" : ""}{interactivePlatformScenario.profitDelta.toFixed(0)} 元/月
                    <span className="text-caption ml-1.5 text-faint font-normal">({interactivePlatformScenario.profitDeltaPercent >= 0 ? "+" : ""}{interactivePlatformScenario.profitDeltaPercent.toFixed(1)}%)</span>
                  </div>
                </motion.div>

                <div className="p-4 rounded-xl bg-white border border-gray-100">
                  <p className="text-body text-sm leading-relaxed">{interactivePlatformScenario.recommendation}</p>
                </div>
              </motion.div>
            ) : (
              <div className="text-body text-faint text-center py-5 text-sm">
                请选择目标平台查看切换收益
              </div>
            )}
          </motion.div>

          {/* Stop loss scenario */}
          {stopLossScenario.productsToStop.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="card-elevated p-6 border-red-100 hover-lift"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h3 className="text-body font-semibold text-primary tracking-tight">止损模拟</h3>
              </div>

              <div className="space-y-2 mb-4">
                {stopLossScenario.productsToStop.map(function(p, i) {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 border border-red-100">
                      <div>
                        <span className="text-body text-primary font-medium">{p.productName}</span>
                        <span className="text-caption text-faint ml-1.5">{p.platform}</span>
                      </div>
                      <span className="text-body font-mono text-red-500 font-semibold">
                        月亏 ¥{Math.abs(Math.round(p.currentMonthlyLoss)).toLocaleString()}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-white border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-caption text-faint uppercase tracking-widest font-semibold">止损后月收益</span>
                  <ConfidenceBadge confidence={stopLossScenario.confidence} />
                </div>
                <div className="text-lg font-mono font-bold text-emerald-500 tracking-tight">
                  +¥{Math.round(stopLossScenario.monthlySavings).toLocaleString()}/月
                </div>
                <div className="text-caption text-faint mt-1">
                  减少 {stopLossScenario.productsToStop.length} 个亏损品，整体月利润提升 {Math.round(stopLossScenario.overallProfitImprovement / Math.abs(profitResults.reduce(function(s, p) { return s + p.netProfitMonthly; }, 0)) * 100)}%
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-gray-100 mt-3">
                <p className="text-body text-sm leading-relaxed">{stopLossScenario.recommendation}</p>
              </div>
            </motion.div>
          )}

          {/* Pre-generated scenarios summary */}
          {scenarios && scenarios.scenarios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
              className="card p-5 border-gray-100">
              <div className="text-caption text-faint uppercase tracking-widest font-semibold mb-2">AI 预设场景摘要</div>
              <p className="text-body text-sm text-tertiary leading-relaxed whitespace-pre-wrap">{scenarios.summary}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
