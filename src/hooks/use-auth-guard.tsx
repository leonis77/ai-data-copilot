"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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

  return <div>{children}</div>;
}
