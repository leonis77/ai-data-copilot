"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Upload, MessageSquare, Sparkles, TrendingUp, Home, Menu, X, ChevronRight, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/", label: t.nav.home, icon: Home },
  { href: "/upload", label: t.nav.upload, icon: Upload },
  { href: "/dashboard", label: t.nav.diagnosis, icon: BarChart3 },
  { href: "/workspace", label: t.nav.workspace, icon: TrendingUp },
  { href: "/chat", label: t.nav.chat, icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, initialized, signOut } = useAuth();

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

  // Get user display name
  var displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  var userInitial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <>
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 border-b-0",
          scrolled ? "glass-strong" : "glass"
        )}
      >
        <div className="section-container h-full flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 md:gap-3 group shrink-0">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            </motion.div>
            <span className="font-bold text-base md:text-lg text-primary group-hover:text-brand transition-colors duration-200">
              {t.nav.brand}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map(function(item) {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    active ? "text-primary" : "text-tertiary hover:text-primary"
                  )}>
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-blue-50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  {!active && (
                    <div className="absolute inset-0 rounded-lg bg-gray-50 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                  )}
                  <item.icon className={cn("w-4 h-4 relative z-10 transition-colors duration-200", active ? "text-brand" : "text-gray-400")} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {initialized && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                    {userInitial}
                  </div>
                  <span className="text-sm font-medium text-primary max-w-[120px] truncate">
                    {displayName}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async function () {
                    await signOut();
                    router.push("/");
                  }}
                  className="p-2 rounded-lg text-faint hover:text-red-500 hover:bg-red-50 transition-all"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand text-white hover:bg-brand-dark transition-all shadow-sm hover:shadow-md"
                style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.2)" }}
              >
                <User className="w-3.5 h-3.5" />
                登录
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={function() { setMobileOpen(!mobileOpen); }}
            className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-tertiary hover:text-primary hover:bg-gray-50 transition-colors duration-200"
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
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={function() { setMobileOpen(false); }}
              className="fixed inset-0 z-40 bg-black/15 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.8 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] md:hidden glass-strong shadow-xl"
            >
              <div className="flex flex-col h-full pt-20 px-4">
                <button
                  onClick={function() { setMobileOpen(false); }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>

                <nav className="flex flex-col gap-1">
                  {navItems.map(function(item, i) {
                    const active = pathname === item.href;
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
                      >
                        <Link href={item.href}
                          onClick={function() { setMobileOpen(false); }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200",
                            active
                              ? "text-primary bg-blue-50"
                              : "text-secondary hover:text-primary hover:bg-gray-50"
                          )}>
                          <item.icon className={cn("w-5 h-5 transition-colors duration-200", active ? "text-brand" : "text-gray-400")} />
                          <span>{item.label}</span>
                          {active && (
                            <motion.span
                              layoutId="mobile-indicator"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-brand"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="mt-auto pb-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-brand/40" />
                    <span className="text-xs text-faint font-medium">ProcureWise</span>
                  </div>
                  <p className="text-xs text-faint text-center">跨平台电商利润优化引擎</p>
                  <p className="text-xs text-faint text-center mt-1">© 2026 · Powered by DeepSeek V4</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

