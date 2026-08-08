"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

export function WorkspaceSkeleton() {
  return (
    <div className="min-h-screen py-12 pt-20">
      <div className="section-container space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-brand animate-pulse" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Date range + Tabs */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
            {[7, 30, 90].map((d) => (
              <Skeleton key={d} className="h-9 w-12 rounded-md" />
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11 w-24 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Chart area */}
        <div className="glass rounded-2xl p-6">
          <Skeleton className="h-8 w-40 mb-6" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
