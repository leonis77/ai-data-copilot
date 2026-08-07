"use client";

import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BarChart3,
  Globe,
  Brain,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getStore } from "@/lib/store";

// ═══ Animations ═══

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: function (opts?: { delay?: number }) {
    return {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: opts?.delay ?? 0, ease: [0.16, 1, 0.3, 1] },
    };
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// ═══ Features ═══

const FEATURES = [
  { icon: BarChart3, title: "智能利润分析", desc: "自动计算四大平台真实利润，洞察盈利空间", color: "text-brand" },
  { icon: Globe, title: "跨平台对比", desc: "淘宝/京东/拼多多/抖音数据联动分析", color: "text-sky-500" },
  { icon: Brain, title: "AI 决策助手", desc: "基于数据驱动的采购与定价建议", color: "text-violet-500" },
];

// ═══ Password Strength ═══

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score: 25, label: "弱", color: "bg-red-400" };
  if (score <= 3) return { score: 50, label: "中", color: "bg-amber-400" };
  if (score <= 4) return { score: 75, label: "良", color: "bg-blue-400" };
  return { score: 100, label: "强", color: "bg-emerald-400" };
}

// ═══ Form Field Component ═══

function FormField({
  label,
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  testId,
}: {
  label: string;
  icon: React.ElementType;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  autoComplete?: string;
  testId?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <motion.div variants={fadeInUp} className="space-y-1.5">
      <label className="text-xs font-semibold text-tertiary uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon className="w-4 h-4 text-faint" />
        </div>
        <input
          type={inputType}
          value={value}
          onChange={function (e) { onChange(e.target.value); }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          data-testid={testId}
          className={cn(
            "w-full pl-10 pr-10 py-3 rounded-xl text-sm transition-all duration-200 outline-none",
            "bg-white border text-primary placeholder:text-faint",
            "focus:border-brand/40 focus:ring-4 focus:ring-brand/5",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/5"
              : "border-gray-200 hover:border-gray-300"
          )}
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={function () { setShowPassword(!showPassword); }}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-faint hover:text-secondary transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

// ═══ Password Strength Bar ═══

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex items-center gap-2 mt-2"
    >
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          key={strength.score}
          initial={{ width: 0 }}
          animate={{ width: strength.score + "%" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={"h-full rounded-full " + strength.color}
        />
      </div>
      <span className={"text-xs font-medium " + (strength.score <= 50 ? "text-amber-500" : "text-emerald-500")}>
        {strength.label}
      </span>
    </motion.div>
  );
}

// ═══ Main Auth Page ═══

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, user, loading, initialized } = useAuth();

  // 已登录用户根据数据状态跳转：有数据 → 仪表盘，无数据 → 上传页
  useEffect(function () {
    if (initialized && user && !loading) {
      const store = getStore(user.id);
      const redirect = store.activeId && store.datasets.length > 0
        ? "/dashboard"
        : "/upload";
      router.replace(redirect);
    }
  }, [user, loading, initialized, router]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "请输入有效的邮箱地址" : "";
  const passwordError = password.length > 0 && password.length < 8 ? "密码至少 8 位" : "";
  const confirmError = confirmPassword && password !== confirmPassword ? "两次输入的密码不一致" : "";

  const canSubmit = email && password && !emailError && !passwordError && !confirmError && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setNeedsConfirmation(false);

    if (!canSubmit) return;

    setSubmitting(true);

    try {
      if (mode === "login") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
          setSubmitting(false);
        }
        // 成功：AuthProvider 触发 onAuthStateChange → 自动跳转
      } else {
        if (password !== confirmPassword) {
          setError("两次输入的密码不一致");
          setSubmitting(false);
          return;
        }
        const result = await signUp(email, password, name);
        if (result.error) {
          setError(result.error);
          setSubmitting(false);
        } else {
          setNeedsConfirmation(true);
          setSuccess("注册成功！请检查邮箱完成验证。");
          setSubmitting(false);
        }
      }
    } catch (e: any) {
      setError(e.message || "操作失败，请稍后重试");
      setSubmitting(false);
    }
  }

  // 认证初始化中
  if (loading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-gradient">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand animate-pulse" />
          </div>
          <p className="text-sm text-tertiary">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-mesh-gradient relative overflow-hidden">
      {/* ═══ Ambient Orbs ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="ambient-orb ambient-orb--blue" style={{ width: 500, height: 500, top: "-10%", left: "-5%" }} />
        <div className="ambient-orb ambient-orb--cyan" style={{ width: 400, height: 400, bottom: "-8%", right: "-3%" }} />
        <div className="ambient-orb ambient-orb--emerald" style={{ width: 300, height: 300, top: "50%", left: "30%" }} />
      </div>

      {/* ═══ Left Panel — Brand (desktop) ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between relative z-10 p-12 xl:p-16"
      >
        <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-cyan-500 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">ProcureWise</span>
          </motion.div>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
          <motion.h1 variants={fadeInUp} className="text-4xl xl:text-5xl font-extrabold text-primary leading-tight tracking-tight">
            用数据驱动
            <br />
            <span className="gradient-text">每一个采购决策</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg text-secondary leading-relaxed max-w-md">
            上传销售数据与进货成本，AI 自动计算真实利润，告诉你下一步该采购什么。
          </motion.p>

          <motion.div variants={staggerContainer} className="space-y-4">
            {FEATURES.map(function (feature, i) {
              const Icon = feature.icon;
              return (
                <motion.div key={i} variants={fadeInUp} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 border border-white/80" style={{ backdropFilter: "blur(12px)" }}>
                  <div className={"w-10 h-10 rounded-xl flex items-center justify-center shrink-0 " + (i === 0 ? "bg-blue-50" : i === 1 ? "bg-sky-50" : "bg-violet-50")}>
                    <Icon className={"w-5 h-5 " + feature.color} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-tertiary leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }} className="text-xs text-faint">
          © 2026 · Powered by DeepSeek V4 · 跨平台电商利润优化引擎
        </motion.div>
      </motion.div>

      {/* ═══ Right Panel — Auth Form ═══ */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="flex-1 flex items-center justify-center relative z-10 p-6 sm:p-8"
      >
        <div className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-cyan-500 flex items-center justify-center shadow-glow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-primary tracking-tight">ProcureWise</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-white/80 overflow-hidden"
            style={{ backdropFilter: "blur(24px) saturate(1.2)", background: "rgba(255,255,255,0.85)", boxShadow: "0 20px 40px -12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)" }}
          >
            <div className="px-8 pt-8 pb-6" style={{ background: "linear-gradient(180deg, rgba(37,99,235,0.03) 0%, transparent 100%)" }}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-2xl font-bold text-primary tracking-tight">{mode === "login" ? "欢迎回来" : "创建账户"}</h2>
                <p className="text-sm text-tertiary mt-1.5">{mode === "login" ? "登录你的 ProcureWise 账户" : "免费注册，开始数据驱动的经营分析"}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex items-center gap-1 mt-6 p-1 bg-gray-50/80 rounded-xl border border-gray-100">
                <button onClick={function () { setMode("login"); setError(""); setSuccess(""); setNeedsConfirmation(false); }} className={cn("flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative", mode === "login" ? "text-primary bg-white shadow-sm" : "text-tertiary hover:text-secondary")}>
                  {mode === "login" && <motion.div layoutId="auth-tab-indicator" className="absolute inset-0 bg-white rounded-lg shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                  <span className="relative z-10">登录</span>
                </button>
                <button onClick={function () { setMode("register"); setError(""); setSuccess(""); setNeedsConfirmation(false); }} className={cn("flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative", mode === "register" ? "text-primary bg-white shadow-sm" : "text-tertiary hover:text-secondary")}>
                  {mode === "register" && <motion.div layoutId="auth-tab-indicator" className="absolute inset-0 bg-white rounded-lg shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                  <span className="relative z-10">注册</span>
                </button>
              </motion.div>
            </div>

            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {mode === "register" && (
                    <motion.div key="name-field" initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={{ duration: 0.25 }}>
                      <FormField label="姓名" icon={User} type="text" value={name} onChange={setName} placeholder="你的名字" autoComplete="name" testId="auth-name" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <FormField label="邮箱" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="name@example.com" error={emailError} autoComplete="email" testId="auth-email" />

                <div className="space-y-1.5">
                  <FormField label="密码" icon={Lock} type={showPassword ? "text" : "password"} value={password} onChange={setPassword} placeholder={mode === "register" ? "至少 8 位字符，含字母和数字" : "输入密码"} error={passwordError} autoComplete={mode === "login" ? "current-password" : "new-password"} testId="auth-password" />
                  {mode === "register" && <PasswordStrengthBar password={password} />}
                </div>

                <AnimatePresence mode="wait">
                  {mode === "register" && (
                    <motion.div key="confirm-field" initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={{ duration: 0.25 }}>
                      <FormField label="确认密码" icon={Lock} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入密码" error={confirmError} autoComplete="new-password" testId="auth-confirm" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div key="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 leading-relaxed">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div key="auth-success" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-emerald-700 leading-relaxed">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button type="submit" disabled={!canSubmit} whileHover={canSubmit ? { scale: 1.01 } : {}} whileTap={canSubmit ? { scale: 0.98 } : {}} className={cn("w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2", canSubmit ? "bg-gradient-to-r from-brand to-blue-500 text-white shadow-md hover:shadow-lg hover:from-brand-dark hover:to-blue-600" : "bg-gray-100 text-faint cursor-not-allowed")} style={canSubmit ? { boxShadow: "0 4px 14px rgba(37,99,235,0.25)" } : {}} data-testid="auth-submit">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{mode === "login" ? "登录" : "创建账户"}</span><ArrowRight className="w-4 h-4" /></>}
                </motion.button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-faint">或</span></div>
              </div>

              {mode === "login" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <button type="button" onClick={function () { setError("请联系管理员重置密码"); }} className="text-xs text-brand hover:text-brand-dark transition-colors">忘记密码？</button>
                </motion.div>
              )}

              <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-faint"><Shield className="w-3.5 h-3.5" /><span className="text-xs">数据加密</span></div>
                <div className="w-1 h-1 rounded-full bg-gray-200" />
                <div className="flex items-center gap-1.5 text-faint"><Lock className="w-3.5 h-3.5" /><span className="text-xs">安全连接</span></div>
                <div className="w-1 h-1 rounded-full bg-gray-200" />
                <div className="flex items-center gap-1.5 text-faint"><Zap className="w-3.5 h-3.5" /><span className="text-xs">即时开通</span></div>
              </div>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-xs text-faint mt-6">
            登录即表示你同意我们的{" "}
            <Link href="#" className="text-brand hover:text-brand-dark transition-colors">服务条款</Link>{" "}
            和{" "}
            <Link href="#" className="text-brand hover:text-brand-dark transition-colors">隐私政策</Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
