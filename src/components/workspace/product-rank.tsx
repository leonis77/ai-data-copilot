"use client";

import { useMemo } from "react";
import { ModuleShell } from "./module-shell";
import { BarChart } from "@/components/charts";

function rankProducts(rows: any[], productField: string, amountField: string, limit: number): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][productField] || "????");
    const val = Number(rows[i][amountField]) || 0;
    map[name] = (map[name] || 0) + val;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, v]) => ({ name: k.length > 15 ? k.substring(0, 15) + "..." : k, value: Math.round(v) }));
}

export function ProductRank({ rows, productField, amountField, aiSummary }: { rows: any[]; productField: string; amountField: string; aiSummary?: string }) {
  const data = useMemo(() => rankProducts(rows, productField, amountField, 10), [rows, productField, amountField]);
  return (
    <ModuleShell title="?????" aiSummary={aiSummary}>
      {data.length > 0 ? <BarChart title="TOP10 ?????" data={data} height={350} /> : <p className="text-sm text-white/30 text-center py-8">?????</p>}
    </ModuleShell>
  );
}
