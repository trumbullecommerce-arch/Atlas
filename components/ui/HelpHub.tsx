"use client";

/**
 * HelpHub — contextual help & onboarding system ("HUD").
 * - Quick-tips shown as floating waypoints on first visit
 * - A full help panel accessible from ⌘K > "Help" or the ? button
 * - Context-aware hints based on the current view
 * - Progressive disclosure: tips dismiss individually and persist
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import styles from "./HelpHub.module.css";
import type { ViewKey } from "@/lib/types";

// ── Tip data ──────────────────────────────────────────────────────────────

interface Tip {
  id: string;
  view: ViewKey | "global";
  icon: IconName;
  title: string;
  body: string;
}

const TIPS: Tip[] = [
  {
    id: "nav-shortcuts",
    view: "global",
    icon: "keyboard",
    title: "Keyboard shortcuts",
    body: "Press ⌘K to open the Command Palette, or ⌥+number to switch views instantly. Press ? to see all shortcuts.",
  },
  {
    id: "dash-kpi",
    view: "dashboard",
    icon: "grid",
    title: "KPI cards",
    body: "These cards show real-time stats. Click the status donut chart to drill into that group in the List view.",
  },
  {
    id: "board-drag",
    view: "board",
    icon: "board",
    title: "Drag & drop",
    body: "Grab any card and drag it between columns. Cards tilt in the direction you're moving — a physics-based touch. Drop into Blocked to mark a task as blocked.",
  },
  {
    id: "board-group",
    view: "board",
    icon: "swimlane",
    title: "Swimlanes",
    body: "Use the Group By toggle to organize the board by Marketplace or Owner. Great for standup reviews.",
  },
  {
    id: "list-expand",
    view: "list",
    icon: "list",
    title: "Expandable groups",
    body: "Click any status header to expand/collapse that group. Use the search bar to filter across all groups simultaneously.",
  },
  {
    id: "detail-edit",
    view: "board",
    icon: "settings",
    title: "Edit mode",
    body: "Open a task and click the pencil icon (⚙) to enter edit mode. Change priority, assignees, due dates, and marketplace inline.",
  },
  {
    id: "calendar-tip",
    view: "calendar",
    icon: "calendar",
    title: "Calendar view",
    body: "Tasks with due dates appear as cards on their target day. Navigate months with the arrow buttons.",
  },
  {
    id: "timeline-tip",
    view: "timeline",
    icon: "timeline",
    title: "Timeline",
    body: "Gantt-style bars show each task's duration. Group by project or marketplace for a strategic view.",
  },
];

// ── Persistence ───────────────────────────────────────────────────────────

const STORAGE_KEY = "atlas-dismissed-tips";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* noop */ }
}

// ── HelpHub Panel ─────────────────────────────────────────────────────────

export function HelpPanel({
  open,
  onClose,
  currentView,
}: {
  open: boolean;
  onClose: () => void;
  currentView: ViewKey;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());

  const contextTips = useMemo(
    () => TIPS.filter((t) => t.view === currentView || t.view === "global"),
    [currentView],
  );

  const otherTips = useMemo(
    () => TIPS.filter((t) => t.view !== currentView && t.view !== "global"),
    [currentView],
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setDismissed(new Set());
    saveDismissed(new Set());
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className={styles.backdrop}
          />
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            className={`glass ${styles.panel}`}
          >
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <Icon name="help" size={18} />
                <span>Help &amp; Tips</span>
              </div>
              <button type="button" onClick={onClose} className={styles.closeBtn}>
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className={styles.panelBody}>
              {/* Context-aware section */}
              <div className={styles.section}>
                <div className={styles.sectionLabel}>
                  <Icon name="sparkle" size={13} />
                  This view
                </div>
                {contextTips.map((tip) => (
                  <TipCard
                    key={tip.id}
                    tip={tip}
                    dismissed={dismissed.has(tip.id)}
                    onDismiss={() => dismiss(tip.id)}
                  />
                ))}
              </div>

              {/* Other tips */}
              {otherTips.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>
                    <Icon name="board" size={13} />
                    Other views
                  </div>
                  {otherTips.map((tip) => (
                    <TipCard
                      key={tip.id}
                      tip={tip}
                      dismissed={dismissed.has(tip.id)}
                      onDismiss={() => dismiss(tip.id)}
                    />
                  ))}
                </div>
              )}

              {/* Reset */}
              <button type="button" onClick={resetAll} className={styles.resetBtn}>
                <Icon name="activity" size={13} />
                Reset all tips
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TipCard({ tip, dismissed, onDismiss }: { tip: Tip; dismissed: boolean; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      className={`${styles.tipCard} ${dismissed ? styles.tipDismissed : ""}`}
    >
      <div className={styles.tipIcon}>
        <Icon name={tip.icon} size={15} />
      </div>
      <div className={styles.tipContent}>
        <div className={styles.tipTitle}>{tip.title}</div>
        <div className={styles.tipBody}>{tip.body}</div>
      </div>
      {!dismissed && (
        <button type="button" onClick={onDismiss} className={styles.tipDismissBtn} title="Got it">
          <Icon name="check" size={12} />
        </button>
      )}
      {dismissed && (
        <span className={styles.tipDoneIcon}>
          <Icon name="check-circle" size={14} />
        </span>
      )}
    </motion.div>
  );
}

// ── Floating help button (bottom-right) ───────────────────────────────────

export function HelpFab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={styles.fab}
      aria-label="Help & tips"
      title="Help & tips (⌘K > Help)"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon name="help" size={18} />
    </motion.button>
  );
}
