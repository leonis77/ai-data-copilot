"use client";

import { useMemo } from "react";
import { ModuleShell } from "./module-shell";
import { LineChart } from "@/components/charts";

function aggregateByDate(rows: any[], dateField: string, amountField: string): { date: string; value: number }[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const dv = String(rows[i][dateField] || "");
    const d = dv.substring(0, 10); // YYYY-MM-DD
    const val = Number(rows[i][amountField]) || 0;
    map[d] = (map[d] || 0) + val;
  }
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ date: k, value: Math.round(v) }));
}

export function SalesTrend({ rows, amountField, orderTimeField, dateRange, aiSummary }: { rows: any[]; amountField: string; orderTimeField: string; dateRange: number; aiSummary?: string }) {
  const data = useMemo(() => aggregateByDate(rows, orderTimeField, amountField), [rows, orderTimeField, amountField]);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ModuleShell title="?????" aiSummary={aiSummary}>
      <div className="mb-4">
        <span className="text-3xl font-bold gradient-text">{"\u00A5"}{total.toLocaleString()}</span>
        <span className="text-sm text-white/40 ml-2">?{dateRange}????</span>
      </div>
      {data.length > 0 ? (
        <LineChart title="???????" data={data.map(d => ({ name: d.date, value: d.value }))} height={300} />
      ) : (
        <p className="text-sm text-white/30 text-center py-8">???????</p>
      )}
    </ModuleShell>
  );
}
