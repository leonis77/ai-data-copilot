"use client";

import { BadgeCheck } from "lucide-react";

export function TemplateBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary-light text-xs font-medium">
      <BadgeCheck className="w-3.5 h-3.5" />
      {name}
    </span>
  );
}
