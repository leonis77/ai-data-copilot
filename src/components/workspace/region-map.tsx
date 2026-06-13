"use client";

import { ModuleShell } from "./module-shell";
import { BarChart } from "@/components/charts";

const PROVINCES = ["Beijing","Tianjin","Shanghai","Chongqing","Hebei","Shanxi","Liaoning","Jilin","Heilongjiang","Jiangsu","Zhejiang","Anhui","Fujian","Jiangxi","Shandong","Henan","Hubei","Hunan","Guangdong","Guangxi","Hainan","Sichuan","Guizhou","Yunnan","Tibet","Shaanxi","Gansu","Qinghai","Ningxia","Xinjiang","Inner Mongolia","Hong Kong","Macau","Taiwan"];

function extractProvince(address: string): string {
  if (!address) return "Unknown";
  for (let i = 0; i < PROVINCES.length; i++) {
    if (address.indexOf(PROVINCES[i]) >= 0) return PROVINCES[i];
  }
  return address.substring(0, Math.min(3, address.length));
}

function rankByProvince(rows: any[], addrField: string, valField: string, limit: number): { name: string; value: number; count: number }[] {
  const map: Record<string, { value: number; count: number }> = {};
  for (let i = 0; i < rows.length; i++) {
    const addr = String(rows[i][addrField] || "");
    const prov = extractProvince(addr);
    const val = Number(rows[i][valField]) || 0;
    if (!map[prov]) map[prov] = { value: 0, count: 0 };
    map[prov].value += val;
    map[prov].count += 1;
  }
  return Object.entries(map).sort((a,b)=>b[1].value-a[1].value).slice(0,limit).map(e=>({name:e[0],value:Math.round(e[1].value),count:e[1].count}));
}

export function RegionMap({ rows, addressField, amountField, aiSummary }: { rows: any[]; addressField: string; amountField: string; aiSummary?: string }) {
  const data = rankByProvince(rows, addressField, amountField, 10);
  return (
    <ModuleShell title="Regional Revenue Map" aiSummary={aiSummary}>
      {data.length > 0 ? <BarChart title="TOP 10 Regions by Revenue" data={data} height={300} /> : <p className="text-sm text-white/30 text-center py-8">No address data</p>}
    </ModuleShell>
  );
}
