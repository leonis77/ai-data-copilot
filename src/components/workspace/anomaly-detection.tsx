"use client";

import { ModuleShell } from "./module-shell";
import { detectOutliers } from "@/lib/analysis";

export function AnomalyDetection({ rows, amountField, aiSummary }: { rows: any[]; amountField: string; aiSummary?: string }) {
  const outliers = detectOutliers(rows, amountField, 3.0);
  return (
    <ModuleShell title="异常检测" aiSummary={aiSummary}>
      {outliers.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-8">未检测到异常数据</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {outliers.slice(0, 20).map(function(o, i) {
            return (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-sm">
                <span className="text-white/60 truncate max-w-[200px]">{String(o.row.product_name || o.row.name || "Row " + o.rowIndex)}</span>
                <span className="text-red-400 font-medium">¥{o.value.toLocaleString()} (Z={o.zScore})</span>
              </div>
            );
          })}
        </div>
      )}
    </ModuleShell>
  );
}
