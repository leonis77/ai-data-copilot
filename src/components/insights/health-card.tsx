"use client";

import { motion } from "framer-motion";
import { Shield, TrendingUp, Package, DollarSign } from "lucide-react";
import { t } from "@/lib/i18n";

interface HealthCardProps {
  score: number;
  breakdown?: { inventory?: number; sales?: number; structure?: number; pricing?: number };
}

function scoreColor(score: number): string {
  if (score >= 80) return "from-emerald-400 to-cyan-400";
  if (score >= 60) return "from-amber-400 to-orange-400";
  return "from-red-400 to-rose-400";
}

const rings = [
  { key: "inventory", label: t.health.inventory, icon: Package, color: "bg-sky-400" },
  { key: "sales", label: t.health.sales, icon: TrendingUp, color: "bg-violet-400" },
  { key: "structure", label: t.health.structure, icon: Shield, color: "bg-emerald-400" },
  { key: "pricing", label: t.health.pricing, icon: DollarSign, color: "bg-amber-400" },
];

export function HealthCard({ score, breakdown }: HealthCardProps) {
  const label = score >= 80 ? t.health.healthy : score >= 60 ? t.health.attention : t.health.alert;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
      style={{ backdropFilter: "blur(20px)", background: "radial-gradient(circle at 30% 20%, rgba(124,92,255,0.1), transparent 40%), radial-gradient(circle at 70% 80%, rgba(0,212,255,0.06), transparent 40%), rgba(17,24,39,0.6)" }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">{t.health.label}</p>
            <p className="text-sm text-white/40">{t.health.subtitle}</p>
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
            className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </motion.div>
        </div>

        <div className="flex justify-center mb-6">
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }} className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <motion.circle cx="60" cy="60" r="52" fill="none" stroke="url(#healthGradient)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 327} 327`}
                initial={{ strokeDasharray: "0 327" }}
                animate={{ strokeDasharray: `${(score / 100) * 327} 327` }}
                transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }} />
              <defs>
                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171"} />
                  <stop offset="100%" stopColor={score >= 80 ? "#22d3ee" : score >= 60 ? "#fb923c" : "#fb7185"} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className={`text-3xl font-black bg-gradient-to-r ${scoreColor(score)} bg-clip-text text-transparent`}>{score}</motion.span>
              <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                className={`text-xs font-medium ${score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>{label}</motion.span>
            </div>
          </motion.div>
        </div>

        {breakdown && (
          <div className="grid grid-cols-4 gap-2">
            {rings.map((ring, i) => {
              const val = (breakdown as any)[ring.key] || 0;
              return (
                <motion.div key={ring.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1 }} className="text-center">
                  <div className="relative w-10 h-10 mx-auto mb-1">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke={ring.color.replace("bg-", "")} strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${(val / 100) * 113} 113`} style={{ filter: "drop-shadow(0 0 3px currentColor)" }} />
                    </svg>
                    <ring.icon className="absolute inset-0 m-auto w-3.5 h-3.5 text-white/50" />
                  </div>
                  <p className="text-[10px] text-white/30">{ring.label}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
