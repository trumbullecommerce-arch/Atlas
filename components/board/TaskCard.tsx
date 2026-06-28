"use client";

import { motion } from "motion/react";
import { person } from "@/lib/seed";
import { dueLabel, dueState } from "@/lib/format";
import type { Task } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { AvatarStack, Chip, MarketplacePill, PriorityFlag } from "@/components/ui/Primitives";
import styles from "./TaskCard.module.css";

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

  const cardClass = [
    styles.card,
    blocked ? `atlas-task-card is-blocked ${styles.blocked}` : "atlas-task-card",
    dragging ? styles.dragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      onClick={onOpen}
      className={cardClass}
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
    >
      {/* Top: marketplace + priority */}
      <div className={styles.header}>
        <MarketplacePill marketplace={task.marketplace} compact />
        <span className={styles.headerPriority}>
          <PriorityFlag priority={task.priority} />
        </span>
      </div>

      {/* Title */}
      <div
        className={`clamp-2 ${styles.title} ${blocked ? styles.blockedTitle : ""}`}
      >
        {task.title}
      </div>

      {/* Blocked reason */}
      {blocked && task.blockedReason && (
        <div className={styles.blockedBanner}>
          <Icon name="block" size={12} className={styles.blockedIcon} />
          <span className={`clamp-2 ${styles.blockedText}`}>
            {task.blockedReason}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <AvatarStack ids={task.assigneeIds} size={22} max={3} />

        <div className={styles.footerMeta}>
          {task.checklist.length > 0 && (
            <span
              title="Definition of Done"
              className={`${styles.metaItem} ${doneChecks === task.checklist.length ? styles.metaComplete : ""}`}
            >
              <Icon name="check-circle" size={13} />
              <span className="mono">{doneChecks}/{task.checklist.length}</span>
            </span>
          )}
          {task.comments.length > 0 && (
            <span className={styles.metaItem}>
              <Icon name="comment" size={13} />
              <span className="mono">{task.comments.length}</span>
            </span>
          )}
          {isDone ? (
            <span className={`${styles.metaItem} ${styles.metaComplete}`}>
              <Icon name="check-circle" size={13} />
              verified
            </span>
          ) : (
            task.dueDate && (
              <span className={styles.metaItem} style={{ color: DUE_COLOR[ds] }}>
                <Icon name="clock" size={12} />
                {dueLabel(task.dueDate)}
              </span>
            )
          )}
        </div>
      </div>

      {/* SKU tag (subtle) */}
      {task.sku && (
        <div className={styles.skuRow}>
          <span className={`mono ${styles.sku}`}>
            {task.sku}
          </span>
        </div>
      )}
    </motion.div>
  );
}
