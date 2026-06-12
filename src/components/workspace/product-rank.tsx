"use client";

import { ModuleShell } from "./module-shell";
import { rankByField } from "@/lib/analysis";
import { BarChart } from "@/components/charts";

export function ProductRank({ rows, productField, amountField, aiSummary }: { rows: any[]; productField: string; amountField: string; aiSummary?: string }) {
  const data = rankByField(rows, productField, amountField, 10);
  return (
    <ModuleShell title="商品排行榜" aiSummary={aiSummary}>
      {data.length > 0 ? <BarChart title="TOP10 销售额" data={data} height={300} /> : <p className="text-sm text-white/30 text-center py-8">无商品数据</p>}
    </ModuleShell>
  );
}
