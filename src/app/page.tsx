"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Upload, BarChart3, Sparkles, MessageSquare, FileText, Brain, Zap } from "lucide-react";

const features = [
  { icon: Upload, title: "\u4e00\u952e\u4e0a\u4f20", desc: "\u62d6\u62fd\u4e0a\u4f20 Excel / CSV\uff0c\u81ea\u52a8\u89e3\u6790\u8bc6\u522b" },
  { icon: Brain, title: "AI \u8bca\u65ad", desc: "DeepSeek \u81ea\u52a8\u53d1\u73b0\u7ecf\u8425\u95ee\u9898\u4e0e\u673a\u4f1a" },
  { icon: BarChart3, title: "\u667a\u80fd\u5206\u6790", desc: "\u591a\u7ef4\u5ea6\u6307\u6807\u8ba1\u7b97\uff0c\u53ef\u89c6\u5316\u5448\u73b0" },
  { icon: MessageSquare, title: "\u5bf9\u8bdd\u4ea4\u4e92", desc: "\u81ea\u7136\u8bed\u8a00\u95ee\u7b54\uff0c\u968f\u65f6\u63a2\u7d22\u6570\u636e" },
  { icon: FileText, title: "\u81ea\u52a8\u62a5\u544a", desc: "\u4e00\u952e\u751f\u6210\u5206\u6790\u62a5\u544a\uff0c\u652f\u6301\u6253\u5370" },
  { icon: Zap, title: "\u51b3\u7b56\u5efa\u8bae", desc: "P0/P1/P2 \u4f18\u5148\u7ea7\u6392\u5e8f\u7684\u53ef\u6267\u884c\u52a8\u4f5c" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, rgba(124,92,255,1) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, rgba(0,212,255,1) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      <section className="relative min-h-screen flex items-center justify-center">
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10 border border-white/[0.06]"
              style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-sm text-white/50">AI {"\u9a71\u52a8\u7684\u7535\u5546\u7ecf\u8425\u8bca\u65ad\u5e73\u53f0"}</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Commerce Copilot
            </span>
            <br />
            <span className="text-white/80 text-2xl md:text-3xl font-normal mt-4 block">
              {"\u8ba9 AI \u6210\u4e3a\u60a8\u7684\u6570\u636e\u5206\u6790\u5e08"}
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="text-lg text-white/30 max-w-xl mx-auto mb-12 leading-relaxed">
            {"\u4e0a\u4f20\u8ba2\u5355\u6570\u636e \u00b7 AI \u81ea\u52a8\u8bca\u65ad \u00b7 \u83b7\u53d6\u53ef\u6267\u884c\u7684\u7ecf\u8425\u5efa\u8bae"}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                <Sparkles className="w-5 h-5" />
                {"\u5f00\u59cb\u5206\u6790"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-10 py-4 rounded-2xl border border-white/[0.06] text-white/50 hover:text-white/70 font-semibold text-lg transition-all duration-300"
                style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}>
                {"\u67e5\u770b\u6f14\u793a"}
              </motion.button>
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B0F17] to-transparent" />
      </section>

      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <p className="text-xs text-indigo-400/60 uppercase tracking-widest mb-3">Capabilities</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white/80">{"\u516d\u5927\u6838\u5fc3\u80fd\u529b"}</h2>
          <p className="text-white/30 text-lg">{"\u4ece\u6570\u636e\u5230\u51b3\u7b56\uff0c\u5168\u6d41\u7a0b AI \u8d4b\u80fd"}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ scale: 1.03, borderColor: "#7C5CFF", transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-2xl p-6 border border-white/[0.05] transition-colors"
              style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,92,255,0.08) 0%, transparent 60%)" }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-white/30 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-white/70">{feature.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-center mb-16">
          <p className="text-xs text-indigo-400/60 uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl font-bold mb-4 text-white/80">{"\u4e09\u6b65\u5b8c\u6210\u5206\u6790"}</h2>
        </motion.div>
        <div className="relative">
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "\u4e0a\u4f20\u6570\u636e", desc: "\u62d6\u62fd Excel \u6216 CSV\uff0c\u81ea\u52a8\u89e3\u6790\u5b57\u6bb5" },
              { step: "02", title: "AI \u8bca\u65ad", desc: "\u6307\u6807\u8ba1\u7b97 + \u89c4\u5219\u5f15\u64ce + \u5f02\u5e38\u68c0\u6d4b" },
              { step: "03", title: "\u83b7\u53d6\u6d1e\u5bdf", desc: "\u53ef\u6267\u884c\u7684\u7ecf\u8425\u5efa\u8bae + \u5206\u6790\u62a5\u544a" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center relative">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center border border-white/[0.06]"
                  style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}>
                  <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{item.step}</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-white/70">{item.title}</h3>
                <p className="text-sm text-white/30">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-16 text-center border border-white/[0.06]"
          style={{ backdropFilter: "blur(20px)", background: "radial-gradient(circle at 20% 20%, rgba(124,92,255,0.1), transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,212,255,0.06), transparent 40%), rgba(17,24,39,0.4)" }}>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white/80">
              {"\u51c6\u5907\u597d\u8ba9 AI \u6210\u4e3a\u60a8\u7684"}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> {"\u6570\u636e\u5206\u6790\u5e08"} </span>
              {"\u5417\uff1f"}
            </h2>
            <p className="text-white/30 text-lg mb-10">{"\u65e0\u9700\u7f16\u7a0b\uff0c\u65e0\u9700\u590d\u6742\u914d\u7f6e\uff0c\u4e0a\u4f20\u6570\u636e\u5373\u53ef\u83b7\u5f97\u4e13\u4e1a\u5206\u6790"}</p>
            <Link href="/upload">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                {"\u514d\u8d39\u5f00\u59cb\u4f7f\u7528"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-white/20">Commerce Copilot {"\u00a9"} 2025 {"\u00b7"} Powered by DeepSeek AI</p>
        </div>
      </footer>
    </div>
  );
}
