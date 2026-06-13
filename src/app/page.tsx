"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Upload, BarChart3, Sparkles, MessageSquare, FileText, Brain, Zap } from "lucide-react";

const features = [
  { icon: Upload, title: "????", desc: "???? Excel / CSV???????" },
  { icon: Brain, title: "AI ??", desc: "DeepSeek ???????????" },
  { icon: BarChart3, title: "????", desc: "?????????????" },
  { icon: MessageSquare, title: "????", desc: "?????????????" },
  { icon: FileText, title: "????", desc: "?????????????" },
  { icon: Zap, title: "????", desc: "P0/P1/P2 ???????????" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, rgba(99,102,241,1) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, rgba(168,85,247,1) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, rgba(6,182,212,1) 0%, transparent 70%)", filter: "blur(120px)" }} />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10 border border-white/[0.06]" style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-sm text-white/50">AI ???????????</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }} className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Commerce Copilot</span>
            <br />
            <span className="text-white/80 text-2xl md:text-3xl font-normal mt-4 block">
              ? AI ?????????
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }} className="text-lg text-white/30 max-w-xl mx-auto mb-12 leading-relaxed">
            ?????? ? AI ???? ? ??????????
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="group flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                <Sparkles className="w-5 h-5" />
                ????
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-10 py-4 rounded-2xl border border-white/[0.06] text-white/50 hover:text-white/70 font-semibold text-lg transition-all duration-300" style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}>
                ????
              </motion.button>
            </Link>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B0F17] to-transparent" />
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <p className="text-xs text-indigo-400/60 uppercase tracking-widest mb-3">Capabilities</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white/80">??????</h2>
          <p className="text-white/30 text-lg">?????????? AI ??</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-2xl p-6 border border-white/[0.05] transition-colors hover:border-white/[0.1]"
              style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%)" }} />
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

      {/* Workflow */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="text-xs text-indigo-400/60 uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl font-bold mb-4 text-white/80">??????</h2>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "????", desc: "?? Excel ? CSV???????" },
              { step: "02", title: "AI ??", desc: "???? + ???? + ????" },
              { step: "03", title: "????", desc: "???????? + ????" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center border border-white/[0.06]" style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}>
                  <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{item.step}</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-white/70">{item.title}</h3>
                <p className="text-sm text-white/30">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-16 text-center border border-white/[0.06]"
          style={{ backdropFilter: "blur(20px)", background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05), rgba(6,182,212,0.04))" }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.3) 0%, transparent 60%)" }} />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white/80">
              ???? AI ????
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> ????? </span>
              ??
            </h2>
            <p className="text-white/30 text-lg mb-10">????????????????????????</p>
            <Link href="/upload">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                ??????
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-white/20">Commerce Copilot &copy; 2025 ? Powered by DeepSeek AI</p>
        </div>
      </footer>
    </div>
  );
}
