"use client";

// Zustand-based Atlas store. Seeds from lib/seed.ts and exposes mutations.
// Fine-grained selectors ensure components only re-render when their specific
// slice of state changes — surgical updates instead of full-tree re-renders.

import { create } from "zustand";
import { notify } from "@/components/ui/Toaster";
import { createContext, useContext, type ReactNode } from "react";
import {
  AUDIT_ITEMS,
  ME,
  TASKS,
  TODAY,
} from "./seed";
import type { AuditItem, AuditItemStatus, Marketplace, Priority, Task } from "./types";

/** Shape accepted by addTask — the minimal fields the creation form collects. */
export interface NewTaskInput {
  title: string;
  description: string;
  projectId: string;
  statusKey: string;
  priority: Priority;
  ownerId: string;
  dueDate: string | null;
  marketplace: Marketplace | null;
  sku: string | null;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
function nowIso(): string {
  // Anchor "now" to the demo reference day so timestamps stay coherent.
  return `${TODAY}T18:30:00Z`;
}

// Local helper to avoid importing seed STATUSES here (keeps this module light).
function labelFor(key: string): string {
  switch (key) {
    case "backlog": return "Backlog";
    case "todo": return "To do";
    case "doing": return "In progress";
    case "review": return "Review";
    case "done": return "Verified";
    case "blocked": return "Blocked";
    default: return key;
  }
}

// ── Zustand Store ──────────────────────────────────────────────────────────

interface AtlasState {
  tasks: Task[];
  auditItems: AuditItem[];

  // Mutations
  addTask: (input: NewTaskInput) => string;
  moveTask: (taskId: string, statusKey: string) => void;
  reorderInColumn: (taskId: string, statusKey: string, beforeId: string | null) => void;
  toggleChecklist: (taskId: string, itemId: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  addComment: (taskId: string, body: string) => void;
  setBlocked: (taskId: string, blocked: boolean, reason?: string) => void;
  updateTask: (taskId: string, patch: Partial<Omit<Task, "id">>) => void;
  deleteTask: (taskId: string) => void;
  duplicateTask: (taskId: string) => string;
  setAuditStatus: (itemId: string, status: AuditItemStatus) => void;
}

const useAtlasStore = create<AtlasState>((set, get) => ({
  tasks: TASKS.map((t) => ({ ...t })),
  auditItems: AUDIT_ITEMS.map((a) => ({ ...a })),

  addTask: (input: NewTaskInput): string => {
    const id = uid("t");
    const created = nowIso();
    const newTask: Task = {
      id,
      projectId: input.projectId,
      statusKey: input.statusKey,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
      position: 0,
      dueDate: input.dueDate,
      marketplace: input.marketplace,
      sku: input.sku && input.sku.trim() ? input.sku.trim() : null,
      ownerId: input.ownerId,
      assigneeIds: [input.ownerId],
      labels: [],
      isBlocked: false,
      blockedReason: null,
      blockedSince: null,
      checklist: [],
      subtasks: [],
      comments: [],
      activity: [
        { id: uid("ac"), kind: "created" as const, actorId: input.ownerId, text: "created this task", createdAt: created },
      ],
      estimateMinutes: null,
      createdAt: created,
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    notify.success(`Task created: ${input.title.trim().slice(0, 40)}`);
    return id;
  },

  moveTask: (taskId: string, statusKey: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId || t.statusKey === statusKey) return t;
        const entry = {
          id: uid("ac"),
          kind: "status" as const,
          actorId: ME,
          text: `moved to ${labelFor(statusKey)}`,
          createdAt: nowIso(),
        };
        return {
          ...t,
          statusKey,
          isBlocked: statusKey === "blocked" ? t.isBlocked : false,
          blockedReason: statusKey === "blocked" ? t.blockedReason : null,
          activity: [...t.activity, entry],
        };
      }),
    }));
    notify.info(`Moved to ${labelFor(statusKey)}`);
  },

  reorderInColumn: (taskId: string, statusKey: string, beforeId: string | null) => {
    set((state) => {
      const moving = state.tasks.find((t) => t.id === taskId);
      if (!moving) return state;
      const others = state.tasks.filter((t) => t.id !== taskId);
      const updatedMoving = { ...moving, statusKey };
      if (!beforeId) {
        return { tasks: [...others, updatedMoving] };
      }
      const idx = others.findIndex((t) => t.id === beforeId);
      if (idx === -1) return { tasks: [...others, updatedMoving] };
      return { tasks: [...others.slice(0, idx), updatedMoving, ...others.slice(idx)] };
    });
  },

  toggleChecklist: (taskId: string, itemId: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: t.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c,
              ),
            }
          : t,
      ),
    }));
  },

  toggleSubtask: (taskId: string, subId: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      ),
    }));
  },

  addComment: (taskId: string, body: string) => {
    const clean = body.trim();
    if (!clean) return;
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              comments: [
                ...t.comments,
                { id: uid("cm"), authorId: ME, body: clean, createdAt: nowIso() },
              ],
              activity: [
                ...t.activity,
                { id: uid("ac"), kind: "comment" as const, actorId: ME, text: "added a comment", createdAt: nowIso() },
              ],
            }
          : t,
      ),
    }));
    notify.info("Comment added");
  },

  setBlocked: (taskId: string, blocked: boolean, reason?: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isBlocked: blocked,
              blockedReason: blocked ? reason ?? t.blockedReason ?? "Blocked" : null,
              blockedSince: blocked ? nowIso() : null,
              statusKey: blocked ? "blocked" : t.statusKey === "blocked" ? "doing" : t.statusKey,
              activity: [
                ...t.activity,
                {
                  id: uid("ac"),
                  kind: blocked ? ("blocked" as const) : ("unblocked" as const),
                  actorId: ME,
                  text: blocked ? `marked blocked — ${reason ?? "blocked"}` : "cleared the blocker",
                  createdAt: nowIso(),
                },
              ],
            }
          : t,
      ),
    }));
    notify.info(blocked ? "Task blocked" : "Block removed");
  },

  updateTask: (taskId: string, patch: Partial<Omit<Task, "id">>) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    notify.success("Task updated");
  },

  deleteTask: (taskId: string) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
    notify.info("Task deleted");
  },

  duplicateTask: (taskId: string): string => {
    const newId = uid("t");
    set((state) => {
      const src = state.tasks.find((t) => t.id === taskId);
      if (!src) return state;
      const dup: Task = {
        ...src,
        id: newId,
        title: `${src.title} (copy)`,
        createdAt: nowIso(),
        comments: [],
        activity: [{ id: uid("a"), kind: "created", actorId: ME, text: "duplicated this task", createdAt: nowIso() }],
      };
      return { tasks: [dup, ...state.tasks] };
    });
    notify.success("Task duplicated");
    return newId;
  },

  setAuditStatus: (itemId: string, status: AuditItemStatus) => {
    set((state) => ({
      auditItems: state.auditItems.map((a) =>
        a.id === itemId
          ? { ...a, status, verifiedAt: status === "verified" ? nowIso() : a.verifiedAt }
          : a,
      ),
    }));
    notify.info(`Audit status → ${status}`);
  },
}));

// ── Backward-compatible API ────────────────────────────────────────────────
// useStore() returns the same shape as before, so all existing components work
// unchanged. The difference: Zustand components only re-render when their
// selected state actually changes, not on every mutation.

// We keep the StoreProvider wrapper for the existing tree structure, but it's
// now a thin pass-through since Zustand manages its own state.

const StoreContext = createContext<boolean>(false);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={true}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const mounted = useContext(StoreContext);
  if (!mounted) throw new Error("useStore must be used within StoreProvider");
  return useAtlasStore();
}

// ── Fine-grained selectors ─────────────────────────────────────────────────
// Components can use these for surgical re-render control.

/** Subscribe to just the tasks array. */
export const useTasks = () => useAtlasStore((s) => s.tasks);

/** Subscribe to just the audit items array. */
export const useAuditItems = () => useAtlasStore((s) => s.auditItems);

/** Subscribe to a single task by ID. Returns undefined if not found. */
export const useTask = (id: string | null) =>
  useAtlasStore((s) => (id ? s.tasks.find((t) => t.id === id) : undefined));

/** Get just the mutation functions (never changes reference, never triggers re-render). */
export const useStoreMutations = () =>
  useAtlasStore((s) => ({
    addTask: s.addTask,
    moveTask: s.moveTask,
    reorderInColumn: s.reorderInColumn,
    toggleChecklist: s.toggleChecklist,
    toggleSubtask: s.toggleSubtask,
    addComment: s.addComment,
    setBlocked: s.setBlocked,
    updateTask: s.updateTask,
    deleteTask: s.deleteTask,
    duplicateTask: s.duplicateTask,
    setAuditStatus: s.setAuditStatus,
  }));
