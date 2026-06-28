// Reusable visual primitives: avatars, pills, flags, meters.
// Style via the design tokens in globals.css.

"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { person } from "@/lib/seed";
import { MARKETPLACE_META, PRIORITY_META } from "@/lib/format";
import type { AuditItemStatus, Marketplace, Priority } from "@/lib/types";
import { Icon } from "./Icon";

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({
  personId,
  size = 24,
  ring = false,
}: {
  personId: string;
  size?: number;
  ring?: boolean;
}) {
  const p = person(personId);
  const initials = p?.initials ?? "?";
  const hue = p?.hue ?? 220;
  return (
    <span
      title={p?.fullName ?? initials}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: "#fff",
        background: `linear-gradient(135deg, hsl(${hue} 70% 56%), hsl(${(hue + 40) % 360} 64% 42%))`,
        boxShadow: ring
          ? `0 0 0 2px var(--surface), 0 0 0 3px hsl(${hue} 70% 56% / 0.5)`
          : "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({
  ids,
  size = 24,
  max = 4,
}: {
  ids: string[];
  size?: number;
  max?: number;
}) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {shown.map((id, i) => (
        <span
          key={id}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.32,
            zIndex: shown.length - i,
            borderRadius: "50%",
            boxShadow: "0 0 0 2px var(--surface)",
            display: "inline-flex",
          }}
        >
          <Avatar personId={id} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{
            marginLeft: -size * 0.32,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--surface-highest)",
            color: "var(--text-soft)",
            fontSize: size * 0.36,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 2px var(--surface)",
            zIndex: 0,
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

// ── Generic chip ──────────────────────────────────────────────────────────
export function Chip({
  children,
  color,
  tinted = true,
  icon,
  style,
}: {
  children: ReactNode;
  color: string;
  tinted?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 14px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
        color: tinted ? "#ffffff" : "var(--text-soft)",
        background: tinted ? color : "transparent",
        border: tinted ? "none" : "1px solid var(--border)",
        boxShadow: tinted ? `0 2px 8px color-mix(in srgb, ${color} 50%, transparent)` : "none",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

// ── Status pill (Monday.com Style Color Blocking) ───────────────────────────
const STATUS_PILL: Record<string, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "var(--muted)" },
  todo: { label: "To do", color: "#3B82F6" },
  doing: { label: "In progress", color: "#F59E0B" },
  review: { label: "Review", color: "#8B5CF6" },
  done: { label: "Verified", color: "#10B981" },
  blocked: { label: "Blocked", color: "#EF4444" },
};

export function StatusPill({ statusKey }: { statusKey: string }) {
  const s = STATUS_PILL[statusKey] ?? { label: statusKey, color: "#8c90a0" };
  const isNeutral = statusKey === "backlog";

  return (
    <Chip color={s.color} tinted={!isNeutral}>
      {s.label}
    </Chip>
  );
}

// ── Priority flag ─────────────────────────────────────────────────────────
export function PriorityFlag({
  priority,
  withLabel = false,
}: {
  priority: Priority;
  withLabel?: boolean;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      title={`${meta.label} priority`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: meta.color,
      }}
    >
      <Icon name="flag" size={13} style={{ color: meta.color }} />
      {withLabel ? meta.label : meta.short}
    </span>
  );
}

// ── Marketplace pill ────────────────────────────────────────────────────────
export function MarketplacePill({
  marketplace,
  compact = false,
}: {
  marketplace: Marketplace | null;
  compact?: boolean;
}) {
  if (!marketplace) {
    return (
      <Chip color="#8c90a0" tinted={false}>
        All channels
      </Chip>
    );
  }
  const meta = MARKETPLACE_META[marketplace];
  return <Chip color={meta.color}>{compact ? meta.abbr : marketplace}</Chip>;
}

// ── Progress bar ────────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  color = "var(--secondary)",
  height = 8,
  trackColor = "var(--bg-2)",
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
  trackColor?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      style={{
        height,
        width: "100%",
        background: trackColor,
        borderRadius: 999,
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, transparent), ${color})`,
          borderRadius: 999,
          boxShadow: `0 0 12px color-mix(in srgb, ${color} 60%, transparent)`,
          transition: "width 0.6s var(--ease)",
        }}
      />
    </div>
  );
}

// ── Audit item status pill ──────────────────────────────────────────────────
export const AUDIT_STATUS_META: Record<
  AuditItemStatus,
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "#8c90a0" },
  in_progress: { label: "In progress", color: "#548dff" },
  verified: { label: "Verified", color: "#4edea3" },
  flagged: { label: "Flagged", color: "#f43f5e" },
  na: { label: "N/A", color: "#5d6f8e" },
};

export function AuditStatusPill({ status }: { status: AuditItemStatus }) {
  const m = AUDIT_STATUS_META[status];
  return <Chip color={m.color}>{m.label}</Chip>;
}

// ── Checkbox (spring toggle + drawn checkmark) ───────────────────────────────
// A satisfying, theme-aware checkbox: the box springs on hover/tap and the
// checkmark draws itself in on toggle. Used for Definition-of-Done items and
// subtasks in the task detail. `color` tints the checked fill + border.
export function Checkbox({
  checked,
  onClick,
  color = "var(--secondary)",
  size = 18,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  color?: string;
  size?: number;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        // Stop the click from bubbling to a clickable parent row (which would
        // toggle a second time and cancel this one out).
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={checked}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        padding: 0,
        borderRadius: 5,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        border: `1.5px solid ${checked ? color : "var(--outline)"}`,
        background: checked ? color : "transparent",
        // Border + background colors aren't transform-based, so transition them
        // via CSS for a smooth fill while Motion drives the spring scale.
        transition: "background-color var(--dur) var(--ease), border-color var(--dur) var(--ease)",
      }}
    >
      <svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--floor)"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <motion.path
          d="M5 12l5 5L20 6"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      </svg>
    </motion.button>
  );
}

// ── Icon button ─────────────────────────────────────────────────────────────
export function IconButton({
  icon,
  label,
  onClick,
  active = false,
  size = 36,
  badge,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  size?: number;
  badge?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 10,
        background: active ? "color-mix(in srgb, var(--primary-bright) 18%, transparent)" : "var(--glass)",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
        color: active ? "var(--primary)" : "var(--text-soft)",
        cursor: "pointer",
        backdropFilter: "blur(12px)",
        transition: "all var(--dur) var(--spring)",
      }}
    >
      {icon}
      {badge ? (
        <span
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 999,
            background: "var(--error)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 0 0 2px var(--floor)",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// ── Section header (inside panels) ──────────────────────────────────────────
export function SectionTitle({
  icon,
  children,
  right,
}: {
  icon?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
          {children}
        </span>
      </div>
      {right}
    </div>
  );
}
