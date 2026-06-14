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

  var profileLabel = data.profile === "order" ? "\u8ba2\u5355\u6570\u636e" : data.profile === "supply" ? "\u4f9b\u8d27\u6570\u636e" : "\u901a\u7528\u6570\u636e";

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome header */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="mb-8">
          <p className="text-xs text-indigo-400/60 uppercase tracking-widest mb-2">{"\u7ecf\u8425\u5de5\u4f5c\u53f0"}</p>
          <h1 className="text-3xl font-bold text-white/80 mb-2">{"\u4eca\u65e5\u6982\u89c8"}</h1>
          <p className="text-sm text-white/30">{data.name} {"\u00b7"} {data.rowCount} {"\u884c"} {"\u00b7"} {profileLabel}</p>
        </motion.div>

        {/* Data cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
            style={{backdropFilter:"blur(20px)",background:"radial-gradient(circle at 30% 20%,rgba(124,92,255,0.08),transparent 40%),rgba(17,24,39,0.5)"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-indigo-400" /></div><span className="text-sm text-white/40">{"\u5df2\u4e0a\u4f20\u6570\u636e"}</span></div>
            <span className="text-3xl font-bold gradient-text">{data.datasets.length}</span>
            <span className="text-sm text-white/30 ml-2">{"\u4efd\u6570\u636e\u96c6"}</span>
          </motion.div>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
            style={{backdropFilter:"blur(20px)",background:"radial-gradient(circle at 30% 20%,rgba(124,92,255,0.08),transparent 40%),rgba(17,24,39,0.5)"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-400" /></div><span className="text-sm text-white/40">{"\u6570\u636e\u7c7b\u578b"}</span></div>
            <span className="text-xl font-bold text-white/70">{profileLabel}</span>
            <p className="text-xs text-white/30 mt-1">{data.rowCount} {"\u6761\u8bb0\u5f55"}</p>
          </motion.div>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
            style={{backdropFilter:"blur(20px)",background:"radial-gradient(circle at 30% 20%,rgba(124,92,255,0.08),transparent 40%),rgba(17,24,39,0.5)"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-400" /></div><span className="text-sm text-white/40">{"\u5feb\u901f\u64cd\u4f5c"}</span></div>
            <div className="space-y-2">
              <Link href="/dashboard" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">{ArrowRight({className:"w-3 h-3 inline"}) as any} {"\u67e5\u770b\u8bca\u65ad"}</Link>
              <Link href="/chat" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">{ArrowRight({className:"w-3 h-3 inline"}) as any} {"\u00a0"}AI {"\u5206\u6790\u52a9\u624b"}</Link>
              <Link href="/upload" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">{ArrowRight({className:"w-3 h-3 inline"}) as any} {"\u00a0"}{"\u4e0a\u4f20\u65b0\u6570\u636e"}</Link>
            </div>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="flex flex-wrap gap-4 justify-center">
          <Link href="/dashboard">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
              <Sparkles className="w-5 h-5" />{"\u67e5\u770b\u7ecf\u8425\u8bca\u65ad"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
          <Link href="/upload">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/[0.06] text-white/50 hover:text-white/70 font-semibold text-lg transition-all duration-300"
              style={{backdropFilter:"blur(12px)",background:"rgba(17,24,39,0.5)"}}>
              <Upload className="w-5 h-5" />{"\u4e0a\u4f20\u66f4\u591a\u6570\u636e"}
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
    { icon: Upload, title: "\u4e00\u952e\u4e0a\u4f20", desc: "\u62d6\u62fd\u4e0a\u4f20 Excel / CSV\uff0c\u81ea\u52a8\u89e3\u6790\u8bc6\u522b" },
    { icon: Sparkles, title: "AI \u8bca\u65ad", desc: "DeepSeek \u81ea\u52a8\u53d1\u73b0\u7ecf\u8425\u95ee\u9898\u4e0e\u673a\u4f1a" },
    { icon: BarChart3, title: "\u667a\u80fd\u5206\u6790", desc: "\u591a\u7ef4\u5ea6\u6307\u6807\u8ba1\u7b97\uff0c\u53ef\u89c6\u5316\u5448\u73b0" },
    { icon: MessageSquare, title: "\u5bf9\u8bdd\u4ea4\u4e92", desc: "\u81ea\u7136\u8bed\u8a00\u95ee\u7b54\uff0c\u968f\u65f6\u63a2\u7d22\u6570\u636e" },
    { icon: FileText, title: "\u81ea\u52a8\u62a5\u544a", desc: "\u4e00\u952e\u751f\u6210\u5206\u6790\u62a5\u544a\uff0c\u652f\u6301\u6253\u5370" },
    { icon: Shield, title: "\u6570\u636e\u5b89\u5168", desc: "\u672c\u5730\u5904\u7406\uff0c\u6570\u636e\u4e0d\u51fa\u670d\u52a1\u5668" },
  ];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{background:"radial-gradient(circle,rgba(124,92,255,1) 0%,transparent 70%)",filter:"blur(100px)"}} />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{background:"radial-gradient(circle,rgba(0,212,255,1) 0%,transparent 70%)",filter:"blur(100px)"}} />
      </div>

      <section className="relative min-h-screen flex items-center justify-center">
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-20">
          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10 border border-white/[0.06]" style={{backdropFilter:"blur(12px)",background:"rgba(17,24,39,0.5)"}}>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-sm text-white/50">AI {"\u9a71\u52a8\u7684\u7535\u5546\u7ecf\u8425\u8bca\u65ad\u5e73\u53f0"}</span>
            </div>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.15}} className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Commerce Copilot</span>
            <br />
            <span className="text-white/80 text-2xl md:text-3xl font-normal mt-4 block">{"\u8ba9 AI \u6210\u4e3a\u60a8\u7684\u6570\u636e\u5206\u6790\u5e08"}</span>
          </motion.h1>

          <motion.p initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.3}} className="text-lg text-white/30 max-w-xl mx-auto mb-12 leading-relaxed">
            {"\u4e0a\u4f20\u8ba2\u5355\u6570\u636e \u00b7 AI \u81ea\u52a8\u8bca\u65ad \u00b7 \u83b7\u53d6\u53ef\u6267\u884c\u7684\u7ecf\u8425\u5efa\u8bae"}
          </motion.p>

          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.45}} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                <Sparkles className="w-5 h-5" />{"\u5f00\u59cb\u5206\u6790"}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B0F17] to-transparent" />
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(function(feature, i) {
            return (
              <motion.div key={i} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08,duration:0.5}}
                whileHover={{scale:1.02,borderColor:"#7C5CFF"}}
                className="group relative overflow-hidden rounded-2xl p-6 border border-white/[0.05]"
                style={{backdropFilter:"blur(12px)",background:"rgba(17,24,39,0.4)"}}>
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-white/30 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-white/70">{feature.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 text-center"><p className="text-sm text-white/20">Commerce Copilot {"\u00a9"} 2025 {"\u00b7"} Powered by DeepSeek AI</p></div>
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
