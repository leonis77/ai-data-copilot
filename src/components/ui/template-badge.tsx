"use client";

import { BadgeCheck } from "lucide-react";

export function TemplateBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-brand text-xs font-medium border border-blue-100">
      <BadgeCheck className="w-3.5 h-3.5" />
      {name}
    </span>
  );
}
