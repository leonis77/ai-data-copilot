"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
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
      className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
      style={{ backdropFilter: "blur(16px)", background: "rgba(17,24,39,0.5)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40 font-medium">本月预估利润</span>
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-400/80">{profitable.length} 个盈利</span>
          <span className="text-red-400/80">{losing.length} 个亏损</span>
        </div>
      </div>

      {/* Big number */}
      <div className="mb-4">
        <span className={"text-4xl font-bold font-mono tracking-tight " + (isPositive ? "text-green-400" : "text-red-400")}>
          {isPositive ? "+" : "−"}¥{Math.abs(Math.round(totalMonthlyProfit)).toLocaleString()}
        </span>
      </div>

      {/* Health bar */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-5">
        <div className="flex h-full">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
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
      <div className="grid grid-cols-3 gap-3">
        {/* Top earner */}
        {topEarner && topEarner.profit.netMonthly > 0 && (
          <div className="rounded-xl p-3 border border-green-500/10 bg-green-500/[0.04]">
            <p className="text-[10px] text-white/25 mb-1">最赚钱</p>
            <p className="text-xs text-white/70 font-medium truncate mb-1">{topEarner.productName}</p>
            <p className="text-sm font-mono font-bold text-green-400">
              +¥{Math.abs(Math.round(topEarner.profit.netMonthly)).toLocaleString()}
            </p>
          </div>
        )}

        {/* Worst loser */}
        {worstLoser && worstLoser.profit.netMonthly < 0 && (
          <div className="rounded-xl p-3 border border-red-500/10 bg-red-500/[0.04]">
            <p className="text-[10px] text-white/25 mb-1">最亏损</p>
            <p className="text-xs text-white/70 font-medium truncate mb-1">{worstLoser.productName}</p>
            <p className="text-sm font-mono font-bold text-red-400">
              −¥{Math.abs(Math.round(worstLoser.profit.netMonthly)).toLocaleString()}
            </p>
          </div>
        )}

        {/* Best margin */}
        {bestMargin && (
          <div className="rounded-xl p-3 border border-indigo-500/10 bg-indigo-500/[0.04]">
            <p className="text-[10px] text-white/25 mb-1">利润率最优</p>
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
