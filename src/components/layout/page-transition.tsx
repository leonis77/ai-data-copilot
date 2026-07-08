"use client";

import { motion, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -12 }}
      transition={{ duration: prefersReduced ? 0 : 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
