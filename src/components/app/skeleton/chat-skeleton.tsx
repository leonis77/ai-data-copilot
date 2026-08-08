"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

export function ChatSkeleton() {
  return (
    <div className="min-h-screen pt-16">
      <div className="section-container py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Chat container */}
        <div className="flex flex-col h-[calc(100dvh-12rem)] rounded-2xl overflow-hidden border border-gray-200 card">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                {i % 2 !== 0 && <Skeleton className="w-8 h-8 rounded-lg shrink-0" />}
                <Skeleton
                  className={`h-16 rounded-2xl ${
                    i % 2 === 0 ? "w-3/4" : "w-2/3"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-3">
              <Skeleton className="flex-1 h-12 rounded-xl" />
              <Skeleton className="w-12 h-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
