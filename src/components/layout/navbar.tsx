"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Upload, MessageSquare, Sparkles, TrendingUp, Home, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const navItems = [
  { href: "/", label: t.nav.home, icon: Home },
  { href: "/upload", label: t.nav.upload, icon: Upload },
  { href: "/dashboard", label: t.nav.diagnosis, icon: BarChart3 },
  { href: "/workspace", label: t.nav.workspace, icon: TrendingUp },
  { href: "/chat", label: t.nav.chat, icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(function() {
    const onScroll = function() {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(function() { setMobileOpen(false); }, [pathname]);

  useEffect(function() {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return function() { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300",
          scrolled ? "glass-strong border-b-0" : "glass border-b-0"
        )}
      >
        <div className="section-container h-full flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 md:gap-3 group shrink-0">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 8 }}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-indigo group-hover:shadow-glow transition-shadow"
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            </motion.div>
            <span className="font-bold text-base md:text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent group-hover:from-indigo-300 group-hover:to-purple-300 transition-all">
              {t.nav.brand}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(function(item) {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group",
                    active ? "text-white" : "text-white/50 hover:text-white/80"
                  )}>
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.10]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  {!active && (
                    <div className="absolute inset-0 rounded-xl bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <item.icon className={cn("w-4 h-4 relative z-10", active ? "text-indigo-400" : "text-white/40 group-hover:text-white/70")} />
                  <span className="relative z-10">{item.label}</span>
                  {active && (
                    <ChevronRight className="w-3 h-3 text-indigo-400/60 relative z-10" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={function() { setMobileOpen(!mobileOpen); }}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={function() { setMobileOpen(false); }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] md:hidden glass-strong"
            >
              <div className="flex flex-col h-full pt-20 px-4">
                <button
                  onClick={function() { setMobileOpen(false); }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <nav className="flex flex-col gap-1.5">
                  {navItems.map(function(item, i) {
                    const active = pathname === item.href;
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                      >
                        <Link href={item.href}
                          onClick={function() { setMobileOpen(false); }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200",
                            active
                              ? "text-white bg-white/[0.08] border border-white/[0.08]"
                              : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                          )}>
                          <item.icon className={cn("w-5 h-5", active ? "text-indigo-400" : "text-white/30")} />
                          <span>{item.label}</span>
                          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-glow-indigo" />}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="mt-auto pb-8 pt-6 border-t border-white/[0.06]">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-400/50" />
                    <span className="text-xs text-white/30 font-medium">ProcureWise</span>
                  </div>
                  <p className="text-[10px] text-white/15 text-center">跨平台电商利润优化引擎</p>
                  <p className="text-[10px] text-white/10 text-center mt-1">© 2026 · Powered by DeepSeek V4</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

