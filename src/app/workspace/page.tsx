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

export default function WorkspacePage() {
  const [active, setActive] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasTemplate, setHasTemplate] = useState(false);

  useEffect(function() {
    const s = getStore();
    const cfg = s.columnConfig;
    if (!cfg || !cfg.templateId || cfg.templateId === "generic") { setLoading(false); return; }
    setHasTemplate(true);
    if (!s.activeId) { setLoading(false); return; }
    fetch("/api/upload?id=" + s.activeId)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        // Use selected columns if available
        const selCols = cfg.selectedColumns || d.columns;
        const filtered = d.rows.map(function(r: any) {
          const o: any = {};
          for (let i = 0; i < selCols.length; i++) { o[selCols[i]] = r[selCols[i]]; }
          return o;
        });
        setData({ rows: filtered, columns: selCols });
      })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }, []);

  if (loading) {
    return <div className="min-h-screen py-12"><div className="max-w-7xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[400px] glass mt-6" /></div></div>;
  }

  if (!hasTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><BarChart3 className="w-10 h-10 text-primary-light/50" /></div>
          <h2 className="text-2xl font-bold mb-3">请先上传电商订单表</h2>
          <p className="text-white/40 mb-8">工作台需要匹配平台模板（天猫/京东/拼多多/抖音）的数据。上传时会自动检测平台。</p>
          <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />上传数据<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
        </motion.div>
      </div>
    );
  }

  const rows = data?.rows || [];
  const amtField = "amount";
  const dtField = "order_time";
  const prodField = "product_name";
  const catField = "sku";
  const addrField = "address";

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-3xl font-bold"><span className="gradient-text">电商工作台</span></h1><p className="text-sm text-white/40">{rows.length} 条订单 · 平台模板分析</p></div>
          </div>
        </motion.div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map(function(t, i) {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={function() { setActive(i); }} className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap " + (active === i ? "bg-primary/20 text-white border border-primary/30" : "text-white/50 hover:text-white/80 hover:bg-white/5")}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {active === 0 && <SalesTrend rows={rows} amountField={amtField} orderTimeField={dtField} />}
          {active === 1 && <ProductRank rows={rows} productField={prodField} amountField={amtField} />}
          {active === 2 && <CategoryBreakdown rows={rows} categoryField={catField} amountField={amtField} />}
          {active === 3 && <RegionMap rows={rows} addressField={addrField} amountField={amtField} />}
          {active === 4 && <AnomalyDetection rows={rows} amountField={amtField} />}
        </div>
      </div>
    </div>
  );
}
