"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sparkles } from "lucide-react";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, initialized, loading } = useAuth();
  const router = useRouter();

  useEffect(function () {
    if (initialized && !loading && !user) {
      router.replace("/auth");
    }
  }, [user, initialized, loading, router]);

  // Show the loading screen whenever the auth state has not yet confirmed
  // an authenticated user. This covers two windows:
  //   1. Auth bootstrap: loading || !initialized
  //   2. Post-bootstrap redirect: initialized && !loading && !user
  //      (the router.replace to /auth fires asynchronously, so without
  //      this guard the page briefly renders null / blank)
  if (loading || !initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-gradient">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand animate-pulse" />
          </div>
          <p className="text-sm text-tertiary">加载中...</p>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
}
