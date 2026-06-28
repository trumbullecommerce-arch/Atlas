"use client";

// Atlas shared Popover primitive.
// Replaces the 5+ copy-pasted popover implementations across Topbar, Audits,
// Select, etc. with a single composable component that handles:
//   - Click-outside dismiss (scrim)
//   - Keyboard dismiss (Escape)
//   - Focus trapping (Tab cycles within the popover)
//   - Glass styling (consistent with the design system)
//   - Anchor positioning relative to a trigger element

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./Popover.module.css";

/* ── Context ────────────────────────────────────────────────────────────── */

interface PopoverCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const Ctx = createContext<PopoverCtx | null>(null);

function usePopover() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Popover compound components must be used within <Popover.Root>");
  return ctx;
}

/* ── Root ────────────────────────────────────────────────────────────────── */

interface RootProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Root({ children, open: controlledOpen, onOpenChange }: RootProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v);
      else setInternalOpen(v);
    },
    [onOpenChange],
  );

  return <Ctx.Provider value={{ open, setOpen, triggerRef }}>{children}</Ctx.Provider>;
}

/* ── Trigger ─────────────────────────────────────────────────────────────── */

interface TriggerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  asChild?: boolean;
}

function Trigger({ children, className, style }: TriggerProps) {
  const { open, setOpen, triggerRef } = usePopover();

  return (
    <button
      ref={triggerRef}
      type="button"
      className={className}
      style={style}
      aria-expanded={open}
      aria-haspopup="true"
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

/* ── Content ─────────────────────────────────────────────────────────────── */

type Align = "start" | "center" | "end";

interface ContentProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  align?: Align;
  sideOffset?: number;
  /** Width matches trigger width when true */
  matchWidth?: boolean;
}

function Content({
  children,
  className,
  style,
  align = "start",
  sideOffset = 6,
  matchWidth,
}: ContentProps) {
  const { open, setOpen, triggerRef } = usePopover();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, triggerRef]);

  // Focus trap — keep Tab within the panel
  useEffect(() => {
    if (!open || !panelRef.current) return;

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onTab);
    return () => window.removeEventListener("keydown", onTab);
  }, [open]);

  // Auto-focus first focusable on open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });
  }, [open]);

  const widthStyle = matchWidth && triggerRef.current
    ? { width: triggerRef.current.offsetWidth }
    : undefined;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible scrim — click outside to close */}
          <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" />

          <motion.div
            ref={panelRef}
            className={`${styles.content} ${className ?? ""}`}
            style={{
              ...widthStyle,
              marginTop: sideOffset,
              ...style,
            }}
            data-align={align}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Item (optional — for menu-style popovers) ──────────────────────────── */

interface ItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  disabled?: boolean;
}

function Item({ children, onClick, active, className, disabled }: ItemProps) {
  const { setOpen } = usePopover();

  return (
    <button
      type="button"
      className={`${styles.item} ${active ? styles.itemActive : ""} ${className ?? ""}`}
      disabled={disabled}
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      role="option"
      aria-selected={active}
    >
      {children}
    </button>
  );
}

/* ── Export compound component ───────────────────────────────────────────── */

export const Popover = { Root, Trigger, Content, Item };
