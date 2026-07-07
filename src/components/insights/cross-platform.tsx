"use client";

/**
 * 跨平台利润对比组件 v1.0
 *
 * 功能：
 *   1. 商品级四平台利润对比表
 *   2. 跨平台价差预警（>30%自动标注）
 *   3. AI建议面板
 *   4. 达人佣金分级标注（抖音专属）
 */

import React from "react";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import type { ProfitResult } from "@/lib/profit/engine";

interface CrossPlatformViewProps {
  comparisons: CrossPlatformComparison[];
  totalComparisons?: number;
  coveredPlatforms?: string[];
}

// 平台色彩映射
const PLATFORM_COLORS: Record<string, string> = {
  "天猫": "#FF0036",
  "淘宝": "#FF5000",
  "京东": "#E3393C",
  "拼多多": "#E02E24",
  "抖音": "#010101",
};

const PLATFORM_BG: Record<string, string> = {
  "天猫": "bg-red-500/10",
  "淘宝": "bg-orange-500/10",
  "京东": "bg-red-600/10",
  "拼多多": "bg-red-700/10",
  "抖音": "bg-gray-900/50",
};

// 判决配置
const VERDICT_CONFIG: Record<string, { icon: string; label: string; className: string }> = {
  buy_more: { icon: "📈", label: "加量采购", className: "text-green-400 bg-green-500/10" },
  hold: { icon: "✅", label: "维持现状", className: "text-blue-400 bg-blue-500/10" },
  reduce: { icon: "⚠️", label: "减少采购", className: "text-yellow-400 bg-yellow-500/10" },
  drop: { icon: "🛑", label: "停止采购", className: "text-red-400 bg-red-500/10" },
};

export default function CrossPlatformView({
  comparisons,
  totalComparisons,
  coveredPlatforms,
}: CrossPlatformViewProps) {
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="glass-sm p-6 rounded-xl text-center">
        <p className="text-white/50 text-sm">
          上传多个平台的销售数据后，此处将自动展示跨平台利润对比。
        </p>
        <p className="text-white/30 text-xs mt-2">
          支持天猫/淘宝 · 京东 · 拼多多 · 抖音四大平台
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            跨平台利润对比
          </h3>
          <p className="text-white/50 text-sm">
            {totalComparisons || comparisons.length} 组跨平台匹配 ·
            {coveredPlatforms?.length || 0} 个平台覆盖
          </p>
        </div>
        {coveredPlatforms && coveredPlatforms.length < 4 && (
          <div className="text-yellow-400/80 text-xs bg-yellow-500/10 px-3 py-1.5 rounded-full">
            ⚠️ 建议上传更多平台数据以获得完整对比
          </div>
        )}
      </div>

      {/* 对比表 */}
      {comparisons.map((comp) => (
        <ComparisonCard key={comp.productName} comparison={comp} />
      ))}
    </div>
  );
}

/** 单个商品的跨平台对比卡片 */
function ComparisonCard({ comparison: comp }: { comparison: CrossPlatformComparison }) {
  return (
    <div className="glass-sm rounded-xl overflow-hidden">
      {/* 商品名 + 价差预警 */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium text-sm">{comp.productName}</span>
          {comp.priceSpreadAlert && (
            <span className="text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
              🔴 价差异常
            </span>
          )}
        </div>
        <span className="text-white/40 text-xs">
          跨平台价差：¥{comp.priceSpread.toFixed(0)}（{Math.round(comp.priceSpreadRatio * 100)}%）
        </span>
      </div>

      {/* 平台利润对比表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-white/40 text-xs">
              <th className="text-left px-5 py-2 font-medium">平台</th>
              <th className="text-right px-3 py-2 font-medium">售价</th>
              <th className="text-right px-3 py-2 font-medium">进货成本</th>
              <th className="text-right px-3 py-2 font-medium">平台扣费</th>
              <th className="text-right px-3 py-2 font-medium">达人佣金</th>
              <th className="text-right px-3 py-2 font-medium">单品利润</th>
              <th className="text-right px-3 py-2 font-medium">利润率</th>
              <th className="text-right px-3 py-2 font-medium">月利润</th>
              <th className="text-center px-3 py-2 font-medium">判决</th>
            </tr>
          </thead>
          <tbody>
            {comp.platformResults.map((r) => (
              <tr
                key={r.platformKey}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                  r.netProfitPerItem < 0 ? "bg-red-500/5" : ""
                }`}
              >
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS[r.platform] || "#666" }}
                    />
                    {r.platform}
                    {r.platformKey === "douyin" && <InfluencerBadge result={r} />}
                  </span>
                </td>
                <td className="text-right px-3 py-2.5 text-white/80 font-mono">
                  ¥{r.sellPrice.toFixed(2)}
                </td>
                <td className="text-right px-3 py-2.5 text-white/50 font-mono">
                  ¥{r.purchaseCost.toFixed(2)}
                </td>
                <td className="text-right px-3 py-2.5 text-white/50 font-mono">
                  ¥{r.costs.commissionFee.toFixed(2)}
                </td>
                <td className="text-right px-3 py-2.5 text-white/50 font-mono">
                  {r.costs.influencerCommission > 0
                    ? `¥${r.costs.influencerCommission.toFixed(2)}`
                    : "—"}
                </td>
                <td className={`text-right px-3 py-2.5 font-mono font-semibold ${
                  r.netProfitPerItem >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {r.netProfitPerItem >= 0 ? "+" : ""}¥{r.netProfitPerItem.toFixed(2)}
                </td>
                <td className={`text-right px-3 py-2.5 font-mono ${
                  r.profitMargin >= 0 ? "text-green-400/80" : "text-red-400/80"
                }`}>
                  {r.profitMargin >= 0 ? "+" : ""}{r.profitMargin}%
                </td>
                <td className={`text-right px-3 py-2.5 font-mono ${
                  r.netProfitMonthly >= 0 ? "text-green-400/70" : "text-red-400/70"
                }`}>
                  {r.netProfitMonthly >= 0 ? "+" : ""}¥{Math.abs(r.netProfitMonthly).toFixed(0)}
                </td>
                <td className="text-center px-3 py-2.5">
                  <VerdictTag verdict={r.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI综合建议 */}
      {comp.aiRecommendation && (
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-start gap-2">
            <span className="text-sm mt-0.5">🤖</span>
            <div className="text-sm text-white/70 whitespace-pre-line">
              {comp.aiRecommendation}
            </div>
          </div>
        </div>
      )}

      {/* 价差详情 */}
      {comp.priceSpreadAlert && (
        <div className="px-5 py-2 border-t border-red-500/20 bg-red-500/[0.03]">
          <p className="text-red-400/80 text-xs">
            ⚠️ 跨平台价差超过30%：{comp.platformResults[0]?.platform} ¥{comp.platformResults[0]?.sellPrice.toFixed(0)} vs{" "}
            {comp.platformResults[comp.platformResults.length - 1]?.platform} ¥{comp.platformResults[comp.platformResults.length - 1]?.sellPrice.toFixed(0)}。
            建议将价差控制在25%以内以降低窜货风险。
          </p>
        </div>
      )}
    </div>
  );
}

/** 抖音达人等级徽章 */
function InfluencerBadge({ result }: { result: ProfitResult }) {
  if (result.platformKey !== "douyin") return null;
  const grade = result.costs.influencerCommission > 0
    ? (result.costs.influencerCommission / result.sellPrice >= 0.30 ? "D" : "C")
    : null;
  if (!grade) return null;

  const colors: Record<string, string> = {
    A: "bg-green-500/20 text-green-400",
    "B_plus": "bg-blue-500/20 text-blue-400",
    C: "bg-yellow-500/20 text-yellow-400",
    D: "bg-red-500/20 text-red-400",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[grade] || colors.C}`}>
      {grade}级
    </span>
  );
}

/** 判决标签 */
function VerdictTag({ verdict }: { verdict: ProfitResult["verdict"] }) {
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.hold;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${config.className}`}>
      {config.icon} {config.label}
    </span>
  );
}
