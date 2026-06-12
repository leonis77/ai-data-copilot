"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface DiffItem { col: string; a: number; b: number; delta: number }
interface CompareData {
  metaA: { name: string; rows: number }; metaB: { name: string; rows: number };
  differences: Record<string, { a: number; b: number; delta: number }>;
  narrative: string;
}

export function CompareCard({ data }: { data: CompareData }) {
  if (!data || !data.differences) return null;
  var diffs: DiffItem[] = Object.entries(data.differences).map(function(e) { return { col: e[0], a: e[1].a, b: e[1].b, delta: e[1].delta }; });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="glass p-3 rounded-xl">
          <div className="text-xs text-white/40">{data.metaA.name}</div>
          <div className="text-lg font-bold text-accent-cyan">{data.metaA.rows} 行</div>
        </div>
        <div className="glass p-3 rounded-xl">
          <div className="text-xs text-white/40">{data.metaB.name}</div>
          <div className="text-lg font-bold text-accent-purple">{data.metaB.rows} 行</div>
        </div>
      </div>
      {diffs.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="text-xs text-white/40 px-4 py-2 border-b border-white/5">公共指标变化</div>
          <table className="w-full text-sm">
            <thead><tr className="text-white/30 text-xs">{["指标", "A", "B", "变化"].map(function(h,i){return <th key={i} className="p-3 text-left font-normal">{h}</th>})}</tr></thead>
            <tbody>
              {diffs.map(function(d) {
                var deltaClass = d.delta > 0 ? "text-green-400" : d.delta < 0 ? "text-red-400" : "text-white/50";
                var Icon = d.delta > 0 ? ArrowUp : d.delta < 0 ? ArrowDown : Minus;
                return (
                  <tr key={d.col} className="border-t border-white/5">
                    <td className="p-3 text-white/70">{d.col}</td>
                    <td className="p-3 text-white/50">{d.a}</td>
                    <td className="p-3 text-white/50">{d.b}</td>
                    <td className={"p-3 " + deltaClass}>
                      <span className="inline-flex items-center gap-1"><Icon className="w-3 h-3" />{d.delta >= 0 ? "+" : ""}{d.delta}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data.narrative && (
        <div className="glass p-4 rounded-xl text-sm text-white/60 leading-relaxed">{data.narrative}</div>
      )}
    </motion.div>
  );
}
