"use client";

/**
 * AuthProvider — Reads the Supabase session and exposes the current
 * authenticated user to the entire app via React context.
 *
 * Replaces the hardcoded `ME` constant from lib/seed.ts.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { PEOPLE } from "@/lib/seed";
import type { Person } from "@/lib/types";

interface AuthContextValue {
  /** The currently logged-in user, resolved from Supabase session metadata → PEOPLE. */
  currentUser: Person | null;
  /** The Supabase user ID (UUID) — used for presence channels. */
  userId: string | null;
  /** Whether the auth state is still loading. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  userId: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Resolves a Supabase auth user to a PEOPLE entry by matching email.
 * Falls back to user_metadata for display info if no PEOPLE match.
 */
function resolveUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Person {
  // Try matching by email first
  const email = supabaseUser.email?.toLowerCase();
  const match = PEOPLE.find((p) => p.email.toLowerCase() === email);
  if (match) return match;

  // Fallback: build a Person from Supabase user_metadata
  const meta = supabaseUser.user_metadata ?? {};
  return {
    id: supabaseUser.id,
    initials: (meta.initials as string) ?? "??",
    fullName: (meta.full_name as string) ?? supabaseUser.email ?? "Unknown",
    email: supabaseUser.email ?? "",
    role: (meta.role as "admin" | "member") ?? "member",
    hue: (meta.hue as number) ?? 200,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(resolveUser(session.user));
        setUserId(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(resolveUser(session.user));
        setUserId(session.user.id);
      } else {
        setCurrentUser(null);
        setUserId(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userId, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
