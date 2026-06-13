"use client";

import { ModuleShell } from "./module-shell";
import { BarChart } from "@/components/charts";

const PROVINCES = ["北京","天津","上海","重庆","河北","山西","辽宁","吉林","黑龙江","江苏","浙江","安徽","福建","江西","山东","河南","湖北","湖南","广东","广西","海南","四川","贵州","云南","西藏","陕西","甘肃","青海","宁夏","新疆","内蒙古","香港","澳门","台湾"];

function extractProvince(address: string): string {
  if (!address) return "未知";
  for (var i = 0; i < PROVINCES.length; i++) {
    if (address.indexOf(PROVINCES[i]) >= 0) return PROVINCES[i];
  }
  return address.substring(0, Math.min(3, address.length));
}

function rankByProvince(rows: any[], addrField: string, valField: string, limit: number): { name: string; value: number; count: number }[] {
  var map: Record<string, { value: number; count: number }> = {};
  for (var i = 0; i < rows.length; i++) {
    var addr = String(rows[i][addrField] || "");
    var prov = extractProvince(addr);
    var val = Number(rows[i][valField]) || 0;
    if (!map[prov]) map[prov] = { value: 0, count: 0 };
    map[prov].value += val;
    map[prov].count += 1;
  }
  return Object.entries(map).sort(function(a,b){return b[1].value-a[1].value}).slice(0,limit).map(function(e){return {name:e[0],value:Math.round(e[1].value),count:e[1].count}});
}

export function RegionMap({ rows, addressField, amountField, aiSummary }: { rows: any[]; addressField: string; amountField: string; aiSummary?: string }) {
  const data = rankByProvince(rows, addressField, amountField, 10);
  return (
    <ModuleShell title="区域热力图" aiSummary={aiSummary}>
      {data.length > 0 ? <BarChart title="TOP10 省份销量" data={data} height={300} /> : <p className="text-sm text-white/30 text-center py-8">无地址数据</p>}
    </ModuleShell>
  );
}
