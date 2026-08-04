"use client";

/**
 * 跨平台利润对比组件 v3.0 — 证据卡式布局
 *
 * 参考 evidence-card-view 的视觉语言：
 *   - 每个商品一张主卡片
 *   - 头部：编号 + 商品名 + 平台 verdict chip（带置信度）
 *   - 指标区：关键数值用小卡片网格展示
 *   - 底部：AI 建议 + 价差预警
 *
 * 阅读性改进：label 用 text-secondary（非 faint），确保对比度充足
 */

import React from "react";
import { motion } from "framer-motion";
import type { CrossPlatformComparison } from "@/lib/cross-platform";

// ── 平台色彩映射 ──
const PLATFORM_META: Record<string, { color: string; bg: string; border: string; icon: string; dot: string }> = {
  "天猫":    { color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200",    icon: "猫", dot: "bg-red-500" },
  "淘宝":    { color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", icon: "淘", dot: "bg-orange-500" },
  "京东":    { color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    icon: "京", dot: "bg-red-600" },
  "拼多多":  { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: "拼", dot: "bg-red-700" },
  "抖音":    { color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200",   icon: "抖", dot: "bg-gray-700" },
};

const VERDICT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  buy_more: { label: "加量采购", bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200" },
  hold:     { label: "维持现状", bg: "bg-sky-500/10",    text: "text-sky-600",    border: "border-sky-200" },
  reduce:   { label: "减少采购", bg: "bg-amber-500/10",  text: "text-amber-600",  border: "border-amber-200" },
  drop:     { label: "停止采购", bg: "bg-red-500/10",    text: "text-red-500",    border: "border-red-200" },
};

interface Props {
  comparisons: CrossPlatformComparison[];
  totalComparisons?: number;
  coveredPlatforms?: string[];
}

export default function CrossPlatformView({ comparisons, totalComparisons, coveredPlatforms }: Props) {
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="card-elevated p-6 rounded-xl text-center">
        <p className="text-secondary text-sm">
          上传多个平台的销售数据后，此处将自动展示跨平台利润对比。
        </p>
        <p className="text-tertiary text-xs mt-2">
          支持天猫/淘宝 · 京东 · 拼多多 · 抖音四大平台
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-heading text-primary">跨平台利润对比</h3>
          <p className="text-caption text-tertiary mt-0.5">
            {totalComparisons || comparisons.length} 组跨平台匹配 · {coveredPlatforms?.length || 0} 个平台覆盖
          </p>
        </div>
        {coveredPlatforms && coveredPlatforms.length < 4 && (
          <div className="text-amber-600 text-caption bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            建议上传更多平台数据以获得完整对比
          </div>
        )}
      </div>

      {/* 商品卡片流 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparisons.map((comp, idx) => (
          <motion.div
            key={comp.productName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <ProductCard comparison={comp} index={idx + 1} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 单个商品跨平台对比卡 */
function ProductCard({ comparison: comp, index }: { comparison: CrossPlatformComparison; index: number }) {
  const platforms = comp.platformResults;
  const best = platforms.length > 0 ? platforms.reduce((a, b) => a.netProfitPerItem > b.netProfitPerItem ? a : b) : null;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden hover:shadow-md transition-shadow duration-300">
      {/* ── 卡片头部 ── */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-caption text-tertiary font-mono border border-gray-200 rounded-md px-1.5 py-0.5 bg-gray-50 shrink-0">
            #{index}
          </span>
          <span className="text-sm font-semibold text-primary truncate">{comp.productName}</span>
          {comp.priceSpreadAlert && (
            <span className="text-red-500 text-caption bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
              价差异常
            </span>
          )}
        </div>
        <span className="text-caption text-tertiary shrink-0 font-mono">
          {comp.priceSpreadRatio >= 0 ? "+" : ""}{Math.round(comp.priceSpreadRatio * 100)}%
        </span>
      </div>

      {/* ── 指标概览区（4 列网格，参考证据卡） ── */}
      <div className="px-4 py-3 space-y-3">
        {/* 平台列 */}
        {platforms.map((r) => {
          const meta = PLATFORM_META[r.platform] || PLATFORM_META["京东"];
          const verdict = VERDICT_CONFIG[r.verdict] || VERDICT_CONFIG.hold;
          const isBest = best && r.platformKey === best.platformKey;
          const isPositive = r.netProfitPerItem >= 0;

          return (
            <div
              key={r.platformKey}
              className={"rounded-xl border p-3 " + (isBest ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100 bg-gray-50/60")}
            >
              {/* 平台名称 + 判决 chip */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={"w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border " + meta.bg + " " + meta.color + " " + meta.border}>
                    {meta.icon}
                  </span>
                  <span className="text-sm font-medium text-primary">{r.platform}</span>
                  {isBest && (
                    <span className="text-caption text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      最高利润
                    </span>
                  )}
                </div>
                <span className={"text-caption px-2 py-0.5 rounded-lg border font-medium " + verdict.bg + " " + verdict.text + " " + verdict.border}>
                  {verdict.label}
                </span>
              </div>

              {/* 关键指标 2×3 网格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                <Metric label="售价" value={"¥" + r.sellPrice.toFixed(2)} positive />
                <Metric label="进货成本" value={"¥" + r.purchaseCost.toFixed(2)} />
                <Metric label="平台扣费" value={"¥" + (r.costs?.commissionFee || 0).toFixed(2)} />
                <Metric label="达人佣金" value={(r.costs?.influencerCommission || 0) > 0 ? "¥" + r.costs.influencerCommission.toFixed(2) : "—"} />
                <Metric label="单品利润" value={(isPositive ? "+¥" : "−¥") + Math.abs(r.netProfitPerItem).toFixed(2)} positive={isPositive} />
                <Metric label="利润率" value={(r.profitMargin >= 0 ? "+" : "") + r.profitMargin.toFixed(2) + "%"} positive={r.profitMargin >= 0} />
              </div>

              {/* 月利润横条 */}
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-caption text-tertiary">月利润</span>
                <span className={"text-sm font-mono font-semibold " + (r.netProfitMonthly >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.netProfitMonthly >= 0 ? "+" : "−"}¥{Math.abs(Math.round(r.netProfitMonthly)).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── AI 建议 ── */}
      {comp.aiRecommendation && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-blue-50/70 border border-blue-100">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-brand bg-white border border-blue-200 px-1.5 py-0.5 rounded-md mt-0.5 shrink-0">
              AI
            </span>
            <p className="text-caption text-secondary whitespace-pre-line leading-relaxed">
              {comp.aiRecommendation}
            </p>
          </div>
        </div>
      )}

      {/* ── 价差详情 ── */}
      {comp.priceSpreadAlert && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
          <p className="text-caption text-red-600">
            跨平台价差超过30%：{platforms[0]?.platform} ¥{platforms[0]?.sellPrice.toFixed(0)}
            vs {platforms[platforms.length - 1]?.platform} ¥{platforms[platforms.length - 1]?.sellPrice.toFixed(0)}，建议价差控制在25%以内。
          </p>
        </div>
      )}
    </div>
  );
}

/** 指标行 */
function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const valueColor = positive === true ? "text-emerald-600" : positive === false ? "text-red-500" : "text-primary";
  return (
    <div className="flex items-center justify-between">
      <span className="text-caption text-secondary">{label}</span>
      <span className={"text-caption font-mono font-medium " + valueColor}>{value}</span>
    </div>
  );
}
