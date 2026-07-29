"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, RefreshCw, ArrowUpRight, ArrowDownRight, Crosshair } from "lucide-react";
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

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400",
  medium: "text-amber-400",
  low: "text-red-400",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高置信度",
  medium: "中置信度",
  low: "低置信度",
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
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="w-4 h-4 text-indigo-400/60" />
        <span className="text-sm text-white/40 font-medium">场景模拟</span>
        <span className="text-[10px] text-white/20">{scenarios.scenarios.length} 个预设场景</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* ═══ Left: Interactive Price Change Simulator ═══ */}
        <div className="rounded-2xl p-5 border border-indigo-500/10"
          style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.5)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="w-4 h-4 text-indigo-400/60" />
            <h3 className="text-sm font-medium text-white/80">价格调整模拟器</h3>
          </div>

          {/* Product selector */}
          <div className="mb-4">
            <label className="text-[10px] text-white/30 block mb-1.5">选择商品</label>
            <div className="flex flex-wrap gap-1.5">
              {profitResults.slice(0, 5).map(function(pr, i) {
                const isActive = interactive.productIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => setInteractive(function(s) { return { ...s, productIndex: i }; })}
                    className={"text-[10px] px-2.5 py-1 rounded-lg border transition-all " + (
                      isActive
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                        : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50"
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
              <label className="text-[10px] text-white/30">调整幅度</label>
              <span className={"text-sm font-mono font-medium " + (interactive.priceChangePercent >= 0 ? "text-green-400" : "text-red-400")}>
                {interactive.priceChangePercent >= 0 ? "+" : ""}{interactive.priceChangePercent}%
              </span>
            </div>
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
                background: interactive.priceChangePercent >= 0
                  ? "linear-gradient(to right, rgba(74,222,128,0.3), rgba(74,222,128,0.1))"
                  : "linear-gradient(to left, rgba(248,113,113,0.3), rgba(248,113,113,0.1))",
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-white/15">-30%</span>
              <span className="text-[9px] text-white/15">0%</span>
              <span className="text-[9px] text-white/15">+30%</span>
            </div>
          </div>

          {/* Results */}
          {interactivePriceScenario && (
            <div className="space-y-3">
              {/* Price comparison */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <div className="text-[10px] text-white/25">原售价</div>
                  <div className="text-sm font-mono text-white/70">¥{interactivePriceScenario.originalPrice.toFixed(2)}</div>
                </div>
                <div className="text-white/15">→</div>
                <div className="text-right">
                  <div className="text-[10px] text-white/25">新售价</div>
                  <div className="text-sm font-mono text-white/90">¥{interactivePriceScenario.newPrice.toFixed(2)}</div>
                </div>
              </div>

              {/* Profit comparison */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-white/25 mb-1">原月利润</div>
                  <div className={"text-base font-mono font-bold " + (interactivePriceScenario.originalMonthlyProfit >= 0 ? "text-white/70" : "text-red-400/70")}>
                    {interactivePriceScenario.originalMonthlyProfit >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePriceScenario.originalMonthlyProfit)).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-white/25">利润率 {interactivePriceScenario.originalProfitMargin.toFixed(1)}%</div>
                </div>
                <div className="p-3 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/10">
                  <div className="text-[10px] text-indigo-400/60 mb-1">新月利润</div>
                  <div className={"text-base font-mono font-bold " + (interactivePriceScenario.newMonthlyProfit >= 0 ? "text-green-400" : "text-red-400")}>
                    {interactivePriceScenario.newMonthlyProfit >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePriceScenario.newMonthlyProfit)).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-indigo-400/50">利润率 {interactivePriceScenario.newProfitMargin.toFixed(1)}%</div>
                </div>
              </div>

              {/* Delta */}
              <div className={"p-3 rounded-lg border " + (
                interactivePriceScenario.profitDelta >= 0
                  ? "bg-green-500/[0.04] border-green-500/10"
                  : "bg-red-500/[0.04] border-red-500/10"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30">利润变化</span>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + CONFIDENCE_COLORS[interactivePriceScenario.confidence]}>
                    {CONFIDENCE_LABELS[interactivePriceScenario.confidence]}
                  </span>
                </div>
                <div className={"text-lg font-mono font-bold mt-1 " + (interactivePriceScenario.profitDelta >= 0 ? "text-green-400" : "text-red-400")}>
                  {interactivePriceScenario.profitDelta >= 0 ? "+" : ""}{interactivePriceScenario.profitDelta.toFixed(0)} 元/月
                  <span className="text-xs ml-1">({interactivePriceScenario.profitDeltaPercent >= 0 ? "+" : ""}{interactivePriceScenario.profitDeltaPercent.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Recommendation */}
              <p className="text-xs text-white/40 leading-relaxed">{interactivePriceScenario.recommendation}</p>
            </div>
          )}
        </div>

        {/* ═══ Right: Platform Switch + Stop Loss ═══ */}
        <div className="space-y-4">
          {/* Platform switch simulator */}
          <div className="rounded-2xl p-5 border border-indigo-500/10"
            style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.5)" }}>
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-indigo-400/60" />
              <h3 className="text-sm font-medium text-white/80">跨平台切换模拟</h3>
            </div>

            {/* Platform selector */}
            <div className="mb-4">
              <label className="text-[10px] text-white/30 block mb-1.5">
                当前平台：{profitResults[interactive.productIndex]?.platform || "—"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availablePlatforms.map(function(plat) {
                  const isActive = interactive.targetPlatform === plat;
                  return (
                    <button
                      key={plat}
                      onClick={() => setInteractive(function(s) { return { ...s, targetPlatform: plat }; })}
                      className={"text-[10px] px-2.5 py-1 rounded-lg border transition-all " + (
                        isActive
                          ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                          : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-white/25 mb-1">当前平台月利润</div>
                    <div className={"text-sm font-mono font-bold " + (interactivePlatformScenario.originalProfit.netProfitMonthly >= 0 ? "text-white/70" : "text-red-400/70")}>
                      {interactivePlatformScenario.originalProfit.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePlatformScenario.originalProfit.netProfitMonthly)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/10">
                    <div className="text-[10px] text-indigo-400/60 mb-1">
                      切换到{interactivePlatformScenario.toPlatform}月利润
                    </div>
                    <div className={"text-sm font-mono font-bold " + (interactivePlatformScenario.switchedProfit.netProfitMonthly >= 0 ? "text-green-400" : "text-red-400")}>
                      {interactivePlatformScenario.switchedProfit.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(interactivePlatformScenario.switchedProfit.netProfitMonthly)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className={"p-3 rounded-lg border " + (
                  interactivePlatformScenario.profitDelta >= 0
                    ? "bg-green-500/[0.04] border-green-500/10"
                    : "bg-red-500/[0.04] border-red-500/10"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">利润差异</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + CONFIDENCE_COLORS[interactivePlatformScenario.confidence]}>
                      {CONFIDENCE_LABELS[interactivePlatformScenario.confidence]}
                    </span>
                  </div>
                  <div className={"text-lg font-mono font-bold mt-1 " + (interactivePlatformScenario.profitDelta >= 0 ? "text-green-400" : "text-red-400")}>
                    {interactivePlatformScenario.profitDelta >= 0 ? "+" : ""}{interactivePlatformScenario.profitDelta.toFixed(0)} 元/月
                    <span className="text-xs ml-1">({interactivePlatformScenario.profitDeltaPercent >= 0 ? "+" : ""}{interactivePlatformScenario.profitDeltaPercent.toFixed(1)}%)</span>
                  </div>
                </div>

                <p className="text-xs text-white/40 leading-relaxed">{interactivePlatformScenario.recommendation}</p>
              </div>
            ) : (
              <div className="text-xs text-white/20 text-center py-4">
                请选择目标平台查看切换收益
              </div>
            )}
          </div>

          {/* Stop loss scenario */}
          {stopLossScenario.productsToStop.length > 0 && (
            <div className="rounded-2xl p-5 border border-red-500/10 bg-red-500/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownRight className="w-4 h-4 text-red-400/60" />
                <h3 className="text-sm font-medium text-white/80">止损模拟</h3>
              </div>

              <div className="space-y-2 mb-3">
                {stopLossScenario.productsToStop.map(function(p, i) {
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-500/[0.04] border border-red-500/[0.06]">
                      <div>
                        <span className="text-xs text-white/70">{p.productName}</span>
                        <span className="text-[10px] text-white/25 ml-1.5">{p.platform}</span>
                      </div>
                      <span className="text-xs font-mono text-red-400">
                        月亏 ¥{Math.abs(Math.round(p.currentMonthlyLoss)).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/30">止损后月收益</span>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + CONFIDENCE_COLORS[stopLossScenario.confidence]}>
                    {CONFIDENCE_LABELS[stopLossScenario.confidence]}
                  </span>
                </div>
                <div className="text-lg font-mono font-bold text-green-400">
                  +¥{Math.round(stopLossScenario.monthlySavings).toLocaleString()}/月
                </div>
                <div className="text-[10px] text-white/25 mt-1">
                  减少 {stopLossScenario.productsToStop.length} 个亏损品，整体月利润提升 {Math.round(stopLossScenario.overallProfitImprovement / Math.abs(profitResults.reduce(function(s, p) { return s + p.netProfitMonthly; }, 0)) * 100)}%
                </div>
              </div>

              <p className="text-xs text-white/40 leading-relaxed mt-3">{stopLossScenario.recommendation}</p>
            </div>
          )}

          {/* Pre-generated scenarios summary */}
          {scenarios.scenarios.length > 0 && (
            <div className="rounded-2xl p-5 border border-white/[0.04]"
              style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.3)" }}>
              <div className="text-[10px] text-white/25 mb-2">AI 预设场景摘要</div>
              <p className="text-xs text-white/40 leading-relaxed whitespace-pre-wrap">{scenarios.summary}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ScenarioPanel;
