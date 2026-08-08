"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pt-16">
      <div className="section-container py-8 md:py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand animate-pulse" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-gray-100 bg-white p-8 space-y-4">
              <Skeleton className="h-3 w-16" />
              {i === 3 ? (
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <Skeleton className="h-12 w-24" />
              )}
            </div>
          ))}
        </div>

        {/* Profit Bar */}
        <div className="rounded-2xl p-6 border border-gray-200 bg-white card space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
          <div className="md:col-span-3 rounded-2xl p-6 border border-gray-200 bg-white card space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="md:col-span-2 rounded-2xl p-6 border border-gray-200 bg-white card space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>

        {/* Diagnoses */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-5/6 rounded-xl" />
          </div>
        </div>

        {/* Actions + Cross-platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-2xl p-6 border border-gray-200 bg-white card space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl p-6 border border-gray-200 bg-white card space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
