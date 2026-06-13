"use client";

import { useMemo } from "react";
import { ModuleShell } from "./module-shell";
import { PieChart } from "@/components/charts";

function aggregateByCategory(rows: any[], catField: string, amountField: string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][catField] || "???");
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
    <ModuleShell title="????" aiSummary={aiSummary}>
      <div className="mb-4 flex gap-4">
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text">{data.length}</span>
          <p className="text-xs text-white/40">???</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text">{concentration}%</span>
          <p className="text-xs text-white/40">TOP3???</p>
        </div>
      </div>
      {data.length > 0 ? <PieChart title="???????" data={data} /> : <p className="text-sm text-white/30 text-center py-8">?????</p>}
    </ModuleShell>
  );
}
