"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getStore } from "@/lib/store";

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, initialized, loading } = useAuth();
  const router = useRouter();

  useEffect(function () {
    if (initialized && !loading && !user) {
      router.replace("/auth");
    }
  }, [user, initialized, loading, router]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-tertiary">正在跳转到登录页...</p>
      </div>
    );
  }

  const store = getStore(user.id);
  const hasData = store.activeId && store.datasets.length > 0;

  if (!hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 pt-20">
        <div className="text-center max-w-md px-6">
          <h2 className="text-title mb-4 text-primary">Start your data analysis journey</h2>
          <p className="text-body mb-8">Upload Excel or CSV files</p>
          <a href="/upload" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl btn-primary text-lg">
            Upload Data
          </a>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
}
