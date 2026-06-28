"use client";

/**
 * EmptyState — a polished, contextual zero-data state component.
 * Used across all views (Board, List, Calendar, Timeline) when a column,
 * group, or full view has no tasks to display.
 *
 * Features:
 * - Subtle animated illustration (pulse ring + icon)
 * - Context-aware messaging
 * - Optional action button
 */

import { motion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon?: IconName;
  title?: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Smaller variant for inline use (column empty states). */
  compact?: boolean;
}

export function EmptyState({
  icon = "board",
  title = "Nothing here yet",
  subtitle,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={compact ? styles.rootCompact : styles.root}
    >
      {/* Animated icon ring */}
      <div className={styles.iconWrap}>
        <div className={styles.ring} />
        <div className={styles.iconCircle}>
          <Icon name={icon} size={compact ? 18 : 24} />
        </div>
      </div>

      <div className={compact ? styles.titleCompact : styles.title}>{title}</div>

      {subtitle && (
        <div className={styles.subtitle}>{subtitle}</div>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={styles.actionBtn}
        >
          <Icon name="plus" size={13} />
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
