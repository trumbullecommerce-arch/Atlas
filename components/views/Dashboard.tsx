"use client";

// Cross-project command-center overview: KPI stat cards, throughput + status
// charts, an at-risk / blocked list and a recent-activity feed. Reads live task
// state from the store and blends in the seed analytics (throughput, audit
// totals, activity feed).

import { useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import {
  PROJECTS,
  STATUSES,
  THROUGHPUT_14D,
  RECENT_ACTIVITY,
  AUDIT_TOTALS,
  person,
  project,
} from "@/lib/seed";
import { daysUntil, dueLabel, relTime } from "@/lib/format";
import type { Task, ViewKey } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { AreaLineChart, Donut, SparkBars } from "@/components/ui/Charts";
import {
  Avatar,
  Chip,
  MarketplacePill,
  PriorityFlag,
  SectionTitle,
} from "@/components/ui/Primitives";

function Panel({ children, style, className }: { children: ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={`panel${className ? ` ${className}` : ""}`}
      style={{ padding: 24, ...style }}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  spark,
  sparkColor,
  trend,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub: string;
  accent: string;
  spark?: number[];
  sparkColor?: string;
  trend?: { dir: "up" | "down"; text: string };
}) {
  return (
    <Panel style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
      {/* corner glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 26%, transparent), transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            color: accent,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 32%, transparent)`,
          }}
        >
          <Icon name={icon} size={17} />
        </span>
        {trend && (
          <Chip color={trend.dir === "up" ? "var(--secondary)" : "var(--error)"}>
            <Icon name={trend.dir === "up" ? "trending-up" : "trending-down"} size={12} />
            {trend.text}
          </Chip>
        )}
      </div>
      <div>
        <div className="mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--text)" }}>
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--muted)",
            marginTop: 10,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{sub}</div>
      </div>
      {spark && (
        <div style={{ marginTop: "auto" }}>
          <SparkBars values={spark} color={sparkColor ?? accent} height={34} />
        </div>
      )}
    </Panel>
  );
}

// Resolve a cross-project activity-feed row back to the task it describes, so
// the row can deep-link into the task. The feed text embeds the task title in
// curly quotes (e.g. …commented on "Build 22 listings…"); we match that against
// the live tasks within the same project, falling back to a loose contains.
function resolveFeedTaskId(
  text: string,
  projectId: string,
  tasks: Task[],
): string | null {
  const quoted = text.match(/[“"]([^”"]+)[”"]/);
  const inProject = tasks.filter((t) => t.projectId === projectId);
  if (quoted) {
    const phrase = quoted[1].trim().toLowerCase();
    const exact = inProject.find((t) => t.title.toLowerCase() === phrase);
    if (exact) return exact.id;
    const partial = inProject.find(
      (t) => t.title.toLowerCase().startsWith(phrase) || t.title.toLowerCase().includes(phrase),
    );
    if (partial) return partial.id;
  }
  return inProject[0]?.id ?? null;
}

export function Dashboard({
  onOpen,
  setView,
  onFocusStatus,
}: {
  onOpen: (id: string) => void;
  setView: (v: ViewKey) => void;
  onFocusStatus: (statusKey: string) => void;
}) {
  const { tasks } = useStore();
  // Shared hover index so the donut + its legend highlight together.
  const [distHover, setDistHover] = useState<number | null>(null);

  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.statusKey !== "done");
    const blocked = tasks.filter((t) => t.isBlocked);
    const dueThisWeek = open.filter((t) => {
      const d = daysUntil(t.dueDate);
      return d !== null && d >= 0 && d <= 7;
    });
    const activeProjects = PROJECTS.filter((p) => !p.archived).length;
    const coverage = AUDIT_TOTALS.total ? AUDIT_TOTALS.verified / AUDIT_TOTALS.total : 0;
    return { open, blocked, dueThisWeek, activeProjects, coverage };
  }, [tasks]);

  // Status distribution across all live tasks (blocked counted as its own slice).
  const distribution = useMemo(() => {
    const order = [
      { key: "doing", label: "In progress", color: "#548dff" },
      { key: "review", label: "Review", color: "#c0c1ff" },
      { key: "todo", label: "To do", color: "#afc6ff" },
      { key: "backlog", label: "Backlog", color: "#8c90a0" },
      { key: "done", label: "Verified", color: "#4edea3" },
      { key: "blocked", label: "Blocked", color: "#f43f5e" },
    ];
    return order
      .map((s) => ({
        ...s,
        value:
          s.key === "blocked"
            ? tasks.filter((t) => t.isBlocked).length
            : tasks.filter((t) => !t.isBlocked && t.statusKey === s.key).length,
      }))
      .filter((s) => s.value > 0);
  }, [tasks]);

  // At-risk: blocked, overdue, or due in the next 2 days, soonest first.
  const atRisk = useMemo(() => {
    return tasks
      .filter((t) => t.statusKey !== "done")
      .filter((t) => {
        if (t.isBlocked) return true;
        const d = daysUntil(t.dueDate);
        return d !== null && d <= 2;
      })
      .sort((a, b) => {
        if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
        return (daysUntil(a.dueDate) ?? 999) - (daysUntil(b.dueDate) ?? 999);
      })
      .slice(0, 6);
  }, [tasks]);

  const verifiedSpark = THROUGHPUT_14D.map((d) => d.verified);
  const createdSpark = THROUGHPUT_14D.map((d) => d.created);
  const totalVerified14 = verifiedSpark.reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1380, margin: "0 auto" }}>
      {/* KPI row */}
      <div
        className="stagger atlas-kpi-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
      >
        <StatCard
          icon="grid"
          label="Active projects"
          value={String(stats.activeProjects)}
          sub={`${stats.open.length} open tasks in flight`}
          accent="var(--primary-bright)"
          spark={createdSpark}
          trend={{ dir: "up", text: "2 launching" }}
        />
        <StatCard
          icon="calendar"
          label="Due this week"
          value={String(stats.dueThisWeek.length)}
          sub="Across all marketplaces"
          accent="var(--warning)"
          spark={verifiedSpark}
          sparkColor="var(--warning)"
        />
        <StatCard
          icon="block"
          label="Blocked"
          value={String(stats.blocked.length)}
          sub={stats.blocked.length ? "Needs unblocking" : "All clear"}
          accent="var(--error)"
          trend={{ dir: "down", text: "watch" }}
        />
        <StatCard
          icon="shield"
          label="Audit coverage"
          value={`${Math.round(stats.coverage * 100)}%`}
          sub={`${AUDIT_TOTALS.verified}/${AUDIT_TOTALS.total} listings verified`}
          accent="var(--secondary)"
          trend={{ dir: "up", text: "+4%" }}
        />
      </div>

      {/* Charts row */}
      <div className="atlas-dash-charts" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 14 }}>
        <Panel>
          <SectionTitle
            icon={<Icon name="activity" size={14} style={{ color: "var(--primary)" }} />}
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <LegendDot color="var(--secondary)" label="Verified" />
                <LegendDot color="var(--primary-bright)" label="Created" />
              </div>
            }
          >
            Throughput · last 14 days
          </SectionTitle>
          <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
              {totalVerified14}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>tasks verified in the window</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <AreaLineChart
              height={210}
              series={[
                { label: "Verified", color: "var(--secondary)", points: verifiedSpark },
                { label: "Created", color: "var(--primary-bright)", points: createdSpark, fill: false },
              ]}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {THROUGHPUT_14D.filter((_, i) => i % 2 === 0).map((d) => (
              <span key={d.day} className="mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>
                {d.day}
              </span>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={<Icon name="board" size={14} style={{ color: "var(--tertiary)" }} />}>
            Status distribution
          </SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14 }}>
            <Donut
              segments={distribution}
              size={150}
              thickness={15}
              centerLabel={String(tasks.length)}
              centerSub="tasks"
              activeIndex={distHover}
              onSegmentHover={setDistHover}
              onSegmentClick={(i) => onFocusStatus(distribution[i].key)}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              {distribution.map((s, i) => {
                const hot = distHover === i;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onFocusStatus(s.key)}
                    onMouseEnter={() => setDistHover(i)}
                    onMouseLeave={() => setDistHover(null)}
                    title={`View ${s.label} in the list`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "5px 7px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      background: hot ? "color-mix(in srgb, var(--primary-bright) 12%, transparent)" : "transparent",
                      transition: "background var(--dur)",
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: "0 0 auto", boxShadow: `0 0 6px ${s.color}` }} />
                    <span style={{ fontSize: 12, color: hot ? "var(--text)" : "var(--text-soft)", flex: 1 }}>{s.label}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{s.value}</span>
                    <Icon name="arrow-up-right" size={12} style={{ color: hot ? "var(--primary)" : "transparent", flex: "0 0 auto" }} />
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* At-risk + activity row */}
      <div className="atlas-dash-lower" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle icon={<Icon name="alert" size={14} style={{ color: "var(--error)" }} />}>
              At risk &amp; blocked
            </SectionTitle>
            <button
              type="button"
              onClick={() => setView("board")}
              style={{ fontSize: 11.5, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              Open board <Icon name="arrow-up-right" size={13} />
            </button>
          </div>
          <div>
            {atRisk.length === 0 && (
              <div style={{ padding: "26px 18px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                Nothing at risk — everything is on track.
              </div>
            )}
            {atRisk.map((t) => (
              <AtRiskRow key={t.id} task={t} onOpen={() => onOpen(t.id)} />
            ))}
          </div>
        </Panel>

        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 12px" }}>
            <SectionTitle icon={<Icon name="sparkle" size={14} style={{ color: "var(--primary)" }} />}>
              Recent activity
            </SectionTitle>
          </div>
          <div style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column" }}>
            {RECENT_ACTIVITY.map((a, i) => {
              const actor = person(a.actorId);
              const proj = project(a.projectId);
              const isLast = i === RECENT_ACTIVITY.length - 1;
              const taskId = resolveFeedTaskId(a.text, a.projectId, tasks);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => taskId && onOpen(taskId)}
                  disabled={!taskId}
                  className="atlas-activity-row"
                  style={{
                    display: "flex",
                    gap: 11,
                    position: "relative",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    borderRadius: 10,
                    padding: "8px 8px",
                    cursor: taskId ? "pointer" : "default",
                    transition: "background var(--dur)",
                  }}
                >
                  {!isLast && (
                    <span style={{ position: "absolute", left: 21, top: 38, bottom: -2, width: 1.5, background: "var(--border)" }} />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    <Avatar personId={a.actorId} size={28} />
                  </span>
                  <div style={{ flex: 1, paddingTop: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{actor?.fullName.split(" ")[0]}</span> {a.text}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: proj?.color, flex: "0 0 auto" }} />
                      <span style={{ fontSize: 10.5, color: "var(--muted-2)" }}>{proj?.name}</span>
                      <span style={{ fontSize: 10.5, color: "var(--muted-2)" }}>· {relTime(a.createdAt)}</span>
                    </div>
                  </div>
                  {taskId && (
                    <Icon
                      name="arrow-up-right"
                      size={13}
                      className="atlas-activity-arrow"
                      style={{ color: "var(--muted-2)", flex: "0 0 auto", alignSelf: "center" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  );
}

function AtRiskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const proj = project(task.projectId);
  const overdue = (daysUntil(task.dueDate) ?? 0) < 0 && !task.isBlocked;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="atlas-risk-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "11px 18px",
        border: "none",
        borderTop: "1px solid var(--border-soft)",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background var(--dur)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flex: "0 0 auto",
          background: task.isBlocked ? "var(--error)" : overdue ? "var(--error)" : "var(--warning)",
          boxShadow: `0 0 7px ${task.isBlocked || overdue ? "var(--error)" : "var(--warning)"}`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: proj?.color, flex: "0 0 auto" }} />
          <span style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
            {proj?.name}
          </span>
        </div>
      </div>
      <PriorityFlag priority={task.priority} />
      {task.isBlocked ? (
        <Chip color="var(--error)">
          <Icon name="block" size={11} /> Blocked
        </Chip>
      ) : (
        <Chip color={overdue ? "var(--error)" : "var(--warning)"}>
          <Icon name="clock" size={11} /> {dueLabel(task.dueDate)}
        </Chip>
      )}
      <MarketplacePill marketplace={task.marketplace} compact />
    </button>
  );
}
