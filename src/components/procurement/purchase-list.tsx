"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { PurchaseRecommendation, TaggedProduct } from "@/lib/procurement";
import { generatePurchaseList } from "@/lib/procurement";

interface PurchaseListProps {
  products: TaggedProduct[];
  categoryName: string;
  avgPrice: number;
}

export function PurchaseList({ products, categoryName, avgPrice }: PurchaseListProps) {
  const [rec, setRec] = useState<PurchaseRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    generatePurchaseList(products, categoryName, avgPrice).then(function(r) {
      setRec(r); setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl p-6 border border-indigo-500/10"
        style={{ backdropFilter: "blur(20px)", background: "radial-gradient(ellipse at 0% 0%, rgba(124,92,255,0.08), transparent 50%), rgba(17,24,39,0.5)" }}>
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 rounded-full border-2 border-indigo-400/20 border-t-indigo-400" />
          <p className="text-sm text-white/40">AI {"\u6b63\u5728\u5206\u6790\u4f9b\u8d27\u7ed3\u6784..."}</p>
        </div>
      </motion.div>
    );
  }

  if (!rec || !rec.topPicks || rec.topPicks.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="space-y-4">
      {/* Summary */}
      <div className="relative overflow-hidden rounded-2xl p-5 border border-indigo-500/10"
        style={{ backdropFilter: "blur(20px)", background: "radial-gradient(ellipse at 0% 0%, rgba(124,92,255,0.08), transparent 50%), rgba(17,24,39,0.5)" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-indigo-400/60 uppercase tracking-wider mb-2">AI {"\u8fdb\u8d27\u5efa\u8bae"}</p>
            <p className="text-sm text-white/60 leading-relaxed">{rec.summary}</p>
          </div>
        </div>
      </div>

      {/* Top Picks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-white/30 uppercase tracking-wider">{"\u63a8\u8350\u8fdb\u8d27"} ({rec.topPicks.length})</span>
        </div>
        <div className="space-y-2">
          {rec.topPicks.map(function(p, i) {
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }} whileHover={{ x: 2 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.05]"
                style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}>
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 w-6">
                  {["\ud83e\udd47","\ud83e\udd48","\ud83e\udd49"][i] || i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium">{p.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {"\u4f9b\u8d27"} {"\u00A5"}{p.price} {"\u2192 \u5efa\u8bae\u96f6\u552e"} {"\u00A5"}{p.suggestedRetail} {"\u00b7"} {p.reason}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/10" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Watch / Skip */}
      {(rec.watchList.length > 0 || rec.skipList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rec.watchList.length > 0 && (
            <div className="rounded-xl p-4 border border-amber-500/10 bg-amber-500/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400/70 font-medium">{"\u9700\u8c28\u614e"}</span>
              </div>
              {rec.watchList.map(function(p, i) {
                return <div key={i} className="text-xs text-white/40 mt-1.5">{"\u2022"} {p.name} {"\u00A5"}{p.price} - {p.concern}</div>;
              })}
            </div>
          )}
          {rec.skipList.length > 0 && (
            <div className="rounded-xl p-4 border border-red-500/10 bg-red-500/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400/70 font-medium">{"\u4e0d\u5efa\u8bae"}</span>
              </div>
              {rec.skipList.map(function(p, i) {
                return <div key={i} className="text-xs text-white/40 mt-1.5">{"\u2022"} {p.name} {"\u00A5"}{p.price} - {p.reason}</div>;
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
