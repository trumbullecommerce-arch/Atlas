"use client";

// Dense, sortable task list. Rows group by status (default) or project, each
// row showing priority, title, project, marketplace, owner, checklist progress
// and target date. Clicking a row opens the shared TaskDetail slide-over.

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STATUSES, PROJECTS, person, project } from "@/lib/seed";
import { daysUntil, dueLabel, dueState } from "@/lib/format";
import type { Task } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Avatar, MarketplacePill, PriorityFlag } from "@/components/ui/Primitives";

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
  { key: "blocked", label: "Blocked", color: "#f43f5e" },
  ...STATUSES.filter((s) => !s.isDone).map((s) => ({ key: s.key, label: s.name, color: s.color })),
  ...STATUSES.filter((s) => s.isDone).map((s) => ({ key: s.key, label: s.name, color: s.color })),
];

function Row({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const proj = project(task.projectId);
  const owner = person(task.ownerId);
  const isDone = task.statusKey === "done";
  const ds = dueState(task.dueDate, isDone);
  const doneChecks = task.checklist.filter((c) => c.done).length;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      className="atlas-list-row"
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "26px minmax(0,1fr) 130px 96px 92px 110px",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "10px 16px",
        border: "none",
        borderTop: "1px solid var(--border-soft)",
        // Hover background is handled via the .atlas-list-row:hover CSS rule
        // (both themes) so it doesn't fight Motion's layout transforms.
        background: task.isBlocked ? "color-mix(in srgb, var(--error) 5%, transparent)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderLeft: task.isBlocked ? "2px solid var(--error)" : "2px solid transparent",
      }}
    >
      {/* priority dot */}
      <span style={{ display: "inline-flex", justifyContent: "center" }}>
        <PriorityFlag priority={task.priority} />
      </span>

      {/* title + project */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDone ? "var(--muted)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: proj?.color, flex: "0 0 auto" }} />
          <span className="atlas-list-proj" style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {proj?.name}
          </span>
          {task.sku && (
            <span className="mono atlas-list-sku" style={{ fontSize: 9.5, color: "var(--muted-2)", padding: "0 5px", borderRadius: 4, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
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
      <span className="atlas-list-checks" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: doneChecks === task.checklist.length && task.checklist.length > 0 ? "var(--secondary)" : "var(--muted)" }}>
        {task.checklist.length > 0 ? (
          <>
            <Icon name="check-circle" size={13} />
            <span className="mono">
              {doneChecks}/{task.checklist.length}
            </span>
          </>
        ) : (
          <span style={{ color: "var(--muted-2)" }}>—</span>
        )}
      </span>

      {/* owner */}
      <span className="atlas-list-ownerwrap" style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }} title={owner?.fullName}>
        <Avatar personId={task.ownerId} size={22} />
        <span className="atlas-list-owner" style={{ fontSize: 11.5, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {owner?.initials}
        </span>
      </span>

      {/* due */}
      <span className="atlas-list-due" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, justifyContent: "flex-end", color: isDone ? "var(--secondary)" : DUE_COLOR[ds] }}>
        {isDone ? (
          <>
            <Icon name="check-circle" size={13} /> verified
          </>
        ) : task.dueDate ? (
          <>
            <Icon name="clock" size={12} /> {dueLabel(task.dueDate)}
          </>
        ) : (
          <span style={{ color: "var(--muted-2)" }}>—</span>
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
}: {
  group: { key: string; label: string; color: string; tasks: Task[] };
  groupBy: GroupBy;
  open: boolean;
  onToggle: () => void;
  onOpen: (id: string) => void;
  sectionRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div ref={sectionRef} layout className="panel" style={{ padding: 0, overflow: "hidden" }}>
      {/* group header (collapsible) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="atlas-list-grouphdr"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          width: "100%",
          padding: "12px 16px",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          color: "var(--text)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
          transition: "background var(--dur)",
        }}
      >
        <Icon
          name="chevron-right"
          size={15}
          style={{
            color: "var(--muted)",
            flex: "0 0 auto",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform var(--dur) var(--ease)",
          }}
        />
        <span style={{ width: 9, height: 9, borderRadius: group.key === "blocked" || groupBy === "status" ? "50%" : 3, background: group.color, boxShadow: `0 0 7px ${group.color}`, flex: "0 0 auto" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{group.label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", padding: "1px 8px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
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
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: "1px solid var(--border-soft)" }}>
              {/* Rows glide (layout) and fade on mount/unmount so re-grouping or
                  filtering animates rather than snapping. */}
              <AnimatePresence initial={false}>
                {group.tasks.map((t) => (
                  <Row key={t.id} task={t} onOpen={() => onOpen(t.id)} />
                ))}
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
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  listFocus?: string | null;
  clearFocus?: () => void;
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
    <div style={{ maxWidth: 1380, margin: "0 auto" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--muted)" }}>
          <Icon name="list" size={15} />
          Group by
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
          {(["status", "project"] as GroupBy[]).map((g) => {
            const on = groupBy === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  color: on ? "var(--text)" : "var(--muted)",
                  background: on ? "color-mix(in srgb, var(--primary-bright) 24%, transparent)" : "transparent",
                  boxShadow: on ? "inset 0 0 0 1px var(--border-strong)" : "none",
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--muted-2)" }}>{tasks.length} tasks</span>
      </div>

      {tasks.length === 0 && (
        <div className="panel" style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
          <Icon name="list" size={26} style={{ color: "var(--muted-2)", marginBottom: 10 }} />
          <div style={{ fontSize: 13.5 }}>No tasks match the current filters.</div>
        </div>
      )}

      <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          />
        ))}
      </div>
    </div>
  );
}
