"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BarChart3, Upload, ArrowRight, TrendingUp, Package, Tag, MapPin, AlertTriangle } from "lucide-react";
import { SalesTrend } from "@/components/workspace/sales-trend";
import { ProductRank } from "@/components/workspace/product-rank";
import { CategoryBreakdown } from "@/components/workspace/category-breakdown";
import { RegionMap } from "@/components/workspace/region-map";
import { AnomalyDetection } from "@/components/workspace/anomaly-detection";
import { getStore, getDatasetRows } from "@/lib/store";
import { t } from "@/lib/i18n";

const TABS = [
  { label: t.workspace.salesTrend, icon: TrendingUp, key: "sales" },
  { label: t.workspace.productRank, icon: Package, key: "rank" },
  { label: t.workspace.categoryBreakdown, icon: Tag, key: "cat" },
  { label: t.workspace.regionMap, icon: MapPin, key: "region" },
  { label: t.workspace.anomalyDetection, icon: AlertTriangle, key: "anomaly" },
];

function findCol(cols: string[], patterns: RegExp[], exclude?: RegExp[]): string {
  let best = ""; let bestScore = 0;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    if (exclude) { let skip = false; for (let ei = 0; ei < exclude.length; ei++) { if (exclude[ei].test(c)) { skip = true; break; } } if (skip) continue; }
    for (let j = 0; j < patterns.length; j++) {
      if (patterns[j].test(c)) { const score = patterns.length - j; if (score > bestScore) { bestScore = score; best = c; } }
    }
  }
  return best;
}

export default function WorkspacePage() {
  const [active, setActive] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    const s = getStore();
    if (!s.activeId) { setLoading(false); return; }
    setHasData(true);
    // ⭐ 优先从 localStorage 读取（Vercel serverless 实例不共享内存）
    const localData = getDatasetRows(s.activeId);
    if (localData && localData.rows.length > 0) {
      setData({ columns: localData.columns, rows: localData.rows });
      setLoading(false);
      return;
    }
    // 回退到服务端 API
    fetch("/api/upload?id=" + s.activeId).then(r => r.json()).then(d => { setData(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen py-12 pt-20"><div className="max-w-7xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[400px] glass mt-6" /></div></div>;

  if (!hasData || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><BarChart3 className="w-10 h-10 text-primary-light/50" /></div>
          <h2 className="text-2xl font-bold mb-3">{t.workspace.noData}</h2>
          <p className="text-white/40 mb-8">{t.workspace.noDataHint}</p>
          <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25"><Upload className="w-5 h-5" />{t.workspace.uploadData}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
        </motion.div>
      </div>
    );
  }

  const cols: string[] = data.columns || [];
  const allRows: any[] = data.rows || [];
  const amtField = findCol(cols, [/实付/, /金额/, /amount/, /价格/, /price/]);
  const dtField = findCol(cols, [/时间/, /日期/, /time/, /date/, /下单/, /order/]);
  const prodField = findCol(cols, [/商品/, /产品/, /标题/, /宝贝/, /name/, /title/], [/店铺/, /shop/]);
  const catField = findCol(cols, [/sku/, /分类/, /规格/, /品类/]);
  const addrField = findCol(cols, [/地址/, /addr/, /收货/, /区域/, /地区/]);

  let rows = allRows;
  if (dtField) {
    rows = allRows.filter((r: any) => {
      const dv = r[dtField]; if (!dv) return true;
      const d = new Date(dv); if (isNaN(d.getTime())) return true;
      const daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= dateRange;
    });
  }

  return (
    <div className="min-h-screen py-12 pt-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{duration:0.6}} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-3xl font-bold"><span className="gradient-text">{t.workspace.title}</span></h1><p className="text-sm text-white/40">{rows.length}/{allRows.length} {t.workspace.records}</p></div>
          </div>
        </motion.div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1.5">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDateRange(d)} className={"px-3 py-1 rounded-lg text-xs transition-all " + (dateRange === d ? "bg-primary/20 text-white border border-primary/30" : "text-white/40 hover:text-white/60")}>{t.workspace.last}{d}{t.workspace.days}</button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActive(i)} className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap " + (active === i ? "bg-primary/20 text-white border border-primary/30" : "text-white/50 hover:text-white/80 hover:bg-white/5")}><Icon className="w-4 h-4" />{tab.label}</button>
              );
            })}
          </div>
        </div>
        <div className="space-y-6">
          {active === 0 && <SalesTrend rows={rows} amountField={amtField} orderTimeField={dtField} dateRange={dateRange} />}
          {active === 1 && <ProductRank rows={rows} productField={prodField} amountField={amtField} />}
          {active === 2 && <CategoryBreakdown rows={rows} categoryField={catField || prodField} amountField={amtField} />}
          {active === 3 && <RegionMap rows={rows} addressField={addrField} amountField={amtField} />}
          {active === 4 && <AnomalyDetection rows={rows} amountField={amtField} />}
        </div>
      </div>
    </div>
  );
}
