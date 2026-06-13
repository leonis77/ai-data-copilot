"use client";

import { motion } from "framer-motion";

export function HealthCard({ score, breakdown }: { score: number; breakdown?: {category:string;score:number;maxScore:number}[] }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const bg = score >= 80 ? "bg-green-400/10" : score >= 60 ? "bg-yellow-400/10" : "bg-red-400/10";
  const ring = score >= 80 ? "border-green-400/30" : score >= 60 ? "border-yellow-400/30" : "border-red-400/30";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
      <div className="flex items-center gap-5">
        <div className={"w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0 " + ring + " " + bg}>
          <span className={"text-2xl font-bold " + color}>{score}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wide">经营健康分</h3>
          <p className="text-xs text-white/30 mt-1">综合库存、销量、结构、价格</p>
          {breakdown && (
            <div className="flex gap-3 mt-3">
              {breakdown.map(function(b, i) {
                const pct = Math.round(b.score/b.maxScore*100);
                var cls = pct >= 80 ? "w-1.5 h-1.5 rounded-full bg-green-400" : pct >= 50 ? "w-1.5 h-1.5 rounded-full bg-yellow-400" : "w-1.5 h-1.5 rounded-full bg-red-400"; return <div key={i} className="flex items-center gap-1"><div className={cls} /><span className="text-xs text-white/30">{b.category}</span></div>;
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
