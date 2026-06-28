"use client";

// Timeline view. A horizontal schedule, one lane per project, with each task
// placed against its target date. The window is Monday-anchored and can be
// viewed at four zoom levels (Week / 2 Weeks / Month / Quarter) and panned with
// Prev / Next. The week containing the seed TODAY is "this week".
//
// All window state (mode + week offset) is internal to this component so it
// never collides with AppShell's shared task filtering.

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TODAY, STATUSES, PROJECTS, person } from "@/lib/seed";
import { parseDate, daysUntil, dueLabel } from "@/lib/format";
import type { Task } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";

const MS_DAY = 86_400_000;

type TLMode = "week" | "twoweek" | "month" | "quarter";

const MODE_OPTIONS: { key: TLMode; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "twoweek", label: "2 Weeks" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
];

// Quarter view spans this many Monday-anchored week columns (the default,
// matches the previous multi-week board and stays within the ~8–13 range).
const QUARTER_WEEKS = 9;

function statusColor(key: string): string {
  return STATUSES.find((s) => s.key === key)?.color ?? "var(--muted)";
}

// ── Date helpers (all Monday-anchored, local time) ───────────────────────────
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}
/** Monday 00:00 of the week containing `d` (Mon–Sun weeks). */
function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const shift = day === 0 ? -6 : 1 - day;
  return addDays(d, shift);
}
function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** Whole weeks between two Mondays (b - a). */
function weeksBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / (7 * MS_DAY));
}

// A single timeline column. Either a working day (week / 2-week modes) or a
// Monday-anchored week (month / quarter modes).
interface Column {
  kind: "day" | "week";
  start: Date; // inclusive
  end: Date; // inclusive (same as start for day columns)
  top: string; // primary label
  sub: string; // secondary label
  isCurrent: boolean; // contains TODAY
  weekMonday: Date; // Monday of the week this column belongs to (for zoom)
}

interface WindowModel {
  columns: Column[];
  rangeStart: Date;
  rangeEnd: Date;
  /** Map a due date to a column index, or null when it can't be placed. */
  indexOf: (due: string | null) => number | null;
  title: string;
}

function buildWindow(mode: TLMode, weekOffset: number, today: Date): WindowModel {
  const thisMonday = mondayOf(today);
  const anchorMonday = addDays(thisMonday, weekOffset * 7);
  // Overdue clamps to the first column only when the window still reaches the
  // current week (i.e. we're looking at "now or later"), matching the original.
  const clampOverdue = anchorMonday.getTime() <= thisMonday.getTime();

  // ----- Day-column modes (Week, 2 Weeks): Mon–Fri only -----
  if (mode === "week" || mode === "twoweek") {
    const weeks = mode === "week" ? 1 : 2;
    const columns: Column[] = [];
    for (let w = 0; w < weeks; w++) {
      const wkMonday = addDays(anchorMonday, w * 7);
      for (let d = 0; d < 5; d++) {
        const day = addDays(wkMonday, d);
        columns.push({
          kind: "day",
          start: day,
          end: day,
          top: day.toLocaleDateString("en-US", { weekday: "short" }),
          sub: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          isCurrent: sameDay(day, today),
          weekMonday: wkMonday,
        });
      }
    }
    const rangeStart = columns[0].start;
    const rangeEnd = addDays(anchorMonday, (weeks - 1) * 7 + 6); // through Sunday
    const indexOf = (due: string | null): number | null => {
      if (!due) return null;
      const dt = startOfDay(parseDate(due));
      if (dt.getTime() < rangeStart.getTime()) return clampOverdue ? 0 : null;
      if (dt.getTime() > rangeEnd.getTime()) return null;
      // Which week within the window?
      const wk = Math.floor(weeksBetween(anchorMonday, mondayOf(dt)));
      if (wk < 0 || wk >= weeks) return null;
      let dow = dt.getDay(); // 0=Sun..6=Sat
      // Fold weekend due dates onto that week's Friday.
      if (dow === 6) dow = 5; // Sat → Fri (index 4)
      if (dow === 0) dow = 5; // Sun → Fri (index 4)
      const dayIdx = Math.min(4, dow - 1); // Mon(1)->0 … Fri(5)->4
      return wk * 5 + dayIdx;
    };
    const last = addDays(anchorMonday, (weeks - 1) * 7 + 4); // Friday of last week
    const title = `${fmtDay(rangeStart)} – ${fmtDay(last)}`;
    return { columns, rangeStart, rangeEnd, indexOf, title };
  }

  // ----- Week-column modes (Month, Quarter): one column per Monday week -----
  let firstMonday: Date;
  let weekCount: number;
  if (mode === "month") {
    // Weeks (Monday-anchored) that the anchor week's month spans.
    const monthRef = anchorMonday;
    const first = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
    const last = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0);
    firstMonday = mondayOf(first);
    const lastMonday = mondayOf(last);
    weekCount = weeksBetween(firstMonday, lastMonday) + 1;
  } else {
    firstMonday = anchorMonday;
    weekCount = QUARTER_WEEKS;
  }

  const columns: Column[] = [];
  for (let i = 0; i < weekCount; i++) {
    const wkMonday = addDays(firstMonday, i * 7);
    const wkSunday = addDays(wkMonday, 6);
    const isCurrent = today.getTime() >= wkMonday.getTime() && today.getTime() <= wkSunday.getTime();
    columns.push({
      kind: "week",
      start: wkMonday,
      end: wkSunday,
      top: fmtDay(wkMonday),
      sub: isCurrent ? "this week" : `wk of ${fmtDay(wkMonday)}`,
      isCurrent,
      weekMonday: wkMonday,
    });
  }
  const rangeStart = columns[0].start;
  const rangeEnd = columns[columns.length - 1].end;
  const indexOf = (due: string | null): number | null => {
    if (!due) return null;
    const dt = startOfDay(parseDate(due));
    if (dt.getTime() < rangeStart.getTime()) return clampOverdue ? 0 : null;
    if (dt.getTime() > rangeEnd.getTime()) return weekCount - 1; // far-future clamps to last
    const wk = weeksBetween(firstMonday, mondayOf(dt));
    return Math.max(0, Math.min(weekCount - 1, wk));
  };
  const title =
    mode === "month"
      ? anchorMonday.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${fmtDay(rangeStart)} – ${fmtDay(rangeEnd)}`;
  return { columns, rangeStart, rangeEnd, indexOf, title };
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

// On-theme segmented control for the zoom level.
function ModeControl({ mode, onChange }: { mode: TLMode; onChange: (m: TLMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
      {MODE_OPTIONS.map((o) => {
        const on = mode === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: on ? "var(--text)" : "var(--muted)",
              background: on ? "color-mix(in srgb, var(--primary-bright) 24%, transparent)" : "transparent",
              boxShadow: on ? "inset 0 0 0 1px var(--border-strong)" : "none",
              transition: "background var(--dur), color var(--dur)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NavButton({ icon, label, onClick }: { icon: "chevron-left" | "chevron-right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        display: "grid",
        placeItems: "center",
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "var(--bg-2)",
        color: "var(--text-soft)",
        cursor: "pointer",
        transition: "background var(--dur), border-color var(--dur)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.background = "color-mix(in srgb, var(--primary-bright) 12%, var(--bg-2))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-2)";
      }}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function Timeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const today = useMemo(() => startOfDay(parseDate(TODAY)), []);
  const [mode, setMode] = useState<TLMode>("quarter");
  const [weekOffset, setWeekOffset] = useState(0);

  const win = useMemo(() => buildWindow(mode, weekOffset, today), [mode, weekOffset, today]);
  const cols = win.columns;
  const colCount = cols.length;
  const atCurrent = weekOffset === 0;

  // Step size for Prev/Next, in weeks, per mode.
  const stepWeeks = mode === "week" ? 1 : mode === "twoweek" ? 2 : mode === "month" ? 4 : QUARTER_WEEKS;

  const lanes = useMemo(() => {
    return PROJECTS.map((p) => {
      const own = tasks.filter((t) => t.projectId === p.id);
      const scheduled: Task[][] = Array.from({ length: colCount }, () => []);
      const undated: Task[] = [];
      for (const t of own) {
        const ci = win.indexOf(t.dueDate);
        if (ci === null) {
          // Truly undated tasks collect in the lane label; tasks that simply
          // fall outside the current window are omitted (pan to find them).
          if (!t.dueDate) undated.push(t);
        } else {
          scheduled[ci].push(t);
        }
      }
      for (const col of scheduled) col.sort((a, b) => a.priority - b.priority);
      return { project: p, scheduled, undated, count: own.length };
    }).filter((l) => l.count > 0);
  }, [tasks, win, colCount]);

  // Column width: day columns are narrower than week columns.
  const colMin = cols[0]?.kind === "day" ? 104 : 116;
  const colTemplate = `minmax(168px, 200px) repeat(${colCount}, minmax(${colMin}px, 1fr))`;

  // Zoom into a single week (Week mode) when a week-column header is clicked.
  function zoomToWeek(col: Column) {
    const offset = weeksBetween(mondayOf(today), col.weekMonday);
    setMode("week");
    setWeekOffset(offset);
  }

  const subtitle =
    mode === "week"
      ? "one week, working days"
      : mode === "twoweek"
        ? "two weeks, working days"
        : mode === "month"
          ? "by week, this month"
          : "by week, this quarter";

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      {/* Header / controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icon name="calendar" size={16} style={{ color: "var(--primary)" }} />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Timeline</h2>
          <span className="atlas-tl-sub" style={{ fontSize: 12, color: "var(--muted)" }}>{subtitle}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Prev / window title / Next + reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavButton icon="chevron-left" label="Previous" onClick={() => setWeekOffset((o) => o - stepWeeks)} />
          <span
            className="mono"
            style={{
              minWidth: 132,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-soft)",
              padding: "0 6px",
            }}
          >
            {win.title}
          </span>
          <NavButton icon="chevron-right" label="Next" onClick={() => setWeekOffset((o) => o + stepWeeks)} />
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            disabled={atCurrent}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: atCurrent ? "transparent" : "color-mix(in srgb, var(--primary-bright) 14%, var(--bg-2))",
              color: atCurrent ? "var(--muted-2)" : "var(--primary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: atCurrent ? "default" : "pointer",
              opacity: atCurrent ? 0.6 : 1,
              whiteSpace: "nowrap",
              transition: "background var(--dur), color var(--dur)",
            }}
          >
            This week
          </button>
        </div>

        <ModeControl mode={mode} onChange={setMode} />

        <span style={{ fontSize: 11.5, color: "var(--muted-2)" }}>{tasks.length} tasks</span>
      </div>

      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}:${weekOffset}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ minWidth: "fit-content" }}
          >
            {/* Column header */}
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
              {cols.map((c, i) => {
                const clickable = c.kind === "week";
                return (
                  <div
                    key={i}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `Zoom into the week of ${c.top}` : undefined}
                    title={clickable ? `Zoom into ${c.top}` : undefined}
                    onClick={clickable ? () => zoomToWeek(c) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              zoomToWeek(c);
                            }
                          }
                        : undefined
                    }
                    className={clickable ? "atlas-tl-colhdr" : undefined}
                    style={{
                      padding: "11px 10px",
                      textAlign: "center",
                      borderLeft: "1px solid var(--border-soft)",
                      cursor: clickable ? "pointer" : "default",
                      background: c.isCurrent ? "color-mix(in srgb, var(--primary-bright) 12%, transparent)" : "transparent",
                      transition: "background var(--dur)",
                    }}
                  >
                    <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: c.isCurrent ? "var(--primary)" : "var(--text-soft)" }}>
                      {c.top}
                    </div>
                    <div style={{ fontSize: 9, color: c.isCurrent ? "var(--primary)" : "var(--muted-2)", marginTop: 2 }}>{c.sub}</div>
                  </div>
                );
              })}
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

                  {/* column cells */}
                  {scheduled.map((col, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        borderLeft: "1px solid var(--border-soft)",
                        background: cols[i]?.isCurrent ? "color-mix(in srgb, var(--primary-bright) 5%, transparent)" : "transparent",
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
