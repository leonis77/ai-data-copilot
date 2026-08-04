"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign } from "lucide-react";
import type { MarketingAnalysis, CampaignAlert } from "@/lib/engines/marketing-engine";

interface MarketingPanelProps {
  analysis: MarketingAnalysis | null;
  loading?: boolean;
  onAskAI?: (question: string) => void;
}

export function MarketingPanel({ analysis, loading, onAskAI }: MarketingPanelProps) {
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl p-6 border border-gray-100"
        style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.6)" }}>
        <div className="h-6 w-48 skeleton rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 skeleton rounded" />
          <div className="h-12 skeleton rounded" />
          <div className="h-12 skeleton rounded" />
        </div>
      </motion.div>
    );
  }

  if (!analysis || analysis.campaigns.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl p-6 border border-gray-100"
        style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.6)" }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-tertiary" />
          <h3 className="text-sm text-tertiary uppercase tracking-widest font-medium">{"推广分析"}</h3>
        </div>
        <p className="text-tertiary text-sm">{"上传推广报表（直通车/引力魔方/万相台/巨量千川）后自动分析"}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 overflow-hidden"
      style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.6)" }}>

      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm text-tertiary uppercase tracking-widest font-medium">{"推广分析"}</h3>
          </div>
          <span className="text-xs text-faint">{analysis.campaigns.length} {"个计划"}</span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-tertiary mb-1">{"总花费"}</p>
            <p className="text-xl font-bold text-primary">
              {"¥" + Math.round(analysis.totalSpend).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-tertiary mb-1">{"总成交"}</p>
            <p className="text-xl font-bold text-primary">
              {"¥" + Math.round(analysis.totalRevenue).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl"
            style={{ background: analysis.overallROI >= 3 ? "rgba(34,197,94,0.1)" : analysis.overallROI >= 1 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)" }}>
            <p className="text-xs text-tertiary mb-1">{"投产比"}</p>
            <p className="text-xl font-bold"
              style={{ color: analysis.overallROI >= 3 ? "#4ade80" : analysis.overallROI >= 1 ? "#fbbf24" : "#f87171" }}>
              {analysis.overallROI}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-3 border-b border-gray-100">
        <p className="text-sm text-secondary">{analysis.summary}</p>
      </div>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-xs text-tertiary uppercase tracking-wider">
              {analysis.alerts.filter(function (a: CampaignAlert) { return a.level === "critical"; }).length > 0
                ? "需要立即处理" : "优化建议"}
            </span>
          </div>

          {analysis.alerts.map(function (alert: CampaignAlert, i: number) {
            var bgColor = alert.level === "critical" ? "rgba(239,68,68,0.1)" :
              alert.level === "warning" ? "rgba(234,179,8,0.08)" : "rgba(34,197,94,0.08)";
            var borderColor = alert.level === "critical" ? "border-red-500/20" :
              alert.level === "warning" ? "border-yellow-500/15" : "border-green-500/15";
            var iconColor = alert.level === "critical" ? "text-red-400" :
              alert.level === "warning" ? "text-yellow-400" : "text-green-400";

            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={"p-4 rounded-xl border " + borderColor}
                style={{ background: bgColor }}>
                <div className="flex items-start gap-3">
                  <div className={"mt-0.5 w-5 h-5 rounded-full flex items-center justify-center " + iconColor}
                    style={{ background: "rgba(0,0,0,0.05)" }}>
                    {alert.level === "critical" ? "!" : alert.level === "warning" ? "?" : "+"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{alert.title}</p>
                    <p className="text-xs text-tertiary mt-1">{alert.detail}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-blue-400/80">
                        {"→ " + alert.action}
                      </span>
                      <span className="text-xs text-faint">
                        {"影响: " + alert.impact}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Top campaigns by ROI */}
      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-3 h-3 text-tertiary" />
          <span className="text-xs text-tertiary uppercase tracking-wider">{"计划排行"}</span>
        </div>
        <div className="space-y-2">
          {analysis.campaigns.slice(0, 5).map(function (c, i) {
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <span className="text-xs text-faint w-5">{i + 1}</span>
                <span className="text-sm text-primary flex-1 truncate">{c.name}</span>
                <span className="text-xs text-tertiary">{"¥" + Math.round(c.spend)}</span>
                <span className="text-xs text-tertiary">{"→"}</span>
                <span className="text-xs text-tertiary">{"¥" + Math.round(c.revenue)}</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded"
                  style={{
                    color: c.roi >= 3 ? "#4ade80" : c.roi >= 1 ? "#fbbf24" : "#f87171",
                    background: c.roi >= 3 ? "rgba(34,197,94,0.1)" : c.roi >= 1 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                  }}>
                  {"ROI " + c.roi}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick AI questions */}
      {onAskAI && (
        <div className="px-6 pb-6">
          <div className="flex gap-2 flex-wrap">
            {["哪个广告该停？", "哪个计划值得加预算？", "点击单价合理吗？"].map(function (q, i) {
              return (
                <button key={i} onClick={function () { onAskAI(q); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-tertiary hover:text-primary hover:bg-gray-100 transition-colors">
                  {q}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
