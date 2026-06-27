// Atlas domain types.
// Intentionally aligned with supabase/migrations/0001_init.sql so the seed
// layer can later be swapped for live Supabase queries with minimal churn.

export type Marketplace = "Amazon" | "Walmart" | "Wayfair";

export type ProjectKind = "standard" | "audit";

/** 1 = ASAP/P1 (highest) ... 4 = Low */
export type Priority = 1 | 2 | 3 | 4;

export interface Person {
  id: string;
  /** Two/three-letter initials used on avatars. */
  initials: string;
  fullName: string;
  email: string;
  role: "admin" | "member";
  /** Hue used to tint the avatar gradient. */
  hue: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  kind: ProjectKind;
  /** The measurable "done means…" statement. */
  objective: string;
  color: string;
  /** Convenience denormalization for the sidebar status dot. */
  health: "on_track" | "at_risk" | "blocked";
  archived: boolean;
}

export interface Status {
  id: string;
  /** Stable key used for grouping / drag targets. */
  key: string;
  name: string;
  color: string;
  position: number;
  isDone: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  ownerId?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

export type ActivityKind =
  | "created"
  | "status"
  | "comment"
  | "assigned"
  | "blocked"
  | "unblocked"
  | "checklist"
  | "due";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  actorId: string;
  /** Human-readable summary already resolved at seed time. */
  text: string;
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  statusKey: string;
  title: string;
  description: string;
  priority: Priority;
  /** Fractional-ish ordering within a column. */
  position: number;
  /** ISO date (YYYY-MM-DD) or null. */
  dueDate: string | null;
  marketplace: Marketplace | null;
  /** SKU / listing ref. */
  sku: string | null;
  ownerId: string;
  assigneeIds: string[];
  labels: Label[];
  isBlocked: boolean;
  blockedReason: string | null;
  blockedSince: string | null;
  checklist: ChecklistItem[];
  subtasks: Subtask[];
  comments: Comment[];
  activity: ActivityEntry[];
  estimateMinutes: number | null;
  createdAt: string;
}

export type AuditItemStatus =
  | "pending"
  | "in_progress"
  | "verified"
  | "flagged"
  | "na";

export interface AuditItem {
  id: string;
  projectId: string;
  /** SKU / listing id / URL. */
  externalRef: string;
  title: string;
  marketplace: Marketplace;
  status: AuditItemStatus;
  ownerId: string | null;
  notes: string | null;
  verifiedAt: string | null;
}

/** Summary row when the full universe is large (e.g. the 412-item audit). */
export interface AuditBucket {
  marketplace: Marketplace;
  total: number;
  verified: number;
  inProgress: number;
  pending: number;
  flagged: number;
}

export type ViewKey =
  | "dashboard"
  | "board"
  | "list"
  | "timeline"
  | "audits";
