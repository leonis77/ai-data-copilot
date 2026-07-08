"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Upload, MessageSquare, Sparkles, TrendingUp, Home } from "lucide-react";
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
  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06]"
      style={{ backdropFilter: "blur(20px)", background: "rgba(11,15,23,0.8)" }}
    >
      <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </motion.div>
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {t.nav.brand}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                  active ? "text-white bg-white/[0.08]" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                )}>
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {active && (
                  <motion.div layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.08]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
