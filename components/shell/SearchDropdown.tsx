"use client";

/**
 * SearchDropdown — Global search results panel that appears below the search
 * bar when typing on non-board/list views. Shows matching tasks with quick
 * actions to open in the detail drawer, board view, or list view.
 */

import { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { person, project } from "@/lib/seed";
import { MARKETPLACE_META, PRIORITY_META } from "@/lib/format";
import type { Task, ViewKey } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
import styles from "./SearchDropdown.module.css";

function matchesSearch(t: Task, q: string): boolean {
  if (!q) return false;
  const needle = q.toLowerCase();
  const proj = project(t.projectId);
  return (
    t.title.toLowerCase().includes(needle) ||
    t.description.toLowerCase().includes(needle) ||
    (t.sku?.toLowerCase().includes(needle) ?? false) ||
    (proj?.name.toLowerCase().includes(needle) ?? false) ||
    (t.marketplace?.toLowerCase().includes(needle) ?? false) ||
    t.labels.some((l) => l.name.toLowerCase().includes(needle))
  );
}

export function SearchDropdown({
  search,
  tasks,
  view,
  onOpenTask,
  onNavigateAndOpen,
  onClose,
}: {
  search: string;
  tasks: Task[];
  view: ViewKey;
  onOpenTask: (id: string) => void;
  onNavigateAndOpen: (view: ViewKey, taskId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Only show the dropdown on views that don't already do inline search filtering
  const isSearchView = view === "board" || view === "list";
  const show = search.trim().length > 0 && !isSearchView;

  const results = useMemo(() => {
    if (!show) return [];
    return tasks.filter((t) => matchesSearch(t, search)).slice(0, 12);
  }, [show, tasks, search]);

  // Close on click outside
  useEffect(() => {
    if (!show) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Don't close if clicking the search input itself
        const searchInput = document.querySelector(".atlas-search");
        if (searchInput?.contains(e.target as Node)) return;
        onClose();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [show, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={ref}
          className={styles.dropdown}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <Icon name="search" size={13} />
            <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Results */}
          {results.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="search" size={20} />
              <span>No tasks matching &ldquo;{search}&rdquo;</span>
            </div>
          ) : (
            <div className={styles.list}>
              {results.map((task) => {
                const p = project(task.projectId);
                const owner = person(task.ownerId);
                const mpMeta = task.marketplace ? MARKETPLACE_META[task.marketplace] : null;
                const mpLabel = mpMeta?.abbr ?? task.marketplace ?? "";
                const mpColor = mpMeta?.color ?? "#888";
                const priMeta = PRIORITY_META[task.priority];

                return (
                  <div key={task.id} className={styles.result}>
                    {/* Click to open drawer */}
                    <button
                      type="button"
                      className={styles.resultMain}
                      onClick={() => {
                        onOpenTask(task.id);
                        onClose();
                      }}
                    >
                      {/* Priority dot */}
                      <span
                        className={styles.priDot}
                        style={{ background: priMeta?.color ?? "var(--muted)" }}
                        title={`P${task.priority}`}
                      />

                      {/* Task info */}
                      <div className={styles.resultInfo}>
                        <div className={styles.resultTitle}>{task.title}</div>
                        <div className={styles.resultMeta}>
                          {p && <span className={styles.projectTag}>{p.name}</span>}
                          {mpLabel && (
                            <span className={styles.mpChip} style={{ color: mpColor }}>
                              {mpLabel}
                            </span>
                          )}
                          {task.sku && <span className={styles.skuTag}>SKU: {task.sku}</span>}
                        </div>
                      </div>

                      {/* Owner */}
                      {owner && (
                        <div className={styles.resultOwner}>
                          <Avatar personId={task.ownerId} size={22} />
                        </div>
                      )}
                    </button>

                    {/* Navigate actions */}
                    <div className={styles.resultActions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        title="Open in Board view"
                        onClick={() => {
                          onNavigateAndOpen("board", task.id);
                          onClose();
                        }}
                      >
                        <Icon name="board" size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        title="Open in List view"
                        onClick={() => {
                          onNavigateAndOpen("list", task.id);
                          onClose();
                        }}
                      >
                        <Icon name="list" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {results.length > 0 && (
            <div className={styles.footer}>
              <span>Press <kbd>↵</kbd> to open · <kbd>Esc</kbd> to close</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
