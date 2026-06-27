// Small, dependency-free formatting + date helpers shared across views.

import { Priority } from "./types";
import { TODAY } from "./seed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse a YYYY-MM-DD string as a local date (no TZ surprises). */
export function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

/** "Jul 2" / "Jun 24, 2025" (year shown only when not the current ref year). */
export function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = parseDate(d);
  const refYear = parseDate(TODAY).getFullYear();
  const base = `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  return dt.getFullYear() === refYear ? base : `${base}, ${dt.getFullYear()}`;
}

/** Whole days between today and the due date (negative = overdue). */
export function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const a = parseDate(TODAY);
  const b = parseDate(d);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type DueState = "overdue" | "today" | "soon" | "later" | "none";

export function dueState(d: string | null, isDone = false): DueState {
  if (!d || isDone) return "none";
  const n = daysUntil(d);
  if (n === null) return "none";
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  if (n <= 3) return "soon";
  return "later";
}

export function dueLabel(d: string | null): string {
  const n = daysUntil(d);
  if (n === null) return "—";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n <= 7) return `in ${n}d`;
  return formatDate(d);
}

/** Relative timestamp like "2h ago" from an ISO string, anchored to TODAY noon. */
export function relTime(iso: string): string {
  const ref = parseDate(TODAY).getTime() + 18 * 3_600_000; // ~6pm today
  const then = new Date(iso).getTime();
  const diff = Math.max(0, ref - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export const PRIORITY_META: Record<Priority, { label: string; short: string; color: string }> = {
  1: { label: "Urgent", short: "P1", color: "var(--error)" },
  2: { label: "High", short: "P2", color: "var(--warning)" },
  3: { label: "Medium", short: "P3", color: "var(--primary-bright)" },
  4: { label: "Low", short: "P4", color: "var(--muted)" },
};

export const MARKETPLACE_META: Record<string, { color: string; abbr: string }> = {
  Amazon: { color: "#f59e0b", abbr: "AMZ" },
  Walmart: { color: "#548dff", abbr: "WMT" },
  Wayfair: { color: "#8083ff", abbr: "WAY" },
};
