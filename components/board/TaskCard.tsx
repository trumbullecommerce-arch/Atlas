"use client";

import { motion } from "motion/react";
import { person } from "@/lib/seed";
import { dueLabel, dueState } from "@/lib/format";
import type { Task } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { AvatarStack, Chip, MarketplacePill, PriorityFlag } from "@/components/ui/Primitives";

const DUE_COLOR: Record<string, string> = {
  overdue: "var(--error)",
  today: "var(--warning)",
  soon: "var(--warning)",
  later: "var(--muted)",
  none: "var(--muted)",
};

export function TaskCard({
  task,
  onOpen,
  dragging = false,
}: {
  task: Task;
  onOpen?: () => void;
  dragging?: boolean;
}) {
  const blocked = task.isBlocked;
  const isDone = task.statusKey === "done";
  const ds = dueState(task.dueDate, isDone);
  const doneChecks = task.checklist.filter((c) => c.done).length;

  // Resting vs lifted shadows; dragging gets a much deeper drop + ring so the
  // card reads as physically picked up off the board.
  const restShadow = "var(--shadow-1)";
  const dragShadow = "0 30px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px var(--border-strong)";

  return (
    <motion.div
      onClick={onOpen}
      className={blocked ? "atlas-task-card is-blocked" : "atlas-task-card"}
      // While dragging (rendered in the DragOverlay), lift + tilt the card with a
      // snappy spring. When resting, a subtle hover-raise + tap-press.
      animate={
        dragging
          ? { scale: 1.04, rotate: 3, boxShadow: dragShadow }
          : { scale: 1, rotate: 0, y: 0, boxShadow: restShadow }
      }
      whileHover={dragging ? undefined : { y: -2 }}
      whileTap={dragging ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        position: "relative",
        padding: "11px 12px",
        borderRadius: 12,
        cursor: dragging ? "grabbing" : "pointer",
        background: blocked ? "color-mix(in srgb, var(--error) 9%, var(--surface))" : "var(--surface)",
        border: `1px solid ${blocked ? "color-mix(in srgb, var(--error) 36%, transparent)" : "var(--border)"}`,
        borderLeft: blocked ? "3px solid var(--error)" : undefined,
        boxShadow: restShadow,
        // Smooth the border-color hover affordance (transform/shadow are driven
        // by Motion above, so they're excluded here).
        transition: "border-color var(--dur)",
      }}
    >
      {/* Top: marketplace + priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <MarketplacePill marketplace={task.marketplace} compact />
        <span style={{ marginLeft: "auto" }}>
          <PriorityFlag priority={task.priority} />
        </span>
      </div>

      {/* Title */}
      <div
        className="clamp-2"
        style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, color: "var(--text)", marginBottom: blocked ? 8 : 10 }}
      >
        {task.title}
      </div>

      {/* Blocked reason */}
      {blocked && task.blockedReason && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            padding: "6px 8px",
            borderRadius: 8,
            marginBottom: 10,
            background: "color-mix(in srgb, var(--error) 12%, transparent)",
          }}
        >
          <Icon name="block" size={12} style={{ color: "var(--error)", marginTop: 2, flex: "0 0 auto" }} />
          <span className="clamp-2" style={{ fontSize: 11, color: "var(--error-soft)", lineHeight: 1.35 }}>
            {task.blockedReason}
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AvatarStack ids={task.assigneeIds} size={22} max={3} />

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
          {task.checklist.length > 0 && (
            <span title="Definition of Done" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: doneChecks === task.checklist.length ? "var(--secondary)" : "var(--muted)" }}>
              <Icon name="check-circle" size={13} />
              <span className="mono">{doneChecks}/{task.checklist.length}</span>
            </span>
          )}
          {task.comments.length > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--muted)" }}>
              <Icon name="comment" size={13} />
              <span className="mono">{task.comments.length}</span>
            </span>
          )}
          {isDone ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--secondary)" }}>
              <Icon name="check-circle" size={13} />
              verified
            </span>
          ) : (
            task.dueDate && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: DUE_COLOR[ds] }}>
                <Icon name="clock" size={12} />
                {dueLabel(task.dueDate)}
              </span>
            )
          )}
        </div>
      </div>

      {/* SKU tag (subtle) */}
      {task.sku && (
        <div style={{ marginTop: 8, display: "flex" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", padding: "1px 6px", borderRadius: 5, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            {task.sku}
          </span>
        </div>
      )}
    </motion.div>
  );
}
