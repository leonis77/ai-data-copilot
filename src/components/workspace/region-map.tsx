"use client";

import { ModuleShell } from "./module-shell";
import { rankByField } from "@/lib/analysis";
import { BarChart } from "@/components/charts";

export function RegionMap({ rows, addressField, amountField, aiSummary }: { rows: any[]; addressField: string; amountField: string; aiSummary?: string }) {
  const data = rankByField(rows, addressField, amountField, 10);
  return (
    <ModuleShell title="区域热力图" aiSummary={aiSummary}>
      {data.length > 0 ? <BarChart title="TOP10 地区销量" data={data} height={300} /> : <p className="text-sm text-white/30 text-center py-8">无地址数据</p>}
    </ModuleShell>
  );
}
