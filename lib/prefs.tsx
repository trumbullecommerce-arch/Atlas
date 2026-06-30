"use client";

// Per-user preferences, persisted both to localStorage (instant) and Supabase
// user_metadata (cross-device). Each user gets their own localStorage key
// (`atlas-prefs-{userId}`) and syncs to Supabase on every change.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";

export type SidebarMode = "fixed" | "collapsible" | "icon-rail";
export type ThemeMode = "dark" | "light";
export type DefaultView = "dashboard" | "board" | "list";

export interface Prefs {
  /**
   * "fixed": persistent 248px desktop sidebar.
   * "collapsible": hamburger-driven slide-out drawer.
   * "icon-rail": narrow ~56px icon strip, always visible.
   */
  sidebarMode: SidebarMode;
  /** Appearance: dark or light mode */
  theme: ThemeMode;
  /** Which view to open on login: dashboard, board, or list */
  defaultView: DefaultView;
}

export const DEFAULT_PREFS: Prefs = {
  sidebarMode: "fixed",
  theme: "dark",
  defaultView: "dashboard",
};

interface PrefsValue {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

/** Build the localStorage key — per-user when authenticated, generic fallback. */
function storageKey(userId: string | null): string {
  return userId ? `atlas-prefs-${userId}` : "atlas-prefs";
}

function load(userId: string | null): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    // Try user-specific key first
    const key = storageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      // Check if there are legacy prefs from the generic key to migrate
      if (userId) {
        const legacyRaw = window.localStorage.getItem("atlas-prefs");
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw) as Partial<Prefs>;
          return { ...DEFAULT_PREFS, ...parsed };
        }
      }
      // Check legacy theme key
      const legacyTheme = window.localStorage.getItem("atlas-theme");
      if (legacyTheme === "light" || legacyTheme === "dark") {
        return { ...DEFAULT_PREFS, theme: legacyTheme };
      }
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Apply the theme to the DOM — update data-mode + localStorage legacy key. */
function applyTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  document.documentElement.dataset.mode = theme;
  // Keep the legacy key in sync for the layout.tsx inline script (flash prevention)
  try { window.localStorage.setItem("atlas-theme", theme); } catch { /* */ }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Load prefs when auth state changes (login, logout, initial load)
  useEffect(() => {
    const userPrefs = load(userId);

    // If the user has Supabase metadata prefs, use those as the source of truth
    // (they represent cross-device prefs set from another machine)
    if (userId && typeof window !== "undefined") {
      import("@/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.user_metadata?.prefs) {
            const cloudPrefs = user.user_metadata.prefs as Partial<Prefs>;
            const merged = { ...DEFAULT_PREFS, ...cloudPrefs };
            setPrefs(merged);
            applyTheme(merged.theme);
            // Save merged prefs to localStorage
            try {
              window.localStorage.setItem(storageKey(userId), JSON.stringify(merged));
            } catch { /* */ }
            setLoaded(true);
            return;
          }
          // No cloud prefs yet — use local prefs
          setPrefs(userPrefs);
          applyTheme(userPrefs.theme);
          setLoaded(true);
        });
      });
    } else {
      setPrefs(userPrefs);
      applyTheme(userPrefs.theme);
      setLoaded(true);
    }
  }, [userId]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };

      // Save to user-specific localStorage
      try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch { /* */ }

      // Apply theme immediately if changed
      if (key === "theme") {
        applyTheme(value as ThemeMode);
      }

      // Sync to Supabase user_metadata (async, non-blocking)
      if (userId) {
        import("@/lib/supabase/client").then(({ createClient }) => {
          const supabase = createClient();
          supabase.auth.updateUser({
            data: { prefs: next },
          }).catch(() => { /* best-effort */ });
        });
      }

      return next;
    });
  }, [userId]);

  const value = useMemo<PrefsValue>(() => ({ prefs, setPref }), [prefs, setPref]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
