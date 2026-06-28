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
import s from "./TaskDetail.module.css";

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
    <div className={s.metaRow}>
      <div className={s.metaLabel}>
        <Icon name={icon} size={15} />
        <span className={s.metaLabelText}>{label}</span>
      </div>
      <div className={s.metaValue}>{children}</div>
    </div>
  );
}

function CommentComposer({ onSubmit }: { onSubmit: (body: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className={s.composerWrap}>
      <Avatar personId={ME} size={28} />
      <div className={s.composerInner}>
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
          className={s.composerTextarea}
        />
        <div className={s.composerFooter}>
          <span className={s.composerHint}>⌘↵ to send</span>
          <button
            type="button"
            disabled={!val.trim()}
            onClick={() => {
              onSubmit(val);
              setVal("");
            }}
            className={s.composerBtn}
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
      className={danger ? s.menuItemDanger : s.menuItem}
    >
      <Icon name={icon} size={15} className={danger ? s.menuItemIconDanger : s.menuItemIcon} />
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
    <div className={s.inner}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerTop}>
          <div className={s.headerMeta}>
            <span className={s.projDot} style={{ background: proj?.color, boxShadow: `0 0 7px ${proj?.color}` }} />
            <span className={s.projName}>{proj?.name}</span>
            <span className={`mono ${s.taskId}`}>#{task.id.replace(/^t_/, "").toUpperCase()}</span>
          </div>
          <div className={s.headerActions}>
            {/* Edit toggle */}
            <button
              type="button"
              aria-label={editing ? "Done editing" : "Edit fields"}
              title={editing ? "Done editing" : "Edit fields"}
              onClick={() => setEditing(!editing)}
              className={`${s.iconBtn} ${editing ? s.iconBtnActive : ""}`}
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
                className={s.iconBtn}
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
                className={s.iconBtn}
              >
                <Icon name="more" size={16} />
              </button>
              {menuOpen && (
                <>
                  <div className={s.menuScrim} onClick={() => setMenuOpen(false)} />
                  <div className={s.menuDropdown}>
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
                    <div className={s.menuDivider} />
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
              className={s.iconBtn}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
        <h2 className={s.title}>{task.title}</h2>
      </div>

      {/* Body (scrolls) */}
      <div className={s.body}>
        {/* Blocked banner */}
        {task.isBlocked && task.blockedReason && (
          <div className={s.blockedBanner}>
            <Icon name="block" size={17} className={s.blockedBannerIcon} />
            <div className={s.blockedBannerBody}>
              <div className={s.blockedBannerTitle}>Blocked</div>
              <div className={s.blockedBannerText}>{task.blockedReason}</div>
              {task.blockedSince && (
                <div className={s.blockedBannerSince}>since {relTime(task.blockedSince)}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setBlocked(task.id, false)}
              className={s.clearBlockerBtn}
            >
              Clear blocker
            </button>
          </div>
        )}

        {/* Meta grid */}
        <div>
          <MetaRow icon="activity" label="Status">
            <span className={s.statusSelect}>
              <CustomSelect
                ariaLabel="Status"
                value={task.isBlocked ? "blocked" : task.statusKey}
                onChange={(v) => {
                  if (v === "blocked") setBlocked(task.id, true, "Blocked from detail panel");
                  else moveTask(task.id, v);
                }}
                options={[
                  ...STATUSES.map((st) => ({ value: st.key, label: st.name, color: st.color })),
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
                className={s.editSelect}
              >
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            ) : (
              <span className={s.ownerDisplay}>
                <Avatar personId={task.ownerId} size={22} />
                <span className={s.metaText}>{owner?.fullName}</span>
              </span>
            )}
          </MetaRow>

          <MetaRow icon="users" label="Assignees">
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {task.assigneeIds.map((id) => (
                    <span key={id} className={s.assigneeChip}>
                      <Avatar personId={id} size={18} />
                      <span className={s.assigneeName}>{person(id)?.initials}</span>
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { assigneeIds: task.assigneeIds.filter((a) => a !== id) })}
                        className={s.removeAssigneeBtn}
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
                  className={s.editSelect}
                  style={{ width: "auto" }}
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
                  <span key={id} className={s.assigneeChipReadonly}>
                    <Avatar personId={id} size={18} />
                    <span className={s.assigneeName}>{person(id)?.initials}</span>
                  </span>
                ))
              ) : (
                <span className={s.metaItalic}>None</span>
              )
            )}
          </MetaRow>

          <MetaRow icon="flag" label="Priority">
            {editing ? (
              <select
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: Number(e.target.value) as Priority })}
                className={s.editSelect}
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
                className={s.editSelect}
              />
            ) : (
              <span className={s.metaText}>{formatDate(task.dueDate)}</span>
            )}
          </MetaRow>

          <MetaRow icon="board" label="Marketplace">
            {editing ? (
              <select
                value={task.marketplace ?? ""}
                onChange={(e) => updateTask(task.id, { marketplace: (e.target.value || null) as Marketplace | null })}
                className={s.editSelect}
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
              <span className={`mono ${s.skuBadge}`}>{task.sku}</span>
            </MetaRow>
          )}

          {task.labels.length > 0 && (
            <MetaRow icon="tag" label="Labels">
              {task.labels.map((l) => (
                <Chip key={l.id} color={l.color}>{l.name}</Chip>
              ))}
            </MetaRow>
          )}
        </div>

        {/* Description */}
        <div className={s.divider} />
        <SectionTitle icon={<Icon name="list" size={14} style={{ color: "var(--muted)" }} />}>Description</SectionTitle>
        <p className={s.description}>{task.description}</p>

        {/* Definition of Done checklist */}
        {task.checklist.length > 0 && (
          <>
            <div className={s.sectionGap} />
            <SectionTitle
              icon={<Icon name="check-circle" size={14} style={{ color: "var(--secondary)" }} />}
              right={<span className={`mono ${s.counterLabel}`}>{doneCount}/{task.checklist.length}</span>}
            >
              Definition of Done
            </SectionTitle>
            <div className={s.progressWrap}>
              <ProgressBar value={task.checklist.length ? doneCount / task.checklist.length : 0} height={6} />
            </div>
            <div className={s.checkList}>
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
                  className={`atlas-check-row ${s.checkRow}`}
                >
                  <Checkbox checked={c.done} onClick={() => toggleChecklist(task.id, c.id)} ariaLabel={c.label} />
                  <span className={c.done ? s.checkLabelDone : s.checkLabel}>{c.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <>
            <div className={s.sectionGap} />
            <SectionTitle
              icon={<Icon name="subtask" size={14} style={{ color: "var(--primary)" }} />}
              right={<span className={`mono ${s.counterLabel}`}>{subDone}/{task.subtasks.length}</span>}
            >
              Subtasks
            </SectionTitle>
            <div className={s.checkList} style={{ marginTop: 9 }}>
              {task.subtasks.map((sub) => (
                <div key={sub.id} className={s.subtaskRow}>
                  <Checkbox checked={sub.done} onClick={() => toggleSubtask(task.id, sub.id)} color="var(--primary-bright)" />
                  <span className={sub.done ? s.subtaskTitleDone : s.subtaskTitle}>{sub.title}</span>
                  {sub.ownerId && <Avatar personId={sub.ownerId} size={20} />}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Comments */}
        <div className={s.sectionGapLg} />
        <SectionTitle
          icon={<Icon name="comment" size={14} style={{ color: "var(--muted)" }} />}
          right={<span className={`mono ${s.counterLabel}`}>{task.comments.length}</span>}
        >
          Comments
        </SectionTitle>
        <div className={s.commentList}>
          {task.comments.map((c) => {
            const author = person(c.authorId);
            return (
              <div key={c.id} className={s.commentRow}>
                <Avatar personId={c.authorId} size={28} />
                <div className={s.commentBody}>
                  <div className={s.commentAuthorRow}>
                    <span className={s.commentAuthor}>{author?.fullName}</span>
                    <span className={s.commentTime}>{relTime(c.createdAt)}</span>
                  </div>
                  <div className={s.commentText}>{c.body}</div>
                </div>
              </div>
            );
          })}
          {task.comments.length === 0 && (
            <div className={s.commentEmpty}>No comments yet — start the thread.</div>
          )}
          <CommentComposer onSubmit={(body) => addComment(task.id, body)} />
        </div>

        {/* Activity */}
        <div className={s.sectionGapXl} />
        <SectionTitle icon={<Icon name="activity" size={14} style={{ color: "var(--muted)" }} />}>Activity</SectionTitle>
        <div className={s.activityWrap}>
          {task.activity.map((a, i) => {
            const actor = person(a.actorId);
            const isLast = i === task.activity.length - 1;
            return (
              <div key={a.id} className={s.activityRow}>
                {!isLast && <span className={s.activityLine} />}
                <span
                  className={s.activityIcon}
                  style={{
                    border: `1px solid color-mix(in srgb, ${ACTIVITY_COLOR[a.kind]} 50%, var(--border))`,
                    color: ACTIVITY_COLOR[a.kind],
                  }}
                >
                  <Icon name={ACTIVITY_ICON[a.kind]} size={11} />
                </span>
                <div className={s.activityText}>
                  <span className={s.activityActor}>{actor?.initials}</span> {a.text}
                  <span className={s.activityTime}>{relTime(a.createdAt)}</span>
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
            className={s.backdrop}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0, width: isFullscreen ? "100vw" : "min(540px, 100vw)" }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label={task.title}
            className={`atlas-detail glass ${s.drawer}`}
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
