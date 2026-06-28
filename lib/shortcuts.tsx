"use client";

// Atlas keyboard shortcuts system.
// Provides a `useShortcuts` hook that registers global keyboard listeners
// and a `ShortcutsPanel` component that shows all available shortcuts.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import type { ViewKey } from "@/lib/types";

/* ── Shortcut registry ─────────────────────────────────────────────────── */

interface ShortcutDef {
  key: string;
  label: string;
  description: string;
  group: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  // Navigation
  { key: "1", label: "1", description: "Dashboard", group: "Navigation" },
  { key: "2", label: "2", description: "Board", group: "Navigation" },
  { key: "3", label: "3", description: "List", group: "Navigation" },
  { key: "4", label: "4", description: "Calendar", group: "Navigation" },
  { key: "5", label: "5", description: "Timeline", group: "Navigation" },
  { key: "6", label: "6", description: "Audits", group: "Navigation" },
  // Actions
  { key: "c", label: "C", description: "Create new task", group: "Actions" },
  { key: "k", label: "⌘K", description: "Command palette", group: "Actions" },
  { key: "/", label: "/", description: "Focus search", group: "Actions" },
  { key: "Escape", label: "Esc", description: "Close panel", group: "Actions" },
  { key: "?", label: "?", description: "Show shortcuts", group: "Actions" },
];

const VIEW_MAP: Record<string, ViewKey> = {
  "1": "dashboard",
  "2": "board",
  "3": "list",
  "4": "calendar",
  "5": "timeline",
  "6": "audits",
};

/* ── Hook ──────────────────────────────────────────────────────────────── */

interface ShortcutActions {
  onNavigate: (view: ViewKey) => void;
  onNewTask: () => void;
  onCommandPalette: () => void;
  onClosePanel: () => void;
  onFocusSearch: () => void;
  onShowShortcuts: () => void;
}

export function useShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire shortcuts when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // ⌘K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        actions.onCommandPalette();
        return;
      }

      // Ignore if other modifiers are held (except shift for ?)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
          e.preventDefault();
          actions.onNavigate(VIEW_MAP[e.key]);
          break;
        case "c":
          e.preventDefault();
          actions.onNewTask();
          break;
        case "/":
          e.preventDefault();
          actions.onFocusSearch();
          break;
        case "Escape":
          actions.onClosePanel();
          break;
        case "?":
          e.preventDefault();
          actions.onShowShortcuts();
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);
}

/* ── Shortcuts help panel ──────────────────────────────────────────────── */

export function ShortcutsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const groups = SHORTCUTS.reduce<Record<string, ShortcutDef[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(2, 6, 23, 0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 101,
              width: "min(440px, 90vw)",
              background: "var(--glass-2)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-3)",
              padding: "var(--space-6)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Icon name="keyboard" size={18} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text)" }}>Keyboard shortcuts</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 28,
                  height: 28,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {Object.entries(groups).map(([group, items]) => (
              <div key={group} style={{ marginBottom: "var(--space-5)" }}>
                <div style={{
                  fontSize: "var(--text-2xs)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted-2)",
                  marginBottom: "var(--space-2)",
                }}>
                  {group}
                </div>
                {items.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-2) 0",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-soft)" }}>
                      {s.description}
                    </span>
                    <kbd
                      style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        fontFamily: "inherit",
                        color: "var(--muted)",
                        padding: "2px 8px",
                        borderRadius: "var(--r-xs)",
                        border: "1px solid var(--border)",
                        background: "var(--bg-2)",
                      }}
                    >
                      {s.label}
                    </kbd>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
