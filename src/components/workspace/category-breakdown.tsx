"use client";

import { useMemo } from "react";
import { ModuleShell } from "./module-shell";
import { PieChart } from "@/components/charts";

function aggregateByCategory(rows: any[], catField: string, amountField: string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][catField] || "Other");
    const val = Number(rows[i][amountField]) || 0;
    map[name] = (map[name] || 0) + val;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => ({ name: k, value: Math.round(v) }));
}

function computeConcentration(data: { name: string; value: number }[]): number {
  if (data.length === 0) return 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return 0;
  const top3 = data.slice(0, 3).reduce((s, d) => s + d.value, 0);
  return Math.round((top3 / total) * 100);
}

export function CategoryBreakdown({ rows, categoryField, amountField, aiSummary }: { rows: any[]; categoryField: string; amountField: string; aiSummary?: string }) {
  const data = useMemo(() => aggregateByCategory(rows, categoryField, amountField), [rows, categoryField, amountField]);
  const concentration = computeConcentration(data);

  return (
    <ModuleShell title="\u54c1\u7c7b\u7ed3\u6784" aiSummary={aiSummary}>
      <div className="mb-4 flex gap-4">
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text">{data.length}</span>
          <p className="text-xs text-white/40">\u54c1\u7c7b\u6570</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text">{concentration}%</span>
          <p className="text-xs text-white/40">TOP3 \u96c6\u4e2d\u5ea6</p>
        </div>
      </div>
      {data.length > 0 ? <PieChart title="\u54c1\u7c7b\u9500\u552e\u989d\u5360\u6bd4" data={data} /> : <p className="text-sm text-white/30 text-center py-8">\u65e0\u54c1\u7c7b\u6570\u636e</p>}
    </ModuleShell>
  );
}
