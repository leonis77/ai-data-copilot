"use client";

import { AnimatePresence as FramerAnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function AnimatePresence({
  children,
  mode = "wait",
}: {
  children: React.ReactNode;
  mode?: "wait" | "sync" | "popLayout";
}) {
  const pathname = usePathname();
  return (
    <FramerAnimatePresence mode={mode}>
      <div key={pathname}>{children}</div>
    </FramerAnimatePresence>
  );
}
