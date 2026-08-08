"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence } from "@/components/layout/animate-presence";
import { PageTransition } from "@/components/layout/page-transition";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={pathname}>
        <main className="pt-16 relative z-10">{children}</main>
      </PageTransition>
    </AnimatePresence>
  );
}
