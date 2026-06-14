"use client";

import { motion } from "framer-motion";
import { Package, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import type { PriceAnalysis, TaggedProduct } from "@/lib/procurement";

interface SupplyHealthProps {
  price: PriceAnalysis;
  tagged: TaggedProduct[];
  datasetName: string;
}

export function SupplyHealth({ price, tagged, datasetName }: SupplyHealthProps) {
  const hot = tagged.filter(p => p.signals.includes("hot")).length;
  const newP = tagged.filter(p => p.signals.includes("new")).length;
  const value = tagged.filter(p => p.signals.includes("value")).length;
  const tail = tagged.filter(p => p.signals.includes("tail")).length;
  const caution = tagged.filter(p => p.signals.includes("caution")).length;
  const barPercent = Math.min(100, Math.round(((price.p75 - price.p25) / (price.max - price.min)) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
      style={{ backdropFilter: "blur(20px)", background: "radial-gradient(circle at 30% 20%, rgba(124,92,255,0.08), transparent 40%), rgba(17,24,39,0.5)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">{"\u4f9b\u8d27\u62a5\u4ef7\u8868"}</p>
          <p className="text-sm text-white/50">{datasetName}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-amber-400" />
        </div>
      </div>

      {/* Price stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text block">{price.skuCount}</span>
          <p className="text-xs text-white/30">SKU</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text block">{"\u00A5"}{price.median}</span>
          <p className="text-xs text-white/30">{"\u4e2d\u4f4d\u6570"}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xl font-bold gradient-text block">{"\u00A5"}{price.min}-{"\u00A5"}{price.max}</span>
          <p className="text-xs text-white/30">{"\u4ef7\u683c\u533a\u95f4"}</p>
        </div>
      </div>

      {/* Main range bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
          <span>{"\u00A5"}{price.min}</span>
          <span className="text-white/50">{price.mainRange} {"\u4e3b\u529b\u4ef7\u683c\u5e26"}</span>
          <span>{"\u00A5"}{price.max}</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: barPercent + "%" }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500/50 to-amber-400/80"
            style={{ marginLeft: Math.round((price.p25 / price.max) * 100) + "%" }}
          />
        </div>
      </div>

      {/* Signal tags */}
      <div className="flex flex-wrap gap-2">
        {hot > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {"\u1f525 \u4e3b\u63a8"} {hot}
          </span>
        )}
        {newP > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs text-sky-400">
            {"\ud83c\udd95 \u65b0\u54c1"} {newP}
          </span>
        )}
        {value > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            {"\ud83d\udcb0 \u9ad8\u6027\u4ef7\u6bd4"} {value}
          </span>
        )}
        {tail > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            {"\u26a0\ufe0f \u5c3e\u5b63"} {tail}
          </span>
        )}
        {caution > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-500/5 border border-red-500/10 text-xs text-red-300">
            {"\u274c \u8c28\u614e"} {caution}
          </span>
        )}
      </div>
    </motion.div>
  );
}
