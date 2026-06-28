"use client";

// Atlas toast notification system using Sonner.
// Provides a themed <AtlasToaster> component and a `notify` helper for
// triggering toasts from anywhere (store mutations, UI actions, etc.).

import { Toaster, toast } from "sonner";

export function AtlasToaster() {
  return (
    <Toaster
      position="bottom-right"
      offset={20}
      gap={8}
      toastOptions={{
        style: {
          background: "var(--glass-2)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border)",
          borderTopColor: "rgba(255, 255, 255, 0.1)",
          borderLeftColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--r)",
          boxShadow: "var(--shadow-2)",
          color: "var(--text)",
          fontFamily: "inherit",
          fontSize: "var(--text-sm)",
        },
      }}
    />
  );
}

// ── Typed toast helpers ───────────────────────────────────────────────────

export const notify = {
  /** Standard informational toast */
  info(message: string) {
    toast(message);
  },

  /** Success toast — green accent */
  success(message: string) {
    toast.success(message, {
      style: {
        borderLeftColor: "var(--status-done)",
        borderLeftWidth: 3,
      },
    });
  },

  /** Error toast — red accent */
  error(message: string) {
    toast.error(message, {
      style: {
        borderLeftColor: "var(--status-blocked)",
        borderLeftWidth: 3,
      },
    });
  },

  /** Warning toast — amber accent */
  warning(message: string) {
    toast.warning(message, {
      style: {
        borderLeftColor: "var(--warning)",
        borderLeftWidth: 3,
      },
    });
  },

  /** Destructive action with undo callback */
  undo(message: string, onUndo: () => void) {
    toast(message, {
      action: {
        label: "Undo",
        onClick: onUndo,
      },
      duration: 6000,
    });
  },
};
