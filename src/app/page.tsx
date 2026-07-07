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
              <Link href="/dashboard" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowRight className="w-3 h-3 inline" /> {"\u67e5\u770b\u8bca\u65ad"}</Link>
              <Link href="/chat" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowRight className="w-3 h-3 inline" /> {"\u00a0"}AI {"\u5206\u6790\u52a9\u624b"}</Link>
              <Link href="/upload" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowRight className="w-3 h-3 inline" /> {"\u00a0"}{"\u4e0a\u4f20\u65b0\u6570\u636e"}</Link>
            </div>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="flex flex-wrap gap-4 justify-center">
          <Link href="/dashboard">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
              <Sparkles className="w-5 h-5" />{"\u67e5\u770b\u5229\u6da6\u770b\u677f"}
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
    { icon: Upload, title: "\u4e00\u952e\u4e0a\u4f20\u00b7\u81ea\u52a8\u8bc6\u522b\u5e73\u53f0", desc: "\u62d6\u62fd Excel/CSV\uff0cAI\u81ea\u52a8\u8bc6\u522b\u6dd8\u5b9d/\u4eac\u4e1c/\u62fc\u591a\u591a/\u6296\u97f3\u6570\u636e\u683c\u5f0f" },
    { icon: TrendingUp, title: "\u771f\u5b9e\u5229\u6da6\u8ba1\u7b97", desc: "2026\u5e74\u56db\u5927\u5e73\u53f0\u72ec\u7acb\u8d39\u7387\u5f15\u64ce\uff0c\u6dd8\u5b9d/\u4eac\u4e1c/\u62fc\u591a\u591a/\u6296\u97f3\u5404\u81ea\u8ba1\u7b97\u771f\u5b9e\u5229\u6da6" },
    { icon: Target, title: "\u91c7\u8d2d\u51b3\u7b56\u5f15\u64ce", desc: "AI\u544a\u8bc9\u4f60\u54ea\u4e2a\u54c1\u8be5\u52a0\u91cf\u3001\u54ea\u4e2a\u8be5\u780d\u6389\u3001\u54ea\u4e2a\u4f9b\u5e94\u5546\u66f4\u5212\u7b97" },
    { icon: Sparkles, title: "\u8fbe\u4ebaROI\u5206\u6790", desc: "\u6296\u97f3A/B/C/D\u7ea7\u8fbe\u4eba\u4f63\u91d1\u5206\u7ea7\u5236\u4e0b\uff0c\u81ea\u52a8\u8ba1\u7b97\u6bcf\u4e2a\u8fbe\u4eba\u7684\u771f\u5b9e\u6295\u653e\u56de\u62a5\u7387" },
    { icon: AlertTriangle, title: "\u4e8f\u635f\u81ea\u52a8\u9884\u8b66", desc: "\u5229\u6da6\u7387\u8d1f\u3001\u4ef7\u683c\u5012\u6302\u3001\u8d27\u54c1\u79ef\u538b\u2014\u2014\u7ea2\u9ec4\u7eff\u4e09\u8272\u9884\u8b66\uff0c\u7acb\u5373\u53d1\u73b0\u95ee\u9898" },
    { icon: Shield, title: "\u53cd\u5e7b\u89c9\u56db\u5c42\u9632\u7ebf", desc: "\u6bcf\u4e2a\u6570\u5b57\u53ef\u6eaf\u6e90\u5230\u539f\u59cb\u6570\u636e\u884c\uff0cAI\u4e0d\u786e\u5b9a\u65f6\u660e\u786e\u8bf4\u201c\u4e0d\u77e5\u9053\u201d" },
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
              <span className="text-sm text-white/50">{"\u8de8\u5e73\u53f0\u7535\u5546\u5229\u6da6\u4f18\u5316\u5f15\u64ce \u00b7 2026"}</span>
            </div>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.15}} className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">ProcureWise</span>
            <br />
            <span className="text-white/80 text-2xl md:text-3xl font-normal mt-4 block">{"\u4e0a\u4f20\u6570\u636e \u00b7 AI\u81ea\u52a8\u8ba1\u7b97\u8de8\u5e73\u53f0\u5229\u6da6 \u00b7 \u544a\u8bc9\u4f60\u8be5\u8fdb\u4ec0\u4e48\u8d27"}</span>
          </motion.h1>

          <motion.p initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.3}} className="text-lg text-white/30 max-w-2xl mx-auto mb-12 leading-relaxed">
            {"\u8986\u76d6\u6dd8\u5b9d/\u4eac\u4e1c/\u62fc\u591a\u591a/\u6296\u97f3 \u00b7 2026\u5e74\u771f\u5b9e\u8d39\u7387\u5f15\u64ce \u00b7 \u6296\u97f3\u8fbe\u4ebaABCD\u7ea7ROI\u81ea\u52a8\u8ba1\u7b97 \u00b7 \u4e0d\u662f\u53c8\u4e00\u4e2aAI\u5de5\u5177\uff0c\u662f\u5e2e\u4f60\u7b97\u6e05\u8d26\u3001\u591a\u8d5a\u94b1\u7684\u91c7\u8d2d\u519b\u5e08"}
          </motion.p>

          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.45}} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                <Upload className="w-5 h-5" />{"\u4e0a\u4f20\u6570\u636e \u00b7 30\u79d2\u770b\u5229\u6da6"}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
        <div className="max-w-7xl mx-auto px-6 text-center"><p className="text-sm text-white/20">ProcureWise {"\u00a9"} 2026 {"\u00b7"} Powered by DeepSeek V4</p></div>
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
