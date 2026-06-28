"use client";

// Reusable on-theme select. Mirrors the glass-popover pattern used by the
// Topbar's MarketplaceFilter / ScopeFilter: a trigger button showing the
// current label + chevron, a glass popover list with a check on the selected
// option, scrim + click-outside + Escape to close, and full keyboard support.
//
// Drop-in replacement for native <select> in the drawers/forms. The popover is
// absolutely positioned below the trigger (within the field); inside a scrolling
// drawer it may push/scroll, which is acceptable — it stays usable.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading icon node (rendered before the label). */
  icon?: ReactNode;
  /** Optional color dot (used when no icon is supplied). */
  color?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  // Index used for keyboard navigation while the listbox is open.
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();

  const selected = options.find((o) => o.value === value) ?? null;
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));

  // When opening, focus the list and start navigation on the current value.
  useEffect(() => {
    if (open) {
      setActiveIdx(selectedIdx);
      // Defer focus so the element is mounted.
      requestAnimationFrame(() => listRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes (and matches the rest of the app's popovers/drawers).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  function choose(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(activeIdx);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(options.length - 1);
    }
  }

  function leadingFor(opt: SelectOption | null): ReactNode {
    if (!opt) return null;
    if (opt.icon) return opt.icon;
    if (opt.color)
      return (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flex: "0 0 auto",
            background: opt.color,
            boxShadow: `0 0 6px ${opt.color}`,
          }}
        />
      );
    return null;
  }

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "9px 11px",
          borderRadius: 10,
          border: `1px solid ${open ? "var(--border-strong)" : "var(--border)"}`,
          background: "var(--bg-2)",
          color: selected ? "var(--text)" : "var(--muted)",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "inherit",
          cursor: "pointer",
          textAlign: "left",
          whiteSpace: "nowrap",
          boxShadow: open ? "var(--glow)" : "none",
          transition: "border-color var(--dur), box-shadow var(--dur)",
        }}
      >
        {leadingFor(selected)}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={14}
          style={{ color: "var(--muted)", flex: "0 0 auto", transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dur)" }}
        />
      </button>

      {open && (
        <>
          {/* Click-outside scrim. */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`${labelId}-opt-${activeIdx}`}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            className="glass"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% + 6px)",
              zIndex: 50,
              borderRadius: 12,
              padding: 5,
              maxHeight: 264,
              overflowY: "auto",
              boxShadow: "var(--shadow-3)",
              outline: "none",
            }}
          >
            {options.map((o, i) => {
              const on = o.value === value;
              const active = i === activeIdx;
              return (
                <button
                  key={o.value}
                  id={`${labelId}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: "8px 9px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12.5,
                    fontWeight: on ? 600 : 500,
                    fontFamily: "inherit",
                    color: on ? "var(--text)" : "var(--text-soft)",
                    background: active ? "rgba(255,255,255,0.05)" : "transparent",
                    transition: "background var(--dur)",
                  }}
                >
                  {leadingFor(o)}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                  {on && <Icon name="check" size={14} style={{ color: "var(--secondary)", flex: "0 0 auto" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
