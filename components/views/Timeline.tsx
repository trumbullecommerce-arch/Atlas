"use client";

// Timeline view. An 8-week horizontal schedule, one lane per project, with each
// task placed in the week of its target date. Overdue items clamp to the first
// week (flagged), undated items collect in a trailing strip. Clicking a task
// opens the shared TaskDetail slide-over.

import { useMemo } from "react";
import { TODAY, STATUSES, PROJECTS, person, project } from "@/lib/seed";
import { daysUntil, dueLabel } from "@/lib/format";
import type { Task } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";

const WEEKS = 8;
const MS_DAY = 86400000;

function statusColor(key: string): string {
  return STATUSES.find((s) => s.key === key)?.color ?? "var(--muted)";
}

function fmtWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Week index 0..WEEKS-1 for a due date, or null when undated.
function weekIndexOf(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const diff = daysUntil(dueDate);
  if (diff === null) return null;
  if (diff < 0) return 0; // overdue clamps to the current week
  return Math.min(WEEKS - 1, Math.floor(diff / 7));
}

function Pill({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const owner = person(task.ownerId);
  const isDone = task.statusKey === "done";
  const accent = task.isBlocked ? "var(--error)" : isDone ? "var(--secondary)" : statusColor(task.statusKey);
  const overdue = !isDone && (daysUntil(task.dueDate) ?? 0) < 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={task.title}
      className="atlas-tl-pill"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        textAlign: "left",
        padding: "6px 9px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${accent}`,
        background: task.isBlocked
          ? "color-mix(in srgb, var(--error) 9%, var(--surface))"
          : "var(--surface)",
        cursor: "pointer",
        transition: "transform .15s var(--ease), border-color .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.borderLeftColor = accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.borderLeftColor = accent;
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flex: "0 0 auto", boxShadow: `0 0 6px ${accent}` }} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 11.5,
          fontWeight: 600,
          color: isDone ? "var(--muted)" : "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {task.title}
      </span>
      {task.isBlocked ? (
        <Icon name="block" size={11} style={{ color: "var(--error)", flex: "0 0 auto" }} />
      ) : (
        <span className="atlas-tl-av" style={{ flex: "0 0 auto" }}>
          <Avatar personId={task.ownerId} size={16} />
        </span>
      )}
      {overdue && (
        <span className="mono" style={{ flex: "0 0 auto", fontSize: 9, color: "var(--error)" }}>
          {dueLabel(task.dueDate)}
        </span>
      )}
      {!owner && null}
    </button>
  );
}

export function Timeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const today = useMemo(() => new Date(`${TODAY}T00:00:00`), []);
  const weeks = useMemo(
    () => Array.from({ length: WEEKS }, (_, i) => new Date(today.getTime() + i * 7 * MS_DAY)),
    [today],
  );

  const lanes = useMemo(() => {
    return PROJECTS.map((p) => {
      const own = tasks.filter((t) => t.projectId === p.id);
      const scheduled: Task[][] = Array.from({ length: WEEKS }, () => []);
      const undated: Task[] = [];
      for (const t of own) {
        const wi = weekIndexOf(t.dueDate);
        if (wi === null) undated.push(t);
        else scheduled[wi].push(t);
      }
      for (const col of scheduled) col.sort((a, b) => a.priority - b.priority);
      return { project: p, scheduled, undated, count: own.length };
    }).filter((l) => l.count > 0);
  }, [tasks]);

  const colTemplate = `minmax(168px, 200px) repeat(${WEEKS}, minmax(116px, 1fr))`;

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <Icon name="calendar" size={16} style={{ color: "var(--primary)" }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Timeline</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>next {WEEKS} weeks, by target date</span>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--muted-2)" }}>{tasks.length} tasks</span>
      </div>

      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        {/* Week header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: colTemplate,
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)" }}>
            Project
          </div>
          {weeks.map((w, i) => (
            <div
              key={i}
              style={{
                padding: "11px 10px",
                textAlign: "center",
                borderLeft: "1px solid var(--border-soft)",
                background: i === 0 ? "color-mix(in srgb, var(--primary-bright) 12%, transparent)" : "transparent",
              }}
            >
              <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? "var(--primary)" : "var(--text-soft)" }}>
                {fmtWeek(w)}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted-2)", marginTop: 2 }}>{i === 0 ? "this week" : `wk ${i + 1}`}</div>
            </div>
          ))}
        </div>

        {/* Lanes */}
        <div className="stagger">
          {lanes.map(({ project: p, scheduled, undated }) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: colTemplate,
                borderTop: "1px solid var(--border-soft)",
                minHeight: 64,
              }}
            >
              {/* lane label */}
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8, borderRight: "1px solid var(--border-soft)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color, marginTop: 3, flex: "0 0 auto", boxShadow: `0 0 7px ${p.color}` }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  {undated.length > 0 && (
                    <div style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 3 }}>{undated.length} undated</div>
                  )}
                </div>
              </div>

              {/* week cells */}
              {scheduled.map((col, i) => (
                <div
                  key={i}
                  style={{
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    borderLeft: "1px solid var(--border-soft)",
                    background: i === 0 ? "color-mix(in srgb, var(--primary-bright) 5%, transparent)" : "transparent",
                  }}
                >
                  {col.map((t) => (
                    <Pill key={t.id} task={t} onOpen={() => onOpen(t.id)} />
                  ))}
                </div>
              ))}
            </div>
          ))}

          {lanes.length === 0 && (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
              <Icon name="calendar" size={26} style={{ color: "var(--muted-2)", marginBottom: 10 }} />
              <div style={{ fontSize: 13.5 }}>No scheduled tasks match the current filters.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
