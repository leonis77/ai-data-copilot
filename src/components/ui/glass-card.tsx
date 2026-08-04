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
  default: "card",
  elevated: "card-elevated",
  subtle: "card-subtle",
  glow: "bg-blue-50 border border-blue-100 rounded-xl shadow-glow-indigo",
  gradient: "bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/50 border border-blue-100/60 rounded-xl",
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
      whileHover={hover && variant !== "glow" ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        variantStyles[variant],
        hover && variant === "default" && "card-interactive",
        hover && variant === "elevated" && "hover:bg-gray-50 hover:border-gray-200 transition-all duration-200",
        gradient && "relative overflow-hidden",
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
  return <div className={cn("mt-4 pt-4 border-t border-gray-100", className)}>{children}</div>;
}

