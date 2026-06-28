"use client";

// Client-side Atlas store. Seeds from lib/seed.ts and exposes the mutations the
// UI needs (drag tasks between columns, toggle DoD/subtasks, comment, block).
// Kept deliberately thin so a Supabase-backed implementation can drop in later.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

interface StoreValue {
  tasks: Task[];
  auditItems: AuditItem[];
  addTask: (input: NewTaskInput) => string;
  moveTask: (taskId: string, statusKey: string) => void;
  reorderInColumn: (taskId: string, statusKey: string, beforeId: string | null) => void;
  toggleChecklist: (taskId: string, itemId: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  addComment: (taskId: string, body: string) => void;
  setBlocked: (taskId: string, blocked: boolean, reason?: string) => void;
  setAuditStatus: (itemId: string, status: AuditItemStatus) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => TASKS.map((t) => ({ ...t })));
  const [auditItems, setAuditItems] = useState<AuditItem[]>(() =>
    AUDIT_ITEMS.map((a) => ({ ...a })),
  );

  const addTask = useCallback((input: NewTaskInput): string => {
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
    // Prepend so the new task appears at the top of its column / group.
    setTasks((prev) => [newTask, ...prev]);
    return id;
  }, []);

  const moveTask = useCallback((taskId: string, statusKey: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || t.statusKey === statusKey) return t;
        const entry = {
          id: uid("ac"),
          kind: "status" as const,
          actorId: ME,
          text: `moved to ${labelFor(statusKey)}`,
          createdAt: nowIso(),
        };
        const becameDone = statusKey === "done";
        return {
          ...t,
          statusKey,
          // Leaving the blocked column clears the blocked flag.
          isBlocked: statusKey === "blocked" ? t.isBlocked : false,
          blockedReason: statusKey === "blocked" ? t.blockedReason : null,
          activity: [...t.activity, entry],
          // Auto-complete checklist visual when verified (non-destructive flag only).
          ...(becameDone ? {} : {}),
        };
      }),
    );
  }, []);

  const reorderInColumn = useCallback(
    (taskId: string, statusKey: string, beforeId: string | null) => {
      setTasks((prev) => {
        const moving = prev.find((t) => t.id === taskId);
        if (!moving) return prev;
        const others = prev.filter((t) => t.id !== taskId);
        const updatedMoving = { ...moving, statusKey };
        if (!beforeId) {
          return [...others, updatedMoving];
        }
        const idx = others.findIndex((t) => t.id === beforeId);
        if (idx === -1) return [...others, updatedMoving];
        return [...others.slice(0, idx), updatedMoving, ...others.slice(idx)];
      });
    },
    [],
  );

  const toggleChecklist = useCallback((taskId: string, itemId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: t.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c,
              ),
            }
          : t,
      ),
    );
  }, []);

  const toggleSubtask = useCallback((taskId: string, subId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      ),
    );
  }, []);

  const addComment = useCallback((taskId: string, body: string) => {
    const clean = body.trim();
    if (!clean) return;
    setTasks((prev) =>
      prev.map((t) =>
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
    );
  }, []);

  const setBlocked = useCallback((taskId: string, blocked: boolean, reason?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
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
    );
  }, []);

  const setAuditStatus = useCallback((itemId: string, status: AuditItemStatus) => {
    setAuditItems((prev) =>
      prev.map((a) =>
        a.id === itemId
          ? { ...a, status, verifiedAt: status === "verified" ? nowIso() : a.verifiedAt }
          : a,
      ),
    );
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      tasks,
      auditItems,
      addTask,
      moveTask,
      reorderInColumn,
      toggleChecklist,
      toggleSubtask,
      addComment,
      setBlocked,
      setAuditStatus,
    }),
    [tasks, auditItems, addTask, moveTask, reorderInColumn, toggleChecklist, toggleSubtask, addComment, setBlocked, setAuditStatus],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Local helper to avoid importing seed STATUSES here (keeps this module light).
function labelFor(key: string): string {
  switch (key) {
    case "backlog":
      return "Backlog";
    case "todo":
      return "To do";
    case "doing":
      return "In progress";
    case "review":
      return "Review";
    case "done":
      return "Verified";
    case "blocked":
      return "Blocked";
    default:
      return key;
  }
}
