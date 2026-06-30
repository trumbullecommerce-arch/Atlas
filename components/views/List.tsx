"use client";

// Dense, sortable task list. Rows group by status (default) or project, each
// row showing priority, title, project, marketplace, owner, checklist progress
// and target date. Clicking a row opens the shared TaskDetail slide-over.

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STATUSES, PROJECTS, person, project } from "@/lib/seed";
import { daysUntil, dueLabel, dueState } from "@/lib/format";
import type { Task } from "@/lib/types";
import type { TaskLock } from "@/lib/supabase/task-locks";
import { Icon } from "@/components/ui/Icon";
import { Avatar, MarketplacePill, PriorityFlag } from "@/components/ui/Primitives";
import styles from "./List.module.css";

type GroupBy = "status" | "project";

const DUE_COLOR: Record<string, string> = {
  overdue: "var(--error)",
  today: "var(--warning)",
  soon: "var(--warning)",
  later: "var(--muted)",
  none: "var(--muted-2)",
};

// Group ordering: status uses the workflow order (+ a virtual Blocked group);
// project uses the sidebar order.
const STATUS_GROUPS: { key: string; label: string; color: string }[] = [
  { key: "blocked", label: "Blocked", color: "var(--status-blocked)" },
  ...STATUSES.filter((s) => !s.isDone).map((s) => ({ key: s.key, label: s.name, color: s.color })),
  ...STATUSES.filter((s) => s.isDone).map((s) => ({ key: s.key, label: s.name, color: s.color })),
];

function Row({ task, onOpen, lock }: { task: Task; onOpen: () => void; lock?: TaskLock | null }) {
  const proj = project(task.projectId);
  const owner = person(task.ownerId);
  const isDone = task.statusKey === "done";
  const ds = dueState(task.dueDate, isDone);
  const doneChecks = task.checklist.filter((c) => c.done).length;

  const rowClass = [
    "atlas-list-row",
    styles.row,
    task.isBlocked ? styles.rowBlocked : "",
    lock ? styles.rowLocked : "",
  ].filter(Boolean).join(" ");

  const lockStyle = lock ? { "--lock-hue": String(lock.hue) } as React.CSSProperties : undefined;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      className={rowClass}
      style={lockStyle}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Lock indicator */}
      {lock && (
        <span className={styles.lockBubble} title={`${lock.fullName} is editing`}>
          {lock.initials}
        </span>
      )}

      {/* priority dot */}
      <span className={styles.priorityCell}>
        <PriorityFlag priority={task.priority} />
      </span>

      {/* title + project */}
      <div className={styles.titleCell}>
        <div className={`${styles.titleText} ${isDone ? styles.titleDone : ""}`}>
          {task.title}
        </div>
        <div className={styles.titleMeta}>
          <span className={styles.projDot} style={{ background: proj?.color }} />
          <span className={`atlas-list-proj ${styles.projName}`}>
            {proj?.name}
          </span>
          {task.sku && (
            <span className={`mono atlas-list-sku ${styles.skuTag}`}>
              {task.sku}
            </span>
          )}
        </div>
      </div>

      {/* marketplace */}
      <span className="atlas-list-mp">
        <MarketplacePill marketplace={task.marketplace} compact />
      </span>

      {/* checklist progress */}
      <span className={`atlas-list-checks ${styles.checkCell} ${doneChecks === task.checklist.length && task.checklist.length > 0 ? styles.checkComplete : ""}`}>
        {task.checklist.length > 0 ? (
          <>
            <Icon name="check-circle" size={13} />
            <span className="mono">
              {doneChecks}/{task.checklist.length}
            </span>
          </>
        ) : (
          <span className={styles.dim}>—</span>
        )}
      </span>

      {/* owner */}
      <span className={`atlas-list-ownerwrap ${styles.ownerCell}`} title={owner?.fullName}>
        <Avatar personId={task.ownerId} size={22} />
        <span className={`atlas-list-owner ${styles.ownerName}`}>
          {owner?.initials}
        </span>
      </span>

      {/* due */}
      <span className={`atlas-list-due ${styles.dueCell}`} style={{ color: isDone ? "var(--secondary)" : DUE_COLOR[ds] }}>
        {isDone ? (
          <>
            <Icon name="check-circle" size={13} /> verified
          </>
        ) : task.dueDate ? (
          <>
            <Icon name="clock" size={12} /> {dueLabel(task.dueDate)}
          </>
        ) : (
          <span className={styles.dim}>—</span>
        )}
      </span>
    </motion.button>
  );
}

// One collapsible status/project section. Default expanded; remembers its own
// open state. Header is a button with a chevron; the body animates its height
// via Motion. When `forceOpen` is set (List focus), it expands regardless.
function GroupSection({
  group,
  groupBy,
  open,
  onToggle,
  onOpen,
  sectionRef,
  taskLocks,
  currentUserId,
}: {
  group: { key: string; label: string; color: string; tasks: Task[] };
  groupBy: GroupBy;
  open: boolean;
  onToggle: () => void;
  onOpen: (id: string) => void;
  sectionRef?: (el: HTMLDivElement | null) => void;
  taskLocks?: Map<string, TaskLock>;
  currentUserId?: string | null;
}) {
  const dotShape = group.key === "blocked" || groupBy === "status" ? styles.groupDotStatus : styles.groupDotProject;

  return (
    <motion.div ref={sectionRef} layout className={`panel ${styles.section}`}>
      {/* group header (collapsible) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`atlas-list-grouphdr ${styles.groupHdr}`}
      >
        <Icon
          name="chevron-right"
          size={15}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
        />
        <span
          className={`${styles.groupDot} ${dotShape}`}
          style={{ background: group.color, boxShadow: `0 0 7px ${group.color}` }}
        />
        <span className={styles.groupName}>{group.label}</span>
        <span className={`mono ${styles.groupCount}`}>
          {group.tasks.length}
        </span>
      </button>
      {/* rows (height-animated) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className={styles.groupBody}
          >
            <div className={styles.groupBodyInner}>
              {/* Rows glide (layout) and fade on mount/unmount so re-grouping or
                  filtering animates rather than snapping. */}
              <AnimatePresence initial={false}>
                {group.tasks.map((t) => {
                  const rawLock = taskLocks?.get(t.id);
                  const lock = rawLock && rawLock.userId !== currentUserId ? rawLock : null;
                  return <Row key={t.id} task={t} onOpen={() => onOpen(t.id)} lock={lock} />;
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function List({
  tasks,
  onOpen,
  listFocus,
  clearFocus,
  taskLocks,
  currentUserId,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  listFocus?: string | null;
  clearFocus?: () => void;
  taskLocks?: Map<string, TaskLock>;
  currentUserId?: string | null;
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  // Per-group collapsed state, keyed by group key. Absent = expanded (default).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Refs to each rendered section so a focused group can scroll into view.
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groups = useMemo(() => {
    const colOf = (t: Task) => (t.isBlocked ? "blocked" : t.statusKey);
    if (groupBy === "status") {
      return STATUS_GROUPS.map((g) => ({
        ...g,
        tasks: tasks
          .filter((t) => colOf(t) === g.key)
          .sort((a, b) => a.priority - b.priority || (daysUntil(a.dueDate) ?? 1e9) - (daysUntil(b.dueDate) ?? 1e9)),
      })).filter((g) => g.tasks.length > 0);
    }
    return PROJECTS.map((p) => ({
      key: p.id,
      label: p.name,
      color: p.color,
      tasks: tasks.filter((t) => t.projectId === p.id).sort((a, b) => a.priority - b.priority),
    })).filter((g) => g.tasks.length > 0);
  }, [tasks, groupBy]);

  // When a status focus arrives (from the Dashboard), switch to status grouping,
  // force that group open + to the top, scroll it into view, then clear the
  // focus so normal collapse/expand resumes.
  const hasFocusTarget = !!listFocus && groups.some((g) => g.key === listFocus);
  useEffect(() => {
    if (!listFocus) return;
    if (groupBy !== "status") setGroupBy("status");
    // Force the focused group expanded.
    setCollapsed((prev) => ({ ...prev, [listFocus]: false }));
    // Scroll after the layout settles (next frame).
    const raf = requestAnimationFrame(() => {
      const el = sectionRefs.current[listFocus];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      clearFocus?.();
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFocus]);

  // Ordered groups: when focusing, hoist the focused group to the top.
  const orderedGroups = useMemo(() => {
    if (!hasFocusTarget) return groups;
    const focused = groups.filter((g) => g.key === listFocus);
    const rest = groups.filter((g) => g.key !== listFocus);
    return [...focused, ...rest];
  }, [groups, hasFocusTarget, listFocus]);

  const isOpen = (key: string) => (key === listFocus ? true : !collapsed[key]);

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.groupLabel}>
          <Icon name="list" size={15} />
          Group by
        </div>
        <div className={styles.groupToggle}>
          {(["status", "project"] as GroupBy[]).map((g) => {
            const on = groupBy === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`${styles.groupBtn} ${on ? styles.groupBtnActive : ""}`}
              >
                {g}
              </button>
            );
          })}
        </div>
        <span className={styles.taskCount}>{tasks.length} tasks</span>
      </div>

      {tasks.length === 0 && (
        <div className={`panel ${styles.empty}`}>
          <Icon name="list" size={26} className={styles.emptyIcon} />
          <div className={styles.emptyText}>No tasks match the current filters.</div>
        </div>
      )}

      <div className={`stagger ${styles.sections}`}>
        {orderedGroups.map((g) => (
          <GroupSection
            key={g.key}
            group={g}
            groupBy={groupBy}
            open={isOpen(g.key)}
            onToggle={() => setCollapsed((prev) => ({ ...prev, [g.key]: !(prev[g.key] ?? false) }))}
            onOpen={onOpen}
            sectionRef={(el) => {
              sectionRefs.current[g.key] = el;
            }}
            taskLocks={taskLocks}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
