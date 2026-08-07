"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-client";
import type { User, Session } from "@supabase/supabase-js";
import { getStore, setStore, clearUserStore, getUserKey } from "@/lib/store";
import { logger } from "@/lib/logger";
import { invalidateAuthTokenCache } from "@/lib/auth-fetch";

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

  // Keep a ref to the current user so onAuthStateChange can access it
  // without capturing a stale closure (the effect below has [] deps).
  var userRef = useRef<User | null>(null);
  useEffect(function () {
    userRef.current = state.user;
  }, [state.user]);

  useEffect(function () {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    logger.info("[AuthProvider] init start", {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY,
    });

    function withTimeout(promise: Promise<any>, ms: number, label: string): Promise<any> {
      return Promise.race([
        promise,
        new Promise(function(_, reject) {
          setTimeout(function() {
            reject(new Error(label + " timed out after " + ms + "ms"));
          }, ms);
        }),
      ]);
    }

    // Get initial session (10s timeout prevents permanent blank screen)
    withTimeout(supabase.auth.getSession(), 10_000, "[AuthProvider] getSession")
      .then(function ({ data: { session } }) {
        if (!mounted) return;
        logger.info("[AuthProvider] getSession resolved", { hasSession: !!session });
        setState(function (prev) {
          return {
            user: session?.user ?? null,
            session: session ?? null,
            loading: false,
            initialized: true,
          };
        });
        if (session?.user) {
          syncProfileToStore(session.user);
        }
      })
      .catch(function (err) {
        logger.error("[AuthProvider] getSession failed", { message: err instanceof Error ? err.message : String(err) });
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
    try {
      var subResult = supabase.auth.onAuthStateChange(function (event, session) {
        if (!mounted) return;
        // Use ref to capture the actual current user (not the stale closure value)
        var currentUser = userRef.current;
        setState(function (prev) {
          return {
            user: session?.user ?? null,
            session: session ?? null,
            loading: false,
            initialized: true,
          };
        });
        if (session?.user) {
          syncProfileToStore(session.user);
        }
        if (event === "SIGNED_OUT") {
          // Clean up user-specific localStorage on sign out
          invalidateAuthTokenCache();
          if (currentUser) {
            clearUserStore(currentUser.id);
          }
          // Also clear legacy key for backward compatibility
          try { localStorage.removeItem("aicopilot"); } catch {}
        }
      });
      subscription = subResult.data.subscription;
    } catch (e) {
      logger.error("[AuthProvider] onAuthStateChange subscription error", { message: e instanceof Error ? e.message : String(e) });
    }

    return function () {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async function (email: string, password: string) {
    logger.info("[AuthProvider] signIn start", { email });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        logger.warn("[AuthProvider] signIn error", { message: error.message });
        return { error: error.message || "登录失败，请检查邮箱和密码" };
      }

      if (data.user) {
        syncProfileToStore(data.user);
      }

      logger.info("[AuthProvider] signIn success", { userId: data.user?.id });
      return {};
    } catch (e: any) {
      logger.error("[AuthProvider] signIn exception", { message: e?.message || String(e) });
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
          logger.warn("Profile creation failed:", { message: e instanceof Error ? e.message : String(e) });
        }
        syncProfileToStore(data.user);
      }

      return {};
    } catch (e: any) {
      return { error: e.message || "注册失败，请稍后重试" };
    }
  }, []);

  const signOut = useCallback(async function () {
    // Capture user from ref to avoid dependency on state.user
    const currentUser = userRef.current;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      logger.error("Sign out error:", { message: e instanceof Error ? e.message : String(e) });
    } finally {
      // Immediately invalidate cached auth token
      invalidateAuthTokenCache();
      if (currentUser) {
        clearUserStore(currentUser.id);
      }
      try { localStorage.removeItem("aicopilot"); } catch {}
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
    const userId = user.id;
    const s = getStore(userId);
    // Migrate legacy store if needed
    var legacyRaw = localStorage.getItem("aicopilot");
    if (legacyRaw && !s.datasets.length) {
      try {
        var legacy = JSON.parse(legacyRaw);
        if (legacy.datasets && legacy.datasets.length > 0) {
          s.datasets = legacy.datasets.map(function (d: any) {
            return Object.assign({}, d, { userId });
          });
          s.activeId = legacy.activeId || s.activeId;
          s.columnConfig = legacy.columnConfig || null;
          setStore(userId, s);
          localStorage.removeItem("aicopilot");
        }
      } catch {}
    }
    s.auth = {
      userId: user.id,
      email: user.email || "",
      fullName: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || "",
      avatarUrl: (user.user_metadata as any)?.avatar_url || "",
    };
    setStore(userId, s);
  } catch (e) {
    logger.warn("Failed to sync profile to store:", { message: e instanceof Error ? e.message : String(e) });
  }
}
