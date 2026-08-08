"use client";

/**
 * Landing Page v10.0 — 呼吸感升级版
 *
 * 升级重点：
 * - 更大留白：section py-32 → py-40，卡片 p-8 → p-10
 * - 动画分层：标题/描述/按钮依次入场，节奏感更强
 * - 视觉细节：渐变边框、微光效果、精致阴影
 * - 排版层次：字号对比更强烈，行高更宽松
 * - 交互反馈：卡片 hover 时边框渐变显现
 */

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, Upload, BarChart3, TrendingUp, Shield,
  Zap, CheckCircle2, ChevronRight, Menu, X,
} from "lucide-react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/hooks/use-auth-guard";

// ═══════════════════════════════════════════════
// 动画工具
// ═══════════════════════════════════════════════

function Reveal({ children, delay = 0, y = 24, x = 0, scale = false, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  scale?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: y, x: x, scale: scale ? 0.96 : 1 }}
      animate={inView ? { opacity: 1, y: 0, x: 0, scale: 1 } : { opacity: 0, y: y, x: x, scale: scale ? 0.96 : 1 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// 数据
// ═══════════════════════════════════════════════

var NAV_LINKS = [
  { label: "功能", href: "#features" },
  { label: "流程", href: "#how-it-works" },
  { label: "平台", href: "#platforms" },
];

var FEATURES = [
  {
    icon: Upload,
    title: "一键上传，自动识别",
    desc: "拖拽 Excel/CSV，AI 自动识别平台格式与字段映射，无需手动配置",
  },
  {
    icon: TrendingUp,
    title: "2026 真实费率引擎",
    desc: "四大平台独立费率计算，扣除佣金、运费、退货、达人佣金，还原真实利润",
  },
  {
    icon: Shield,
    title: "AI 采购决策建议",
    desc: "利润率、ROI、价格倒挂，AI 自动判定加量 / 维持 / 减量 / 停止",
  },
  {
    icon: Zap,
    title: "亏损自动预警",
    desc: "负利润率、跨平台价差超30%、货品积压，三色预警立即发现隐藏亏损",
  },
  {
    icon: BarChart3,
    title: "跨平台利润对比",
    desc: "同一商品在淘宝/京东/拼多多/抖音的利润差异一目了然",
  },
  {
    icon: CheckCircle2,
    title: "数字可溯源",
    desc: "每个利润数字追溯到原始数据行，AI 不确定时明确说不知道",
  },
];

var STATS = [
  { value: 4, suffix: "大平台", label: "淘宝 · 京东 · 拼多多 · 抖音" },
  { value: 30, suffix: "秒", label: "上传到利润报告" },
  { value: 2026, suffix: "费率", label: "最新平台费率实时更新" },
  { value: 100, suffix: "%", label: "数字可溯源，拒绝幻觉" },
];

var STEPS = [
  { num: "01", title: "上传数据", desc: "拖拽 Excel/CSV，支持多平台同时上传" },
  { num: "02", title: "AI 自动分析", desc: "识别平台、匹配字段、计算真实利润" },
  { num: "03", title: "获取决策", desc: "利润排名、亏损预警、跨平台对比" },
];

var PLATFORMS = [
  { name: "淘宝", accent: "#f97316" },
  { name: "天猫", accent: "#ef4444" },
  { name: "京东", accent: "#e11d48" },
  { name: "拼多多", accent: "#dc2626" },
  { name: "抖音", accent: "#171717" },
];

// ═══════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════

/** 导航栏 */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(function () {
    function onScroll() { setScrolled(window.scrollY > 20); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={"fixed top-0 left-0 right-0 z-50 transition-all duration-300 " + (scrolled ? "bg-white/90 backdrop-blur-md border-b border-gray-200/60 shadow-sm" : "bg-transparent")}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-[#0a0a0f] flex items-center justify-center group-hover:scale-110 transition-transform">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-[#0a0a0f] tracking-tight">ProcureWise</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(function (link) {
            return <a key={link.href} href={link.href} className="text-xs font-semibold text-gray-600 hover:text-[#0a0a0f] transition-colors uppercase tracking-wider">{link.label}</a>;
          })}
        </div>

        <div className="hidden md:block">
          <Link href="/upload" className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#0a0a0f] hover:bg-gray-800 px-4 py-2 rounded-lg transition-all hover:shadow-lg">
            上传数据
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button className="md:hidden text-gray-600" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="md:hidden bg-white/95 backdrop-blur-md border-b border-gray-200 px-6 py-4 space-y-3">
          {NAV_LINKS.map(function (link) {
            return <a key={link.href} href={link.href} className="block text-xs font-semibold text-gray-600 py-2" onClick={() => setOpen(false)}>{link.label}</a>;
          })}
          <Link href="/upload" className="block text-xs font-bold text-white bg-[#0a0a0f] px-4 py-2.5 rounded-lg text-center" onClick={() => setOpen(false)}>
            上传数据
          </Link>
        </motion.div>
      )}
    </motion.nav>
  );
}

/** 特性卡片 */
function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon;
  var accent = "#2563EB";
  var accentLight = "#EFF6FF";
  return (
    <Reveal delay={index * 0.1} y={32} scale>
      <div className="group relative h-full rounded-2xl border-2 border-gray-100 bg-white p-8 md:p-10 transition-all duration-500 hover:shadow-xl hover:border-gray-200 overflow-hidden">
        {/* 渐变边框光晕 */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${accent}15 0%, transparent 50%)`,
            boxShadow: `inset 0 0 0 1px ${accent}25`,
          }} />

        {/* 图标 */}
        <div className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
          style={{ backgroundColor: accentLight, color: accent }}>
          <Icon className="w-6 h-6" />
        </div>

        {/* 标签 */}
        <div className="relative inline-block px-3 py-1 rounded-lg text-xs font-bold mb-4 border transition-colors duration-300"
          style={{
            backgroundColor: accentLight,
            color: accent,
            borderColor: accent + "30",
          }}>
          {feature.title.split("，")[0]}
        </div>

        <h3 className="relative text-lg font-bold text-[#0a0a0f] mb-3 tracking-tight leading-snug">{feature.title}</h3>
        <p className="relative text-sm text-gray-600 leading-relaxed">{feature.desc}</p>

        {/* 底部渐变线 */}
        <div className="absolute bottom-0 left-8 right-8 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(to right, ${accent}60, ${accent}10)` }} />
      </div>
    </Reveal>
  );
}

/** 步骤 */
function StepItem({ step, index }: { step: typeof STEPS[0]; index: number }) {
  var accent = "#2563EB";
  return (
    <Reveal delay={index * 0.2} x={index % 2 === 0 ? -30 : 30} y={20}>
      <div className="flex items-start gap-6 md:gap-8 group">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-bold text-white shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
            style={{
              backgroundColor: accent,
              boxShadow: "0 20px 40px -10px " + accent + "50",
            }}>
            {step.num}
          </div>
          {index < STEPS.length - 1 && (
            <div className="hidden md:block absolute left-1/2 top-14 w-0.5 h-24 -translate-x-1/2"
              style={{ background: "linear-gradient(to bottom, " + accent + "40, transparent)" }} />
          )}
        </div>
        <div className="flex-1 pt-3">
          <h4 className="text-xl font-bold text-[#0a0a0f] mb-2 tracking-tight">{step.title}</h4>
          <p className="text-base text-gray-600 leading-relaxed">{step.desc}</p>
        </div>
      </div>
    </Reveal>
  );
}

/** 数字指标 */
function StatBlock({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const countRef = useRef<HTMLSpanElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const inView = useInView(divRef, { once: true, margin: "-80px" });

  useEffect(function () {
    if (!inView || !countRef.current) return;
    var node = countRef.current;
    var startTime = performance.now();
    var duration = 2000;

    function step(now: number) {
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(stat.value * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [inView, stat.value]);

  return (
    <Reveal delay={index * 0.12} y={28} scale>
      <div ref={divRef} className="relative rounded-2xl border-2 border-gray-100 bg-white p-8 md:p-10 text-center overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-gray-200 group cursor-default">
        {/* 背景色块 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(135deg, #EFF6FF 0%, white 100%)" }} />

        <div className="relative">
          <div className="text-6xl md:text-7xl font-extrabold tracking-tighter mb-3 transition-transform duration-500 group-hover:scale-110"
            style={{ color: "#2563EB" }}>
            <span ref={countRef}>0</span>
          </div>
          <div className="text-base font-bold text-gray-700 mb-2">{stat.suffix}</div>
          <div className="text-sm text-gray-500 leading-relaxed">{stat.label}</div>
        </div>
      </div>
    </Reveal>
  );
}

/** 平台 badge */
function PlatformBadge({ platform, index }: { platform: typeof PLATFORMS[0]; index: number }) {
  return (
    <Reveal delay={index * 0.1} y={24} scale>
      <div className="flex items-center gap-3 px-6 py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:shadow-lg hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-default group">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white shadow-md group-hover:scale-110 transition-transform"
          style={{ backgroundColor: platform.accent }}>
          {platform.name[0]}
        </span>
        <span className="text-sm font-bold text-gray-700 group-hover:text-[#0a0a0f] transition-colors">{platform.name}</span>
      </div>
    </Reveal>
  );
}

// ═══════════════════════════════════════════════
// 页面
// ═══════════════════════════════════════════════

export default function HomePage() {
  const { user, loading, initialized } = useAuth();
  var [hasData, setHasData] = useState<boolean | null>(null);

  // 认证初始化完成前不判断 hasData，避免 user=null 时误判为无数据
  var initializing = !initialized || loading;

  useEffect(function () {
    if (initializing) return;
    try {
      var s = getStore(user?.id || "");
      setHasData(s.activeId !== "" && s.datasets.length > 0);
    } catch (e) { setHasData(false); }
  }, [initializing, user?.id]);

  if (hasData === null || initializing) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#0a0a0f] animate-spin" /></div>;
  }

  return (
    <div>
      {hasData ? <Workbench userId={user?.id || ""} /> : <LandingPage />}
    </div>
  );
}

function Workbench({ userId }: { userId: string }) {
  var [data, setData] = useState<any>(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var s = getStore(userId);
    if (s.activeId && s.datasets.length > 0) {
      var item = s.datasets.find(function(d: any) { return d.id === s.activeId; });
      setData({ name: item?.originalName, profile: item?.profile || "unknown", rowCount: item?.rowCount, datasets: s.datasets });
    }
    setLoading(false);
  }, [userId]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#0a0a0f] animate-spin" /></div>;
  if (!data) return null;

  var profileLabel = data.profile === "order" ? "订单数据" : data.profile === "supply" ? "供货数据" : "通用数据";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <Reveal>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">经营工作台</p>
          <h1 className="text-5xl md:text-6xl font-bold text-[#0a0a0f] tracking-tight mb-4">今日概览</h1>
          <p className="text-base text-gray-500">{data.name} · {data.rowCount} 行 · {profileLabel}</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          {[
            { label: "已上传数据", value: String(data.datasets.length), unit: "份数据集", accent: "#3b82f6" },
            { label: "数据类型", value: profileLabel, unit: "", accent: "#10b981" },
            { label: "快速操作", value: "", unit: "", isLinks: true },
          ].map(function (item, i) {
            return (
              <Reveal key={i} delay={i * 0.15} y={24}>
                <div className="rounded-2xl border-2 border-gray-100 bg-white p-8 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">{item.label}</p>
                  {item.isLinks ? (
                    <div className="space-y-4">
                      {["/dashboard", "/chat", "/upload"].map(function (href, j) {
                        var labels = ["查看诊断", "AI分析助手", "上传新数据"];
                        return (
                          <Link key={href} href={href} className="flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all group/link" style={{ color: item.accent }}>
                            <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                            {labels[j]}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold" style={{ color: item.accent }}>{item.value}</span>
                      {item.unit && <span className="text-sm text-gray-400 font-medium">{item.unit}</span>}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/dashboard">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-8 py-3.5 rounded-xl bg-[#0a0a0f] text-white font-bold text-base flex items-center gap-2 hover:bg-gray-800 transition-colors">
              查看利润看板 <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-8 py-3.5 rounded-xl border-2 border-gray-200 text-[#0a0a0f] font-bold text-base hover:border-gray-300 transition-colors">
              上传更多数据
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-white text-[#0a0a0f]">
      {/* 导航 */}
      <Navbar />

      {/* ═══════════════════════════════════════
           Hero — 微渐变底色 + 柔光装饰
         ═══════════════════════════════════════ */}
      <section className="relative pt-36 pb-24 md:pt-52 md:pb-40 bg-mesh-gradient overflow-hidden">
        {/* 装饰柔光球 */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-blue-400/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-[15%] w-96 h-96 bg-cyan-400/[0.03] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-[40%] w-64 h-64 bg-emerald-400/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Reveal delay={0}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-gray-200 bg-white text-xs font-bold text-gray-700 mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  跨平台电商利润优化引擎 · 2026
                </div>
              </Reveal>

              <Reveal delay={0.15}>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-8">
                  上传数据，
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 bg-clip-text text-transparent">
                    AI 告诉你该进什么货
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.3}>
                <p className="text-lg md:text-xl text-gray-600 max-w-xl mb-10 leading-relaxed">
                  覆盖淘宝 / 京东 / 拼多多 / 抖音四大平台，2026 年真实费率引擎自动计算单品利润，AI 判定加量 / 维持 / 减量 / 停止。
                </p>
              </Reveal>

              <Reveal delay={0.45}>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link href="/upload">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="group px-8 py-4 rounded-2xl bg-[#0a0a0f] text-white font-bold text-base flex items-center gap-3 hover:bg-gray-800 transition-all hover:shadow-2xl">
                      上传数据 · 30秒看利润
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </Link>
                  <Link href="/dashboard">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="px-8 py-4 rounded-2xl border-2 border-gray-200 text-[#0a0a0f] font-bold text-base hover:border-gray-300 hover:bg-gray-50 transition-all">
                      查看利润看板
                    </motion.button>
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* 右侧视觉元素 - 抽象数据可视化 */}
            <Reveal delay={0.3} x={40}>
              <div className="hidden lg:block relative">
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  {/* 背景装饰圆 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl rotate-6 opacity-60" />
                  <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col justify-between">
                    {/* 顶部栏 */}
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                    {/* 数据卡片 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="text-xs text-blue-600 font-semibold mb-1">总利润</div>
                        <div className="text-2xl font-bold text-blue-700">¥128.5K</div>
                        <div className="text-xs text-emerald-600 font-medium mt-1">+23.5%</div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="text-xs text-emerald-600 font-semibold mb-1">利润率</div>
                        <div className="text-2xl font-bold text-emerald-700">32.8%</div>
                        <div className="text-xs text-emerald-600 font-medium mt-1">健康</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <div className="text-xs text-amber-600 font-semibold mb-1">预警</div>
                        <div className="text-2xl font-bold text-amber-700">3</div>
                        <div className="text-xs text-amber-600 font-medium mt-1">需关注</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="text-xs text-gray-600 font-semibold mb-1">商品数</div>
                        <div className="text-2xl font-bold text-gray-700">1,284</div>
                        <div className="text-xs text-gray-500 font-medium mt-1">4 平台</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.6}>
            <div className="mt-16 flex flex-wrap items-center gap-8 text-sm font-semibold text-gray-600">
              {["免费使用", "无需信用卡", "数据本地存储"].map(function (text, i) {
                return (
                  <span key={i} className={"flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600"}>
                    <CheckCircle2 className={"w-4 h-4"} />
                    <span>{text}</span>
                  </span>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           平台 Logo 墙 — 微渐变 + 点阵纹理
         ═══════════════════════════════════════ */}
      <section id="platforms" className="relative py-20 bg-dot-pattern border-y border-gray-100/80 overflow-hidden">
        {/* 装饰 */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/[0.02] rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <Reveal>
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mb-12">
              支持四大电商平台数据解析
            </p>
          </Reveal>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
            {PLATFORMS.map(function (platform, i) {
              return <PlatformBadge key={i} platform={platform} index={i} />;
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           数据指标 — 暖色渐变底色 + 大数字
         ═══════════════════════════════════════ */}
      <section id="stats" className="relative py-32 md:py-40 bg-warm-wash overflow-hidden">
        {/* 装饰柔光 */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/[0.025] rounded-full blur-3xl pointer-events-none translate-y-1/4 -translate-x-1/4" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-20 md:mb-24">
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-[#0a0a0f] leading-[1.1]">
                为电商采购者打造的
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 bg-clip-text text-transparent">决策引擎</span>
              </h2>
              <p className="text-gray-600 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
                从数据上传到利润决策，全流程 AI 驱动
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            {STATS.map(function (stat, i) {
              return <StatBlock key={i} stat={stat} index={i} />;
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           核心功能 — 冷色渐变底色
         ═══════════════════════════════════════ */}
      <section id="features" className="relative py-32 md:py-40 bg-cool-wash overflow-hidden">
        {/* 装饰 */}
        <div className="absolute top-20 left-0 w-[350px] h-[350px] bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-[300px] h-[300px] bg-indigo-500/[0.025] rounded-full blur-3xl pointer-events-none translate-x-1/4" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-20 md:mb-24">
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-[#0a0a0f] leading-[1.1]">
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 bg-clip-text text-transparent">六大核心能力</span>
              </h2>
              <p className="text-gray-600 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
                从数据接入到决策输出，覆盖采购全链路
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {FEATURES.map(function (feature, i) {
              return <FeatureCard key={i} feature={feature} index={i} />;
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           使用流程 — 微渐变底色 + 角标装饰
         ═══════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-32 md:py-40 bg-mesh-gradient overflow-hidden">
        {/* 角标装饰 */}
        <div className="corner-accent corner-accent--tl" />
        <div className="corner-accent corner-accent--br" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-20 md:mb-24">
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-[#0a0a0f] leading-[1.1]">
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 bg-clip-text text-transparent">三步开始</span>
              </h2>
              <p className="text-gray-600 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
                无需复杂配置，上传数据即可获得利润分析
              </p>
            </div>
          </Reveal>

          <div className="space-y-16 md:space-y-20">
            {STEPS.map(function (step, i) {
              return <StepItem key={i} step={step} index={i} />;
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           CTA — 微渐变 + 顶部分割线
         ═══════════════════════════════════════ */}
      <section className="relative py-32 md:py-40 bg-warm-wash border-t border-gray-100/80 overflow-hidden">
        {/* 顶部渐变分割线 */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
        {/* 装饰柔光 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-b from-blue-500/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-[#0a0a0f] leading-[1.1]">
                让每一笔采购<br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 bg-clip-text text-transparent">都有据可依</span>
              </h2>
              <p className="text-gray-600 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
                上传你的销售数据，30 秒获得跨平台利润分析与 AI 采购建议
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/upload">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="group px-12 py-5 rounded-2xl bg-[#0a0a0f] text-white font-bold text-lg flex items-center gap-3 hover:bg-gray-800 transition-all hover:shadow-2xl">
                  上传数据开始
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/dashboard">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="px-12 py-5 rounded-2xl border-2 border-gray-200 text-[#0a0a0f] font-bold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all">
                  查看利润看板
                </motion.button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           Footer
         ═══════════════════════════════════════ */}
      <footer className="border-t border-gray-100 py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0a0a0f] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#0a0a0f]">ProcureWise</span>
          </div>
          <p className="text-xs text-gray-400">ProcureWise © 2026 · 跨平台电商利润优化引擎</p>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <span>隐私政策</span>
            <span>使用条款</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
