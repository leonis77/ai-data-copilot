"use client";

import { ModuleShell } from "./module-shell";
import { aggregateByDate } from "@/lib/analysis";
import { LineChart } from "@/components/charts";

export function SalesTrend({ rows, amountField, orderTimeField, aiSummary, dateRange }: { rows: any[]; amountField: string; orderTimeField: string; aiSummary?: string; dateRange?: number }) {
  const data = aggregateByDate(rows, orderTimeField, amountField);
  return (
    <ModuleShell title="销售额体检" aiSummary={aiSummary}>
      {data.length > 0 ? <LineChart title="每日销售额" data={data} height={300} /> : <p className="text-sm text-white/30 text-center py-8">无日期数据</p>}
    </ModuleShell>
  );
}
