"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  delay?: number;
  variant?: "default" | "elevated" | "subtle" | "glow" | "gradient";
}

const variantStyles: Record<string, string> = {
  default: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
  elevated: "bg-surface border border-white/[0.08] rounded-2xl shadow-elevated",
  subtle: "bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl",
  glow: "bg-surface border border-primary/20 rounded-2xl shadow-glow",
  gradient: "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border border-indigo-500/20 rounded-2xl",
};

export function GlassCard({
  children,
  className,
  hover = true,
  gradient = false,
  delay = 0,
  variant = "default"
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        variantStyles[variant],
        hover && "transition-all duration-300 hover:bg-white/[0.07]",
        className
      )}
    >
      {gradient && <div className="gradient-border" />}
      {children}
    </motion.div>
  );
}

export function GlassCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-between mb-4", className)}>{children}</div>;
}

export function GlassCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("", className)}>{children}</div>;
}

export function GlassCardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-4 pt-4 border-t border-white/[0.06]", className)}>{children}</div>;
}
