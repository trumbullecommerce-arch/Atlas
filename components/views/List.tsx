"use client";

// Dense, sortable task list. Rows group by status (default) or project, each
// row showing priority, title, project, marketplace, owner, checklist progress
// and target date. Clicking a row opens the shared TaskDetail slide-over.

import { useMemo, useState } from "react";
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
    <button
      type="button"
      onClick={onOpen}
      className="atlas-list-row"
      style={{
        display: "grid",
        gridTemplateColumns: "26px minmax(0,1fr) 130px 96px 92px 110px",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "10px 16px",
        border: "none",
        borderTop: "1px solid var(--border-soft)",
        background: task.isBlocked ? "color-mix(in srgb, var(--error) 5%, transparent)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderLeft: task.isBlocked ? "2px solid var(--error)" : "2px solid transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.028)")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = task.isBlocked ? "color-mix(in srgb, var(--error) 5%, transparent)" : "transparent")
      }
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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }} title={owner?.fullName}>
        <Avatar personId={task.ownerId} size={22} />
        <span className="atlas-list-owner" style={{ fontSize: 11.5, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {owner?.initials}
        </span>
      </span>

      {/* due */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, justifyContent: "flex-end", color: isDone ? "var(--secondary)" : DUE_COLOR[ds] }}>
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
    </button>
  );
}

export function List({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

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
                  color: on ? "#fff" : "var(--muted)",
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
        {groups.map((g) => (
          <div key={g.key} className="panel" style={{ padding: 0, overflow: "hidden" }}>
            {/* group header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "12px 16px",
                background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: g.key === "blocked" || groupBy === "status" ? "50%" : 3, background: g.color, boxShadow: `0 0 7px ${g.color}` }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{g.label}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)", padding: "1px 8px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                {g.tasks.length}
              </span>
            </div>
            {/* rows */}
            <div>
              {g.tasks.map((t) => (
                <Row key={t.id} task={t} onOpen={() => onOpen(t.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
