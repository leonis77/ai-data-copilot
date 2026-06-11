"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Upload, BarChart3, Sparkles, MessageSquare, FileText, Zap, Shield, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

const features = [
  { icon: Upload, title: "一键上传", desc: "支持 Excel / CSV 拖拽上传，自动解析数据结构" },
  { icon: BarChart3, title: "智能可视化", desc: "自动生成多维图表，分类占比、趋势分布一目了然" },
  { icon: Sparkles, title: "AI 深度分析", desc: "DeepSeek AI 驱动，自动发现数据洞察与风险" },
  { icon: MessageSquare, title: "对话式交互", desc: "基于数据自然语言问答，随时探索数据价值" },
  { icon: FileText, title: "自动报告", desc: "一键生成 PDF 分析报告，含图表与 AI 建议" },
  { icon: Shield, title: "数据安全", desc: "本地处理，敏感数据不出服务器" },
];

const floatingElements = [
  { icon: BarChart3, x: "10%", y: "20%", delay: 0 },
  { icon: Sparkles, x: "85%", y: "15%", delay: 0.5 },
  { icon: Layers, x: "15%", y: "70%", delay: 1 },
  { icon: Zap, x: "80%", y: "65%", delay: 1.5 },
  { icon: Shield, x: "50%", y: "85%", delay: 2 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.08) 0%, transparent 60%)",
            }}
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMTIxMjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtMi4yLTEuOC00LTQtNHMtNCAxLjgtNCA0IDEuOCA0IDQgNCA0LTEuOCA0LTR6bTAgMjRjMC0yLjItMS44LTQtNC00cy00IDEuOC00IDQgMS44IDQgNCA0IDQtMS44IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        </div>

        {/* Floating elements */}
        {floatingElements.map((el, i) => (
          <motion.div
            key={i}
            className="absolute hidden lg:block"
            style={{ left: el.x, top: el.y }}
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, delay: el.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="glass p-4 rounded-2xl">
              <el.icon className="w-6 h-6 text-primary-light/50" />
            </div>
          </motion.div>
        ))}

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
              <span className="text-sm text-white/60">AI 驱动的新一代数据分析工具</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-6"
          >
            <span className="gradient-text">AI Data Copilot</span>
            <br />
            <span className="text-white/90">数据驱动的智能决策</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            上传 Excel 数据，AI 自动分析趋势、发现异常、生成洞察报告。
            让数据为你的每一次决策提供依据。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/upload">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                开始分析
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl glass hover:bg-white/10 text-white/70 hover:text-white font-semibold text-lg transition-all duration-300"
              >
                查看演示
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">六大核心能力</span>
          </h2>
          <p className="text-white/40 text-lg">从数据导入到智能分析，全流程 AI 赋能</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <GlassCard key={i} delay={i * 0.1} gradient={i === 2}>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-light" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{feature.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">三步完成分析</span>
          </h2>
          <p className="text-white/40 text-lg">简单、高效、智能</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "上传数据", desc: "拖拽上传 Excel 或 CSV 文件，系统自动解析并识别字段", icon: Upload },
            { step: "02", title: "AI 分析", desc: "DeepSeek AI 自动分析数据，发现趋势、异常和机会点", icon: Sparkles },
            { step: "03", title: "获取洞察", desc: "一键生成可视化报告和决策建议，支持自然语言交互", icon: FileText },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative"
            >
              <GlassCard hover={false}>
                <div className="text-6xl font-black text-white/5 absolute top-4 right-6">{item.step}</div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent-purple/20 flex items-center justify-center mb-5">
                  <item.icon className="w-7 h-7 text-primary-light" />
                </div>
                <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </GlassCard>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-accent-purple/50" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1), rgba(6,182,212,0.08))",
          }}
        >
          <div className="absolute inset-0 backdrop-blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              准备好让 AI 成为你的
              <span className="gradient-text"> 数据分析师</span>？
            </h2>
            <p className="text-white/40 text-lg mb-8 max-w-xl mx-auto">
              无需编程，无需复杂配置，上传数据即可获得专业分析报告
            </p>
            <Link href="/upload">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                免费开始使用
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-white/30">
          AI Data Copilot &copy; 2025. Powered by DeepSeek AI.
        </div>
      </footer>
    </div>
  );
}
