"use client";

// Atlas Command Palette — global ⌘K / Ctrl+K fuzzy search.
// Sections: Navigation, Tasks (fuzzy), Actions.
// Uses the cmdk library for keyboard-first interaction.

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { PROJECTS, project } from "@/lib/seed";
import type { ViewKey } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./CommandPalette.module.css";

const VIEW_ITEMS: { key: ViewKey; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "board", label: "Board", icon: "board" },
  { key: "list", label: "List", icon: "list" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "timeline", label: "Timeline", icon: "timeline" },
  { key: "audits", label: "Audits", icon: "audit" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewKey) => void;
  onOpenTask: (id: string) => void;
  onNewTask: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onProjectFilter: (id: string | null) => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenTask,
  onNewTask,
  onToggleTheme,
  onOpenSettings,
  onProjectFilter,
}: CommandPaletteProps) {
  const { tasks } = useStore();
  const [search, setSearch] = useState("");

  // Reset search when opening
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  // Close on Escape (cmdk handles this internally too, but belt-and-suspenders)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={styles.wrapper}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Command shouldFilter label="Atlas Command Palette">
              {/* Search input */}
              <div className={styles.inputWrap}>
                <Icon name="search" size={18} className={styles.searchIcon} />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search tasks, views, actions…"
                  className={styles.input}
                  autoFocus
                />
                <span className={styles.kbd}>ESC</span>
              </div>

              {/* Results */}
              <Command.List className={styles.list}>
                <Command.Empty className={styles.empty}>
                  No results found.
                </Command.Empty>

                {/* Navigation */}
                <Command.Group heading="Navigate" className={styles.group}>
                  {VIEW_ITEMS.map((v) => (
                    <Command.Item
                      key={v.key}
                      value={`navigate ${v.label}`}
                      className={styles.item}
                      onSelect={() => {
                        onNavigate(v.key);
                        onClose();
                      }}
                    >
                      <Icon name={v.icon} size={16} className={styles.itemIcon} />
                      <span className={styles.itemLabel}>{v.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Projects */}
                <Command.Group heading="Projects" className={styles.group}>
                  {PROJECTS.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`project ${p.name}`}
                      className={styles.item}
                      onSelect={() => {
                        onProjectFilter(p.id);
                        onClose();
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: p.color,
                          flexShrink: 0,
                        }}
                      />
                      <span className={styles.itemLabel}>{p.name}</span>
                      <span className={styles.itemMeta}>{p.kind}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Tasks */}
                <Command.Group heading="Tasks" className={styles.group}>
                  {tasks.slice(0, 20).map((t) => {
                    const proj = project(t.projectId);
                    return (
                      <Command.Item
                        key={t.id}
                        value={`task ${t.title} ${proj?.name ?? ""} ${t.sku ?? ""}`}
                        className={styles.item}
                        onSelect={() => {
                          onOpenTask(t.id);
                          onClose();
                        }}
                      >
                        <Icon name="task" size={15} className={styles.itemIcon} />
                        <span className={styles.itemLabel}>{t.title}</span>
                        <span className={styles.itemMeta}>{proj?.name}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {/* Actions */}
                <Command.Group heading="Actions" className={styles.group}>
                  <Command.Item
                    value="create new task"
                    className={styles.item}
                    onSelect={() => {
                      onNewTask();
                      onClose();
                    }}
                  >
                    <Icon name="plus" size={16} className={styles.itemIcon} />
                    <span className={styles.itemLabel}>Create new task</span>
                    <span className={styles.kbd}>C</span>
                  </Command.Item>
                  <Command.Item
                    value="toggle theme dark light mode"
                    className={styles.item}
                    onSelect={() => {
                      onToggleTheme();
                      onClose();
                    }}
                  >
                    <Icon name="theme" size={16} className={styles.itemIcon} />
                    <span className={styles.itemLabel}>Toggle theme</span>
                  </Command.Item>
                  <Command.Item
                    value="open settings preferences"
                    className={styles.item}
                    onSelect={() => {
                      onOpenSettings();
                      onClose();
                    }}
                  >
                    <Icon name="settings" size={16} className={styles.itemIcon} />
                    <span className={styles.itemLabel}>Open settings</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              {/* Footer hints */}
              <div className={styles.footer}>
                <span className={styles.footerHint}>
                  <span className={styles.kbd}>↑↓</span> navigate
                </span>
                <span className={styles.footerHint}>
                  <span className={styles.kbd}>↵</span> select
                </span>
                <span className={styles.footerHint}>
                  <span className={styles.kbd}>esc</span> close
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
