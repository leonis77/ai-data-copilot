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
  { label: "\u9500\u552E\u989D\u4F53\u68C0", icon: TrendingUp, key: "sales" },
  { label: "\u5546\u54C1\u6392\u884C\u699C", icon: Package, key: "rank" },
  { label: "\u54C1\u7C7B\u7ED3\u6784", icon: Tag, key: "cat" },
  { label: "\u533A\u57DF\u70ED\u529B\u56FE", icon: MapPin, key: "region" },
  { label: "\u5F02\u5E38\u68C0\u6D4B", icon: AlertTriangle, key: "anomaly" },
];

function findCol(cols: string[], patterns: RegExp[], exclude?: RegExp[]): string {
  var best = ""; var bestScore = 0;
  for (var i = 0; i < cols.length; i++) {
    var c = cols[i];
    if (exclude) { var skip = false; for (var ei = 0; ei < exclude.length; ei++) { if (exclude[ei].test(c)) { skip = true; break; } } if (skip) continue; }
    for (var j = 0; j < patterns.length; j++) {
      if (patterns[j].test(c)) {
        var score = patterns.length - j;
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

  useEffect(function() {
    var s = getStore();
    if (!s.activeId) { setLoading(false); return; }
    setHasData(true);
    fetch("/api/upload?id=" + s.activeId)
      .then(function(r) { return r.json(); })
      .then(function(d) { setData(d); })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }, []);

  if (loading) {
    return <div className="min-h-screen py-12"><div className="max-w-7xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[400px] glass mt-6" /></div></div>;
  }

  if (!hasData || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><BarChart3 className="w-10 h-10 text-primary-light/50" /></div>
          <h2 className="text-2xl font-bold mb-3">\u8BF7\u5148\u4E0A\u4F20\u6570\u636E</h2>
          <p className="text-white/40 mb-8">\u5DE5\u4F5C\u53F0\u9700\u8981\u6570\u636E\u624D\u80FD\u5DE5\u4F5C</p>
          <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"><Upload className="w-5 h-5" />\u4E0A\u4F20\u6570\u636E<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
        </motion.div>
      </div>
    );
  }

  var cols: string[] = data.columns || [];
  var allRows: any[] = data.rows || [];

  // Auto-detect columns
  var amtField = findCol(cols, [/\u5b9e\u4ed8/, /\u91d1\u989d/, /amount/, /\u4ef7\u683c/, /price/]);
  var dtField = findCol(cols, [/time|date/, /\u65f6\u95f4/, /\u65e5\u671f/, /\u4e0b\u5355/, /order/]);
  var prodField = findCol(cols, [/\u5546\u54c1/, /\u4ea7\u54c1/, /\u6807\u9898/, /\u5b9d\u8d1d/, /name|title/], [/\u5e97\u94fa/, /shop/]);
  var catField = findCol(cols, [/sku|category/, /\u5206\u7c7b/, /\u89c4\u683c/, /\u54c1\u7c7b/]);
  var addrField = findCol(cols, [/addr/, /\u5730\u5740/, /\u6536\u8d27/, /\u533a\u57df/]);

  // Filter by date range if date column found
  var rows = allRows;
  if (dtField) {
    rows = allRows.filter(function(r: any) {
      var dv = r[dtField];
      if (!dv) return true;
      var d = new Date(dv);
      if (isNaN(d.getTime())) return true;
      var daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= dateRange;
    });
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-3xl font-bold"><span className="gradient-text">\u6570\u636E\u5DE5\u4F5C\u53F0</span></h1><p className="text-sm text-white/40">{rows.length}/{allRows.length} \u6761\u8BB0\u5F55</p></div>
          </div>
        </motion.div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1.5">
            {[7,30,90].map(function(d) {
              return <button key={d} onClick={function(){setDateRange(d);}} className={"px-3 py-1 rounded-lg text-xs transition-all "+(dateRange===d?"bg-primary/20 text-white border border-primary/30":"text-white/40 hover:text-white/60")}>\u8FD1{d}\u5929</button>;
            })}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map(function(t, i) {
              var Icon = t.icon;
              return (
                <button key={t.key} onClick={function() { setActive(i); }} className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap " + (active === i ? "bg-primary/20 text-white border border-primary/30" : "text-white/50 hover:text-white/80 hover:bg-white/5")}>
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {active === 0 && <SalesTrend rows={rows} amountField={amtField} orderTimeField={dtField} dateRange={dateRange} aiSummary={amtField ? amtField + " trend data" : undefined} />}
          {active === 1 && <ProductRank rows={rows} productField={prodField} amountField={amtField} aiSummary={prodField ? "top products by " + amtField : undefined} />}
          {active === 2 && <CategoryBreakdown rows={rows} categoryField={catField || prodField} amountField={amtField} />}
          {active === 3 && <RegionMap rows={rows} addressField={addrField} amountField={amtField} />}
          {active === 4 && <AnomalyDetection rows={rows} amountField={amtField} />}
        </div>
      </div>
    </div>
  );
}
