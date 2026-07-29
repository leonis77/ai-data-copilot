"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, RefreshCw, ArrowUpRight, ArrowDownRight, Crosshair, Zap, Globe, Shield } from "lucide-react";
import type { ProfitResult } from "@/lib/profit/engine";
import type { ScenarioResult, PriceChangeScenario, PlatformSwitchScenario, StopLossScenario } from "@/lib/engines/scenario-engine";
import { simulatePriceChange, simulatePlatformSwitch, simulateStopLoss, buildAllScenarios } from "@/lib/engines/scenario-engine";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ScenarioPanelProps {
  scenarios: ScenarioResult;
  profitResults: ProfitResult[];
}

interface InteractiveScenarioState {
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
  high:   { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "高置信度" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "中置信度" },
  low:    { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "低置信度" },
};

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export function ScenarioPanel({ scenarios, profitResults }: ScenarioPanelProps) {
  const [interactive, setInteractive] = useState<InteractiveScenarioState>({
    productIndex: 0,
    priceChangePercent: 10,
    targetPlatform: "",
  });

  // ═══ Derived: available platforms for switching ═══
  const availablePlatforms = useMemo(function() {
    const currentPlatform = profitResults[0]?.platformKey || "";
    return Object.keys(PLATFORM_NAMES).filter(function(p) { return p !== currentPlatform; });
  }, [profitResults]);

  // ═══ Interactive price change recalculation ═══
  const interactivePriceScenario = useMemo(function() {
    if (profitResults.length === 0) return null;
    const idx = Math.min(interactive.productIndex, profitResults.length - 1);
    const result = profitResults[idx];
    return simulatePriceChange(result, interactive.priceChangePercent);
  }, [interactive, profitResults]);

  // ═══ Interactive platform switch recalculation ═══
  const interactivePlatformScenario = useMemo(function() {
    if (profitResults.length === 0 || !interactive.targetPlatform) return null;
    const idx = Math.min(interactive.productIndex, profitResults.length - 1);
    const result = profitResults[idx];
    return simulatePlatformSwitch(result, interactive.targetPlatform);
  }, [interactive, profitResults]);

  // ═══ Stop-loss scenario ═══
  const stopLossScenario = useMemo(function() {
    return simulateStopLoss(profitResults);
  }, [profitResults]);

  if (profitResults.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className="mb-6"
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Crosshair className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white/80">场景模拟</h2>
          <p className="text-[10px] text-white/25">调整参数，实时预览经营变化</p>
        </div>
        <span className="text-[10px] text-white/20 ml-auto">{scenarios.scenarios.length} 个预设场景</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* ═══ Left: Interactive Price Change Simulator ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl p-5 border border-indigo-500/10 card-lift"
          style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.7) 0%, rgba(17,24,39,0.5) 100%)", backdropFilter: "blur(16px)" }}
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.03] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,1) 0%, transparent 70%)", filter: "blur(30px)" }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-white/80">价格调整模拟</h3>
            </div>

            {/* Product selector */}
            <div className="mb-4">
              <label className="text-[10px] text-white/30 block mb-1.5 uppercase tracking-wider font-medium">选择商品</label>
              <div className="flex flex-wrap gap-1.5">
                {profitResults.slice(0, 5).map(function(pr, i) {
                  const isActive = interactive.productIndex === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setInteractive(function(s) { return { ...s, productIndex: i }; })}
                      className={"text-[10px] px-2.5 py-1.5 rounded-lg border transition-all " + (
                        isActive
                          ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-[0_0_10px_-5px_rgba(99,102,241,0.3)]"
                          : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
                      )}>
                      {pr.productName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price change slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium">调整幅度</label>
                <span className={"text-sm font-mono font-bold " + (interactive.priceChangePercent >= 0 ? "text-green-400" : "text-red-400")}>
                  {interactive.priceChangePercent >= 0 ? "+" : ""}{interactive.priceChangePercent}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={interactive.priceChangePercent}
                  onChange={function(e) {
                    setInteractive(function(s) { return { ...s, priceChangePercent: Number(e.target.value) }; });
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: interactive.priceChangePercent >= 0
                      ? "linear-gradient(to right, rgba(74,222,128,0.3), rgba(74,222,128,0.1))"
                      : "linear-gradient(to left, rgba(248,113,113,0.3), rgba(248,113,113,0.1))",
                  }}
                />
                {/* Center marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20 border-2 border-white/30 pointer-events-none" />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-white/15">-30%</span>
                <span className="text-[9px] text-white/25">0%</span>
                <span className="text-[9px] text-white/15">+30%</span>
              </div>
            </div>

            {/* Results */}
            {interactivePriceScenario && (
              <div className="space-y-3">
                {/* Price comparison */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <div className="text-[10px] text-white/25 uppercase tracking-wider">原售价</div>
                    <div className="text-sm font-mono text-white/70 font-medium">¥{interactivePriceScenario.originalPrice.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-white/15">
                    <div className="w-8 h-px bg-white/10" />
                    <ArrowUpRight className="w-4 h-4" />
                    <div className="w-8 h-px bg-white/10" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/25 uppercase tracking-wider">新售价</div>
                    <div className="text-sm font-mono text-white/90 font-bold">¥{interactivePriceScenario.newPrice.toFixed(2)}</div>
                  </div>
                </div>

                {/* Profit comparison */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-white/25 mb-1 uppercase tracking-wider">原月利润</div>
                    <div className={"text-base font-mono font-bold " + (interactivePriceScenario.originalMonthlyProfit >= 0 ? "text-white/70" : "text-red-400/70")}>
                      {interactivePriceScenario.originalMonthlyProfit >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePriceScenario.originalMonthlyProfit)).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/25">利润率 {interactivePriceScenario.originalProfitMargin.toFixed(1)}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/10">
                    <div className="text-[10px] text-indigo-400/60 mb-1 uppercase tracking-wider">新月利润</div>
                    <div className={"text-base font-mono font-bold " + (interactivePriceScenario.newMonthlyProfit >= 0 ? "text-green-400" : "text-red-400")}>
                      {interactivePriceScenario.newMonthlyProfit >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePriceScenario.newMonthlyProfit)).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-indigo-400/50">利润率 {interactivePriceScenario.newProfitMargin.toFixed(1)}%</div>
                  </div>
                </div>

                {/* Delta */}
                <div className={"p-3 rounded-lg border " + (
                  interactivePriceScenario.profitDelta >= 0
                    ? "bg-emerald-500/[0.04] border-emerald-500/10"
                    : "bg-red-500/[0.04] border-red-500/10"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">利润变化</span>
                    <span className={"text-[10px] px-2 py-0.5 rounded-md border " + CONFIDENCE_CONFIG[interactivePriceScenario.confidence].bg + " " + CONFIDENCE_CONFIG[interactivePriceScenario.confidence].text + " " + CONFIDENCE_CONFIG[interactivePriceScenario.confidence].border}>
                      {CONFIDENCE_CONFIG[interactivePriceScenario.confidence].label}
                    </span>
                  </div>
                  <div className={"text-xl font-mono font-bold mt-1.5 " + (interactivePriceScenario.profitDelta >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {interactivePriceScenario.profitDelta >= 0 ? "+" : ""}{interactivePriceScenario.profitDelta.toFixed(0)} 元/月
                    <span className="text-xs ml-1.5 text-white/40">({interactivePriceScenario.profitDeltaPercent >= 0 ? "+" : ""}{interactivePriceScenario.profitDeltaPercent.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-white/50 leading-relaxed">{interactivePriceScenario.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ Right: Platform Switch + Stop Loss ═══ */}
        <div className="space-y-4">
          {/* Platform switch simulator */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl p-5 border border-indigo-500/10 card-lift"
            style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.7) 0%, rgba(17,24,39,0.5) 100%)", backdropFilter: "blur(16px)" }}
          >
            {/* Background glow */}
            <div className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.03] pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(6,182,212,1) 0%, transparent 70%)", filter: "blur(30px)" }} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white/80">跨平台切换模拟</h3>
              </div>

              {/* Platform selector */}
              <div className="mb-4">
                <label className="text-[10px] text-white/30 block mb-1.5 uppercase tracking-wider font-medium">
                  当前平台：{profitResults[interactive.productIndex]?.platform || "—"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availablePlatforms.map(function(plat) {
                    const isActive = interactive.targetPlatform === plat;
                    return (
                      <button
                        key={plat}
                        onClick={() => setInteractive(function(s) { return { ...s, targetPlatform: plat }; })}
                        className={"text-[10px] px-2.5 py-1.5 rounded-lg border transition-all " + (
                          isActive
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_10px_-5px_rgba(6,182,212,0.3)]"
                            : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
                        )}>
                        {PLATFORM_NAMES[plat] || plat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platform switch result */}
              {interactivePlatformScenario ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-[10px] text-white/25 mb-1 uppercase tracking-wider">当前平台月利润</div>
                      <div className={"text-sm font-mono font-bold " + (interactivePlatformScenario.originalProfit.netProfitMonthly >= 0 ? "text-white/70" : "text-red-400/70")}>
                        {interactivePlatformScenario.originalProfit.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePlatformScenario.originalProfit.netProfitMonthly)).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/10">
                      <div className="text-[10px] text-cyan-400/60 mb-1 uppercase tracking-wider">
                        切换到{interactivePlatformScenario.toPlatform}月利润
                      </div>
                      <div className={"text-sm font-mono font-bold " + (interactivePlatformScenario.switchedProfit.netProfitMonthly >= 0 ? "text-green-400" : "text-red-400")}>
                        {interactivePlatformScenario.switchedProfit.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePlatformScenario.switchedProfit.netProfitMonthly)).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className={"p-3 rounded-lg border " + (
                    interactivePlatformScenario.profitDelta >= 0
                      ? "bg-emerald-500/[0.04] border-emerald-500/10"
                      : "bg-red-500/[0.04] border-red-500/10"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">利润差异</span>
                      <span className={"text-[10px] px-2 py-0.5 rounded-md border " + CONFIDENCE_CONFIG[interactivePlatformScenario.confidence].bg + " " + CONFIDENCE_CONFIG[interactivePlatformScenario.confidence].text + " " + CONFIDENCE_CONFIG[interactivePlatformScenario.confidence].border}>
                        {CONFIDENCE_CONFIG[interactivePlatformScenario.confidence].label}
                      </span>
                    </div>
                    <div className={"text-xl font-mono font-bold mt-1.5 " + (interactivePlatformScenario.profitDelta >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {interactivePlatformScenario.profitDelta >= 0 ? "+" : ""}{interactivePlatformScenario.profitDelta.toFixed(0)} 元/月
                      <span className="text-xs ml-1.5 text-white/40">({interactivePlatformScenario.profitDeltaPercent >= 0 ? "+" : ""}{interactivePlatformScenario.profitDeltaPercent.toFixed(1)}%)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-xs text-white/50 leading-relaxed">{interactivePlatformScenario.recommendation}</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-white/20 text-center py-4">
                  请选择目标平台查看切换收益
                </div>
              )}
            </div>
          </motion.div>

          {/* Stop loss scenario */}
          {stopLossScenario.productsToStop.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl p-5 border border-red-500/10 card-lift"
              style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.7) 0%, rgba(17,24,39,0.5) 100%)", backdropFilter: "blur(16px)" }}
            >
              {/* Background glow */}
              <div className="absolute bottom-0 right-0 w-48 h-48 opacity-[0.03] pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(239,68,68,1) 0%, transparent 70%)", filter: "blur(30px)" }} />

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white/80">止损模拟</h3>
                </div>

                <div className="space-y-2 mb-3">
                  {stopLossScenario.productsToStop.map(function(p, i) {
                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/[0.08]">
                        <div>
                          <span className="text-xs text-white/70 font-medium">{p.productName}</span>
                          <span className="text-[10px] text-white/25 ml-1.5">{p.platform}</span>
                        </div>
                        <span className="text-xs font-mono text-red-400 font-medium">
                          月亏 ¥{Math.abs(Math.round(p.currentMonthlyLoss)).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">止损后月收益</span>
                    <span className={"text-[10px] px-2 py-0.5 rounded-md border " + CONFIDENCE_CONFIG[stopLossScenario.confidence].bg + " " + CONFIDENCE_CONFIG[stopLossScenario.confidence].text + " " + CONFIDENCE_CONFIG[stopLossScenario.confidence].border}>
                      {CONFIDENCE_CONFIG[stopLossScenario.confidence].label}
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-green-400">
                    +¥{Math.round(stopLossScenario.monthlySavings).toLocaleString()}/月
                  </div>
                  <div className="text-[10px] text-white/25 mt-1">
                    减少 {stopLossScenario.productsToStop.length} 个亏损品，整体月利润提升 {Math.round(stopLossScenario.overallProfitImprovement / Math.abs(profitResults.reduce(function(s, p) { return s + p.netProfitMonthly; }, 0)) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mt-3">
                  <p className="text-xs text-white/50 leading-relaxed">{stopLossScenario.recommendation}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pre-generated scenarios summary */}
          {scenarios.scenarios.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl p-5 border border-white/[0.04]"
              style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.5) 0%, rgba(17,24,39,0.3) 100%)", backdropFilter: "blur(16px)" }}>
              <div className="text-[10px] text-white/25 mb-2 uppercase tracking-wider font-medium">AI 预设场景摘要</div>
              <p className="text-xs text-white/40 leading-relaxed whitespace-pre-wrap">{scenarios.summary}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ScenarioPanel;
