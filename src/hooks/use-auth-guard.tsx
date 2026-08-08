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

  if (loading || !initialized) {
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-gradient">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <p className="text-sm text-tertiary">正在跳转到登录页...</p>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
}
