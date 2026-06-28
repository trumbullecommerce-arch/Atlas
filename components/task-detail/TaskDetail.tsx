"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { ME, person, project, STATUSES, PEOPLE } from "@/lib/seed";
import { formatDate, relTime, PRIORITY_META } from "@/lib/format";
import type { ActivityKind, Task, Marketplace, Priority } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import {
  Avatar,
  Checkbox,
  Chip,
  MarketplacePill,
  PriorityFlag,
  ProgressBar,
  SectionTitle,
  StatusPill,
} from "@/components/ui/Primitives";
import { CustomSelect } from "@/components/ui/Select";

const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  created: "sparkle",
  status: "arrow-up-right",
  comment: "comment",
  assigned: "user",
  blocked: "block",
  unblocked: "check-circle",
  checklist: "check",
  due: "calendar",
};

const ACTIVITY_COLOR: Record<ActivityKind, string> = {
  created: "var(--tertiary)",
  status: "var(--primary-bright)",
  comment: "var(--text-soft)",
  assigned: "var(--primary)",
  blocked: "var(--error)",
  unblocked: "var(--secondary)",
  checklist: "var(--secondary)",
  due: "var(--warning)",
};

function MetaRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 116, flex: "0 0 auto", color: "var(--muted)" }}>
        <Icon name={icon} size={15} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function CommentComposer({ onSubmit }: { onSubmit: (body: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
      <Avatar personId={ME} size={28} />
      <div style={{ flex: 1 }}>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              onSubmit(val);
              setVal("");
            }
          }}
          style={{
            width: "100%",
            resize: "vertical",
            minHeight: 56,
            padding: "9px 11px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-2)",
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-bright)";
            e.currentTarget.style.boxShadow = "var(--glow)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 10.5, color: "var(--muted-2)" }}>⌘↵ to send</span>
          <button
            type="button"
            disabled={!val.trim()}
            onClick={() => {
              onSubmit(val);
              setVal("");
            }}
            style={{
              padding: "6px 13px",
              borderRadius: 8,
              border: "none",
              cursor: val.trim() ? "pointer" : "default",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#fff",
              opacity: val.trim() ? 1 : 0.4,
              background: "var(--primary-bright)",
            }}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}

const MARKETPLACE_OPTIONS: (Marketplace | null)[] = [
  null, "Amazon", "Walmart", "Wayfair", "Lowe's", "Home Depot", "Ferguson Home", "bath1.com",
];

function ActionMenuItem({ icon, label, onClick, danger }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%",
        padding: "8px 10px", borderRadius: 8, border: "none",
        background: "transparent", cursor: "pointer",
        fontSize: 13, fontWeight: 500, fontFamily: "inherit",
        color: danger ? "var(--error)" : "var(--text-soft)",
        transition: "background var(--dur)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "color-mix(in srgb, var(--error) 10%, transparent)" : "rgba(255,255,255,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={icon} size={15} style={{ color: danger ? "var(--error)" : "var(--muted)" }} />
      {label}
    </button>
  );
}

function Inner({ task, onClose, isFullscreen, onToggleFullscreen }: { task: Task; onClose: () => void; isFullscreen?: boolean; onToggleFullscreen?: () => void }) {
  const { toggleChecklist, toggleSubtask, addComment, setBlocked, moveTask, updateTask, deleteTask, duplicateTask } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const proj = project(task.projectId);
  const owner = person(task.ownerId);
  const doneCount = task.checklist.filter((c) => c.done).length;
  const subDone = task.subtasks.filter((s) => s.done).length;
  const status = STATUSES.find((s) => s.key === task.statusKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 22px 14px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: proj?.color, flex: "0 0 auto", boxShadow: `0 0 7px ${proj?.color}` }} />
            <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {proj?.name}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted-2)" }}>#{task.id.replace(/^t_/, "").toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Edit toggle */}
            <button
              type="button"
              aria-label={editing ? "Done editing" : "Edit fields"}
              title={editing ? "Done editing" : "Edit fields"}
              onClick={() => setEditing(!editing)}
              style={{
                width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8,
                border: editing ? "1px solid var(--primary-bright)" : "1px solid var(--border)",
                background: editing ? "color-mix(in srgb, var(--primary-bright) 16%, transparent)" : "transparent",
                color: editing ? "var(--primary)" : "var(--muted)",
                cursor: "pointer",
                transition: "all var(--dur)",
              }}
            >
              <Icon name="settings" size={14} />
            </button>
            {/* Expand to full-screen */}
            {onToggleFullscreen && (
              <button
                type="button"
                aria-label={isFullscreen ? "Collapse" : "Expand"}
                title={isFullscreen ? "Collapse to drawer" : "Expand full screen"}
                onClick={onToggleFullscreen}
                style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name={isFullscreen ? "chevron-right" : "arrow-up-right"} size={16} />
              </button>
            )}
            {/* More menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="More"
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="more" size={16} />
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setMenuOpen(false)} />
                  <div
                    style={{
                      position: "absolute", right: 0, top: 36, zIndex: 101,
                      minWidth: 180, padding: 5, borderRadius: 12,
                      background: "var(--surface)", border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-3)",
                    }}
                  >
                    <ActionMenuItem
                      icon="settings"
                      label={editing ? "Stop editing" : "Edit all fields"}
                      onClick={() => { setEditing(!editing); setMenuOpen(false); }}
                    />
                    <ActionMenuItem
                      icon="plus"
                      label="Duplicate task"
                      onClick={() => { duplicateTask(task.id); setMenuOpen(false); }}
                    />
                    <ActionMenuItem
                      icon="link"
                      label="Copy task ID"
                      onClick={() => {
                        navigator.clipboard.writeText(task.id).catch(() => {});
                        setMenuOpen(false);
                      }}
                    />
                    <div style={{ height: 1, background: "var(--border-soft)", margin: "4px 0" }} />
                    <ActionMenuItem
                      icon="close"
                      label="Delete task"
                      danger
                      onClick={() => { deleteTask(task.id); onClose(); setMenuOpen(false); }}
                    />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-soft)", cursor: "pointer" }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25, color: "var(--text)" }}>
          {task.title}
        </h2>
      </div>

      {/* Body (scrolls) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px 28px" }}>
        {/* Blocked banner */}
        {task.isBlocked && task.blockedReason && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "11px 13px",
              borderRadius: 12,
              marginBottom: 16,
              background: "color-mix(in srgb, var(--error) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--error) 38%, transparent)",
              borderLeft: "3px solid var(--error)",
            }}
          >
            <Icon name="block" size={17} style={{ color: "var(--error)", marginTop: 1, flex: "0 0 auto" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--error-soft)" }}>Blocked</div>
              <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: 2, lineHeight: 1.4 }}>{task.blockedReason}</div>
              {task.blockedSince && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>since {relTime(task.blockedSince)}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setBlocked(task.id, false)}
              style={{ alignSelf: "center", padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--secondary)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Clear blocker
            </button>
          </div>
        )}

        {/* Meta grid */}
        <div style={{ borderRadius: 12 }}>
          <MetaRow icon="activity" label="Status">
            <span style={{ width: 168, flex: "0 0 auto" }}>
              <CustomSelect
                ariaLabel="Status"
                value={task.isBlocked ? "blocked" : task.statusKey}
                onChange={(v) => {
                  if (v === "blocked") setBlocked(task.id, true, "Blocked from detail panel");
                  else moveTask(task.id, v);
                }}
                options={[
                  ...STATUSES.map((s) => ({ value: s.key, label: s.name, color: s.color })),
                  { value: "blocked", label: "Blocked", color: "var(--error)" },
                ]}
              />
            </span>
            {status && <StatusPill statusKey={task.statusKey} />}
          </MetaRow>

          <MetaRow icon="user" label="Owner">
            {editing ? (
              <select
                value={task.ownerId}
                onChange={(e) => updateTask(task.id, { ownerId: e.target.value })}
                style={{
                  padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--surface)", color: "var(--text-soft)", fontSize: 12.5,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Avatar personId={task.ownerId} size={22} />
                <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{owner?.fullName}</span>
              </span>
            )}
          </MetaRow>

          <MetaRow icon="users" label="Assignees">
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {task.assigneeIds.map((id) => (
                    <span
                      key={id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px 2px 2px", borderRadius: 999,
                        background: "var(--surface)", border: "1px solid var(--border)",
                      }}
                    >
                      <Avatar personId={id} size={18} />
                      <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>{person(id)?.initials}</span>
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { assigneeIds: task.assigneeIds.filter((a) => a !== id) })}
                        style={{
                          width: 16, height: 16, display: "grid", placeItems: "center",
                          borderRadius: "50%", border: "none", background: "transparent",
                          color: "var(--muted)", cursor: "pointer", fontSize: 11, padding: 0,
                        }}
                        aria-label={`Remove ${person(id)?.initials}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !task.assigneeIds.includes(e.target.value)) {
                      updateTask(task.id, { assigneeIds: [...task.assigneeIds, e.target.value] });
                    }
                  }}
                  style={{
                    padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text-soft)", fontSize: 12,
                    fontFamily: "inherit", cursor: "pointer", width: "auto",
                  }}
                >
                  <option value="">+ Add assignee</option>
                  {PEOPLE.filter((p) => !task.assigneeIds.includes(p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>
            ) : (
              task.assigneeIds.length > 0 ? (
                task.assigneeIds.map((id) => (
                  <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px 2px 2px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <Avatar personId={id} size={18} />
                    <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>{person(id)?.initials}</span>
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--muted-2)", fontStyle: "italic" }}>None</span>
              )
            )}
          </MetaRow>

          <MetaRow icon="flag" label="Priority">
            {editing ? (
              <select
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: Number(e.target.value) as Priority })}
                style={{
                  padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--surface)", color: "var(--text-soft)", fontSize: 12.5,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {([1, 2, 3, 4] as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                ))}
              </select>
            ) : (
              <Chip color={PRIORITY_META[task.priority].color}>
                <Icon name="flag" size={12} />
                {PRIORITY_META[task.priority].label}
              </Chip>
            )}
          </MetaRow>

          <MetaRow icon="calendar" label="Target date">
            {editing ? (
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
                style={{
                  padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--surface)", color: "var(--text-soft)", fontSize: 12.5,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              />
            ) : (
              <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{formatDate(task.dueDate)}</span>
            )}
          </MetaRow>

          <MetaRow icon="board" label="Marketplace">
            {editing ? (
              <select
                value={task.marketplace ?? ""}
                onChange={(e) => updateTask(task.id, { marketplace: (e.target.value || null) as Marketplace | null })}
                style={{
                  padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--surface)", color: "var(--text-soft)", fontSize: 12.5,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {MARKETPLACE_OPTIONS.map((m) => (
                  <option key={m ?? "none"} value={m ?? ""}>{m ?? "— None —"}</option>
                ))}
              </select>
            ) : (
              <MarketplacePill marketplace={task.marketplace} />
            )}
          </MetaRow>

          {task.sku && (
            <MetaRow icon="sku" label="SKU / Ref">
              <span className="mono" style={{ fontSize: 12, color: "var(--text-soft)", padding: "2px 8px", borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                {task.sku}
              </span>
            </MetaRow>
          )}

          {task.labels.length > 0 && (
            <MetaRow icon="tag" label="Labels">
              {task.labels.map((l) => (
                <Chip key={l.id} color={l.color}>
                  {l.name}
                </Chip>
              ))}
            </MetaRow>
          )}
        </div>

        {/* Description */}
        <div style={{ height: 1, background: "var(--border-soft)", margin: "14px 0 16px" }} />
        <SectionTitle icon={<Icon name="list" size={14} style={{ color: "var(--muted)" }} />}>Description</SectionTitle>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--text-soft)" }}>{task.description}</p>

        {/* Definition of Done checklist */}
        {task.checklist.length > 0 && (
          <>
            <div style={{ marginTop: 20 }} />
            <SectionTitle
              icon={<Icon name="check-circle" size={14} style={{ color: "var(--secondary)" }} />}
              right={
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {doneCount}/{task.checklist.length}
                </span>
              }
            >
              Definition of Done
            </SectionTitle>
            <div style={{ marginTop: 9, marginBottom: 11 }}>
              <ProgressBar value={task.checklist.length ? doneCount / task.checklist.length : 0} height={6} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {task.checklist.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={c.done}
                  onClick={() => toggleChecklist(task.id, c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleChecklist(task.id, c.id);
                    }
                  }}
                  className="atlas-check-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 8px",
                    borderRadius: 8,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background var(--dur)",
                  }}
                >
                  <Checkbox checked={c.done} onClick={() => toggleChecklist(task.id, c.id)} ariaLabel={c.label} />
                  <span style={{ fontSize: 13, color: c.done ? "var(--muted)" : "var(--text-soft)", textDecoration: c.done ? "line-through" : "none" }}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <>
            <div style={{ marginTop: 20 }} />
            <SectionTitle
              icon={<Icon name="subtask" size={14} style={{ color: "var(--primary)" }} />}
              right={
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {subDone}/{task.subtasks.length}
                </span>
              }
            >
              Subtasks
            </SectionTitle>
            <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 2 }}>
              {task.subtasks.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 8px",
                    borderRadius: 8,
                  }}
                >
                  <Checkbox checked={s.done} onClick={() => toggleSubtask(task.id, s.id)} color="var(--primary-bright)" />
                  <span style={{ flex: 1, fontSize: 13, color: s.done ? "var(--muted)" : "var(--text-soft)", textDecoration: s.done ? "line-through" : "none" }}>
                    {s.title}
                  </span>
                  {s.ownerId && <Avatar personId={s.ownerId} size={20} />}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Comments */}
        <div style={{ marginTop: 22 }} />
        <SectionTitle
          icon={<Icon name="comment" size={14} style={{ color: "var(--muted)" }} />}
          right={<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{task.comments.length}</span>}
        >
          Comments
        </SectionTitle>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          {task.comments.map((c) => {
            const author = person(c.authorId);
            return (
              <div key={c.id} style={{ display: "flex", gap: 9 }}>
                <Avatar personId={c.authorId} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{author?.fullName}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-2)" }}>{relTime(c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5, marginTop: 2 }}>{c.body}</div>
                </div>
              </div>
            );
          })}
          {task.comments.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--muted-2)", fontStyle: "italic" }}>No comments yet — start the thread.</div>
          )}
          <CommentComposer onSubmit={(body) => addComment(task.id, body)} />
        </div>

        {/* Activity */}
        <div style={{ marginTop: 24 }} />
        <SectionTitle icon={<Icon name="activity" size={14} style={{ color: "var(--muted)" }} />}>Activity</SectionTitle>
        <div style={{ marginTop: 12, position: "relative", paddingLeft: 4 }}>
          {task.activity.map((a, i) => {
            const actor = person(a.actorId);
            const isLast = i === task.activity.length - 1;
            return (
              <div key={a.id} style={{ display: "flex", gap: 11, position: "relative", paddingBottom: isLast ? 0 : 14 }}>
                {!isLast && (
                  <span style={{ position: "absolute", left: 10, top: 22, bottom: 0, width: 1.5, background: "var(--border)" }} />
                )}
                <span
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: "50%",
                    flex: "0 0 auto",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--surface)",
                    border: `1px solid color-mix(in srgb, ${ACTIVITY_COLOR[a.kind]} 50%, var(--border))`,
                    color: ACTIVITY_COLOR[a.kind],
                    zIndex: 1,
                  }}
                >
                  <Icon name={ACTIVITY_ICON[a.kind]} size={11} />
                </span>
                <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.4, paddingTop: 2 }}>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{actor?.initials}</span> {a.text}
                  <span style={{ color: "var(--muted-2)", marginLeft: 6, fontSize: 11 }}>{relTime(a.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TaskDetail({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { tasks } = useStore();
  const task = tasks.find((t) => t.id === taskId) ?? null;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset fullscreen when task changes.
  useEffect(() => { setIsFullscreen(false); }, [taskId]);

  // Close on Escape.
  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskId, onClose, isFullscreen]);

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", backdropFilter: "blur(3px)", zIndex: 80 }}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0, width: isFullscreen ? "100vw" : "min(540px, 100vw)" }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label={task.title}
            className="atlas-detail glass"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 90,
              borderLeft: "1px solid var(--border)",
              background: "var(--glass-2)",
              boxShadow: "var(--shadow-3)",
            }}
          >
            <Inner
              task={task}
              onClose={onClose}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
