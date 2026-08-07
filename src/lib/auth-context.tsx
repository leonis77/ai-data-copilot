"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-client";
import type { User, Session } from "@supabase/supabase-js";
import { getStore, setStore } from "@/lib/store";

// ═══ Auth Context ═══

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ═══ Provider ═══

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  useEffect(function () {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(function ({ data: { session } }) {
      if (!mounted) return;
      setState(function (prev) {
        return {
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          initialized: true,
        };
      });
    }).catch(function () {
      if (!mounted) return;
      setState(function (prev) {
        return {
          user: null,
          session: null,
          loading: false,
          initialized: true,
        };
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(function (event, session) {
      if (!mounted) return;
      setState(function (prev) {
        return {
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          initialized: true,
        };
      });
    });

    return function () {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async function (email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message || "登录失败，请检查邮箱和密码" };
      }

      // Sync profile to localStorage store
      if (data.user) {
        syncProfileToStore(data.user);
      }

      return {};
    } catch (e: any) {
      return { error: e.message || "登录失败，请稍后重试" };
    }
  }, []);

  const signUp = useCallback(async function (email: string, password: string, name?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name || email.split("@")[0],
          },
        },
      });

      if (error) {
        return { error: error.message || "注册失败，请稍后重试" };
      }

      // Create profiles row (SSOT for user metadata)
      if (data.user) {
        try {
          await supabase.from("profiles").insert({
            id: data.user.id,
            email: email.trim(),
            role: "user",
            created_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Profile creation failed:", e);
        }
        syncProfileToStore(data.user);
      }

      return {};
    } catch (e: any) {
      return { error: e.message || "注册失败，请稍后重试" };
    }
  }, []);

  const signOut = useCallback(async function () {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      });
    }
  }, []);

  const resetPassword = useCallback(async function (email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? window.location.origin + "/auth?mode=reset" : "",
      });

      if (error) {
        return { error: error.message || "发送重置邮件失败" };
      }

      return {};
    } catch (e: any) {
      return { error: e.message || "发送重置邮件失败" };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══ Hook ═══

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

// ═══ Helpers ═══

function syncProfileToStore(user: User) {
  try {
    const s = getStore();
    s.auth = {
      userId: user.id,
      email: user.email || "",
      fullName: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || "",
      avatarUrl: (user.user_metadata as any)?.avatar_url || "",
    };
    setStore(s);
  } catch (e) {
    console.warn("Failed to sync profile to store:", e);
  }
}
