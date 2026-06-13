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
import { getStore } from "@/lib/store";

const TABS = [
  { label: "销售额体检", icon: TrendingUp, key: "sales" },
  { label: "商品排行榜", icon: Package, key: "rank" },
  { label: "品类结构", icon: Tag, key: "cat" },
  { label: "区域热力图", icon: MapPin, key: "region" },
  { label: "异常检测", icon: AlertTriangle, key: "anomaly" },
];

function findCol(cols: string[], patterns: RegExp[], exclude?: RegExp[]): string {
  let best = "";
  let bestScore = 0;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    if (exclude) {
      let skip = false;
      for (let ei = 0; ei < exclude.length; ei++) {
        if (exclude[ei].test(c)) { skip = true; break; }
      }
      if (skip) continue;
    }
    for (let j = 0; j < patterns.length; j++) {
      if (patterns[j].test(c)) {
        const score = patterns.length - j;
        if (score > bestScore) { bestScore = score; best = c; }
      }
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
    fetch("/api/upload?id=" + s.activeId)
      .then(r => r.json())
      .then(d => { setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-[400px] glass mt-6" />
        </div>
      </div>
    );
  }

  if (!hasData || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <BarChart3 className="w-10 h-10 text-primary-light/50" />
          </div>
          <h2 className="text-2xl font-bold mb-3">请先上传数据</h2>
          <p className="text-white/40 mb-8">工作台需要数据才能分析</p>
          <Link href="/upload">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25">
              <Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const cols: string[] = data.columns || [];
  const allRows: any[] = data.rows || [];

  const amtField = findCol(cols, [/\u5b9e\u4ed8/, /\u91d1\u989d/, /amount/, /\u4ef7\u683c/, /price/]);
  const dtField = findCol(cols, [/\u65f6\u95f4/, /\u65e5\u671f/, /time/, /date/, /\u4e0b\u5355/, /order/]);
  const prodField = findCol(cols, [/\u5546\u54c1/, /\u4ea7\u54c1/, /\u6807\u9898/, /\u5b9d\u8d1d/, /name/, /title/], [/\u5e97\u94fa/, /shop/]);
  const catField = findCol(cols, [/sku/, /\u5206\u7c7b/, /\u89c4\u683c/, /\u54c1\u7c7b/]);
  const addrField = findCol(cols, [/\u5730\u5740/, /addr/, /\u6536\u8d27/, /\u533a\u57df/, /\u5730\u533a/]);

  let rows = allRows;
  if (dtField) {
    rows = allRows.filter((r: any) => {
      const dv = r[dtField];
      if (!dv) return true;
      const d = new Date(dv);
      if (isNaN(d.getTime())) return true;
      const daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= dateRange;
    });
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold"><span className="gradient-text">数据工作台</span></h1>
              <p className="text-sm text-white/40">{rows.length}/{allRows.length} 条记录</p>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1.5">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDateRange(d)}
                className={"px-3 py-1 rounded-lg text-xs transition-all " + (dateRange === d ? "bg-primary/20 text-white border border-primary/30" : "text-white/40 hover:text-white/60")}>
                近{d}天
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((t, i) => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setActive(i)}
                  className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap " + (active === i ? "bg-primary/20 text-white border border-primary/30" : "text-white/50 hover:text-white/80 hover:bg-white/5")}>
                  <Icon className="w-4 h-4" />{t.label}
                </button>
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
