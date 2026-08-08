"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={prefersReduced ? undefined : { opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
      }}
      exit={
        prefersReduced
          ? undefined
          : { opacity: 0, y: -4, transition: { duration: 0.12, ease: "easeIn" } }
      }
    >
      {children}
    </motion.div>
  );
}
