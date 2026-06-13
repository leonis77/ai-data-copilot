"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Upload, MessageSquare, FileText, Sparkles, GitCompare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "??", icon: Sparkles },
  { href: "/upload", label: "??", icon: Upload },
  { href: "/dashboard", label: "???", icon: BarChart3 },
  { href: "/workspace", label: "???", icon: TrendingUp },
  { href: "/chat", label: "AI ??", icon: MessageSquare },
  { href: "/compare", label: "??", icon: GitCompare },
  { href: "/report", label: "??", icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <motion.nav initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">Commerce Copilot</span>
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                  active ? "text-white bg-primary/20" : "text-white/50 hover:text-white hover:bg-white/5"
                )}>
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {active && (
                  <motion.div layoutId="nav-ind" className="absolute inset-0 rounded-xl bg-primary/20 border border-primary/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
