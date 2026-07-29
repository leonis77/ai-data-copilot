"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Upload, BarChart3, Sparkles, MessageSquare, FileText, Zap, Shield, Layers, TrendingUp, AlertTriangle, Package, Target } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getStore } from "@/lib/store";

function Workbench() {
  var [data, setData] = useState<any>(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var s = getStore();
    if (s.activeId && s.datasets.length > 0) {
      var item = s.datasets.find(function(d) { return d.id === s.activeId; });
      setData({ name: item?.originalName, profile: item?.profile || "unknown", rowCount: item?.rowCount, datasets: s.datasets });
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="min-h-screen pt-20 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" /></div>;
  if (!data) return null;

  var profileLabel = data.profile === "order" ? "订单数据" : data.profile === "supply" ? "供货数据" : "通用数据";

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome header */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="mb-8">
          <p className="text-xs text-indigo-400/60 uppercase tracking-widest mb-2">{"经营工作台"}</p>
          <h1 className="text-3xl font-bold text-white/80 mb-2">{"今日概览"}</h1>
          <p className="text-sm text-white/30">{data.name} {"·"} {data.rowCount} {"行"} {"·"} {profileLabel}</p>
        </motion.div>

        {/* Data cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.08]"
            style={{backdropFilter:"blur(20px)",background:"radial-gradient(circle at 30% 20%,rgba(124,92,255,0.10),transparent 40%),rgba(17,24,39,0.5)"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-indigo-400" /></div><span className="text-sm text-white/50">{"已上传数据"}</span></div>
            <span className="text-3xl font-bold gradient-text">{data.datasets.length}</span>
            <span className="text-sm text-white/30 ml-2">{"份数据集"}</span>
          </motion.div>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.08]"
            style={{backdropFilter:"blur(20px)",background:"radial-gradient(circle at 30% 20%,rgba(124,92,255,0.10),transparent 40%),rgba(17,24,39,0.5)"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-400" /></div><span className="text-sm text-white/50">{"数据类型"}</span></div>
            <span className="text-xl font-bold text-white/80">{profileLabel}</span>
            <p className="text-xs text-white/30 mt-1">{data.rowCount} {"条记录"}</p>
          </motion.div>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.08]"
            style={{backdropFilter:"blur(20px)",background:"radial-gradient(circle at 30% 20%,rgba(124,92,255,0.10),transparent 40%),rgba(17,24,39,0.5)"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-400" /></div><span className="text-sm text-white/50">{"快速操作"}</span></div>
            <div className="space-y-2">
              <Link href="/dashboard" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowRight className="w-3 h-3 inline" /> {"查看诊断"}</Link>
              <Link href="/chat" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowRight className="w-3 h-3 inline" /> {" "}AI {"分析助手"}</Link>
              <Link href="/upload" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowRight className="w-3 h-3 inline" /> {" "}{"上传新数据"}</Link>
            </div>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="flex flex-wrap gap-4 justify-center">
          <Link href="/dashboard">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
              <Sparkles className="w-5 h-5" />{"查看利润看板"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
          <Link href="/upload">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/[0.08] text-white/60 hover:text-white font-semibold text-lg transition-all duration-300"
              style={{backdropFilter:"blur(12px)",background:"rgba(17,24,39,0.5)"}}>
              <Upload className="w-5 h-5" />{"上传更多数据"}
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

// Landing page when no data
function LandingPage() {
  var features = [
    { icon: Upload, title: "一键上传·自动识别平台", desc: "拖拽 Excel/CSV，AI自动识别淘宝/京东/拼多多/抖音数据格式" },
    { icon: TrendingUp, title: "真实利润计算", desc: "2026年四大平台独立费率引擎，淘宝/京东/拼多多/抖音各自计算真实利润" },
    { icon: Target, title: "采购决策引擎", desc: "AI告诉你哪个品该加量、哪个该砍掉、哪个供应商更划算" },
    { icon: Sparkles, title: "达人ROI分析", desc: "抖音A/B/C/D级达人佣金分级制下，自动计算每个达人的真实投放回报率" },
    { icon: AlertTriangle, title: "亏损自动预警", desc: "利润率负、价格倒挂、货品积压——红黄绿三色预警，立即发现问题" },
    { icon: Shield, title: "反幻觉四层防线", desc: "每个数字可溯源到原始数据行，AI不确定时明确说“不知道”" },
  ];

  return (
    <div className="min-h-screen">
      {/* Ambient glow — 保留极少量，避免画面发闷 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{background:"radial-gradient(circle,rgba(99,102,241,1) 0%,transparent 70%)",filter:"blur(100px)"}} />
      </div>

      <section className="relative min-h-screen flex items-center justify-center">
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-20">
          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10 border border-white/10" style={{backdropFilter:"blur(12px)",background:"rgba(17,24,39,0.5)"}}>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-sm text-white/60">{"跨平台电商利润优化引擎 · 2026"}</span>
            </div>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.15}} className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 px-2">
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">ProcureWise</span>
            <br />
            <span className="text-white/90 text-lg sm:text-2xl md:text-3xl font-normal mt-4 block">{"上传数据 · AI自动计算跨平台利润 · 告诉你该进什么货"}</span>
          </motion.h1>

          <motion.p initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.3}} className="text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed px-4">
            {"覆盖淘宝/京东/拼多多/抖音 · 2026年真实费率引擎 · 抖音达人ABCD级ROI自动计算 · 不是又一个AI工具，是帮你算清账、多赚钱的采购军师"}
          </motion.p>

          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.45}} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                <Upload className="w-5 h-5" />{"上传数据 · 30秒看利润"}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B0F17] to-transparent" />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {features.map(function(feature, i) {
            return (
              <motion.div key={i} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08,duration:0.5}}
                whileHover={{scale:1.02,borderColor:"#7C5CFF"}}
                className="group relative overflow-hidden rounded-2xl p-6 border border-white/[0.08]"
                style={{backdropFilter:"blur(12px)",background:"rgba(17,24,39,0.5)"}}>
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-white/40 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-white/80">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-6 text-center"><p className="text-sm text-white/25">ProcureWise {"©"} 2026 {"·"} Powered by DeepSeek V4</p></div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  var [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(function() {
    try {
      var s = getStore();
      setHasData(s.activeId !== "" && s.datasets.length > 0);
    } catch(e) { setHasData(false); }
  }, []);

  if (hasData === null) return <div className="min-h-screen pt-20 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" /></div>;

  return hasData ? <Workbench /> : <LandingPage />;
}
