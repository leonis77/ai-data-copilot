"use client";

import { ModuleShell } from "./module-shell";
import { rankByField } from "@/lib/analysis";
import { PieChart } from "@/components/charts";

export function CategoryBreakdown({ rows, categoryField, amountField, aiSummary }: { rows: any[]; categoryField: string; amountField: string; aiSummary?: string }) {
  const data = rankByField(rows, categoryField, amountField, 10);
  return (
    <ModuleShell title="品类结构" aiSummary={aiSummary}>
      {data.length > 0 ? <PieChart title={categoryField + " 分布"} data={data} height={300} /> : <p className="text-sm text-white/30 text-center py-8">无分类数据</p>}
    </ModuleShell>
  );
}
