"use client";

// Lightweight per-user preferences, persisted to localStorage under "atlas-prefs".
// Deliberately tiny + extensible so more settings can be added later — add a key
// to Prefs + DEFAULT_PREFS and it's automatically loaded/saved.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SidebarMode = "fixed" | "collapsible";

export interface Prefs {
  /** "fixed": persistent desktop rail. "collapsible": hamburger-driven drawer. */
  sidebarMode: SidebarMode;
}

export const DEFAULT_PREFS: Prefs = {
  sidebarMode: "fixed",
};

const STORAGE_KEY = "atlas-prefs";

interface PrefsValue {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

function load(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  // Start from defaults on the server / first paint, then hydrate from storage
  // after mount to avoid SSR mismatch.
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(load());
  }, []);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<PrefsValue>(() => ({ prefs, setPref }), [prefs, setPref]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
