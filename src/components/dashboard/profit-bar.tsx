"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceCard } from "@/lib/pipeline/types";

interface ProfitBarProps {
  evidenceCards: EvidenceCard[];
}

export function ProfitBar({ evidenceCards }: ProfitBarProps) {
  if (evidenceCards.length === 0) return null;

  const profits = evidenceCards.map(function(c) { return c.profit.netMonthly; });
  const totalMonthlyProfit = profits.reduce(function(s, v) { return s + v; }, 0);
  const profitable = evidenceCards.filter(function(c) { return c.profit.netMonthly > 0; });
  const losing = evidenceCards.filter(function(c) { return c.profit.netMonthly <= 0; });

  const sorted = [...evidenceCards].sort(function(a, b) { return b.profit.netMonthly - a.profit.netMonthly; });
  const topEarner = sorted[0];
  const worstLoser = sorted[sorted.length - 1];
  const bestMargin = [...evidenceCards].sort(function(a, b) { return b.profit.margin - a.profit.margin; })[0];

  const healthyRatio = evidenceCards.length > 0
    ? Math.round((profitable.length / evidenceCards.length) * 100)
    : 0;

  const isPositive = totalMonthlyProfit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.08] card-lift bg-surface"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isPositive ? "bg-emerald-500/10" : "bg-red-500/10")}>
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div>
            <p className="text-xs text-white/50 font-medium">本月预估利润</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-emerald-400/80">{profitable.length} 盈利</span>
              <span className="text-white/10">·</span>
              <span className="text-[10px] text-red-400/80">{losing.length} 亏损</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Activity className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] text-white/50 font-mono">{healthyRatio}% 健康</span>
        </div>
      </div>

      {/* Big number */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2">
          <span className={"text-5xl font-bold font-mono tracking-tight " + (isPositive ? "text-emerald-400" : "text-red-400")}>
            {isPositive ? "+" : "−"}¥{Math.abs(Math.round(totalMonthlyProfit)).toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-white/30 mt-1.5">月度净利润预估</p>
      </div>

      {/* Health bar */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-5">
        <div className="flex h-full">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
            style={{ width: healthyRatio + "%" }}
          />
          {healthyRatio < 100 && (
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-700"
              style={{ width: (100 - healthyRatio) + "%" }}
            />
          )}
        </div>
      </div>

      {/* 3 mini cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Top earner */}
        {topEarner && topEarner.profit.netMonthly > 0 && (
          <div className="rounded-xl p-3.5 border border-emerald-500/10 bg-emerald-500/[0.04] group hover:bg-emerald-500/[0.06] transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">最赚钱</p>
            </div>
            <p className="text-xs text-white/70 font-medium truncate mb-1">{topEarner.productName}</p>
            <p className="text-sm font-mono font-bold text-emerald-400">
              +¥{Math.abs(Math.round(topEarner.profit.netMonthly)).toLocaleString()}
            </p>
          </div>
        )}

        {/* Worst loser */}
        {worstLoser && worstLoser.profit.netMonthly < 0 && (
          <div className="rounded-xl p-3.5 border border-red-500/10 bg-red-500/[0.04] group hover:bg-red-500/[0.06] transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">最亏损</p>
            </div>
            <p className="text-xs text-white/70 font-medium truncate mb-1">{worstLoser.productName}</p>
            <p className="text-sm font-mono font-bold text-red-400">
              −¥{Math.abs(Math.round(worstLoser.profit.netMonthly)).toLocaleString()}
            </p>
          </div>
        )}

        {/* Best margin */}
        {bestMargin && (
          <div className="rounded-xl p-3.5 border border-indigo-500/10 bg-indigo-500/[0.04] group hover:bg-indigo-500/[0.06] transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">利润率最优</p>
            </div>
            <p className="text-xs text-white/70 font-medium truncate mb-1">{bestMargin.productName}</p>
            <p className="text-sm font-mono font-bold text-indigo-400">
              {bestMargin.profit.margin >= 0 ? "+" : "−"}{Math.abs(bestMargin.profit.margin)}%
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProfitBar;
