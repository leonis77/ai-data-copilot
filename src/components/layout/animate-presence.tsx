"use client";

import { AnimatePresence as FramerAnimatePresence } from "framer-motion";

export function AnimatePresence({
  children,
  mode = "wait",
}: {
  children: React.ReactNode;
  mode?: "wait" | "sync" | "popLayout";
}) {
  return (
    <FramerAnimatePresence mode={mode}>
      {children}
    </FramerAnimatePresence>
  );
}
