"use client";

// Atlas application shell. Assembles the full client app on top of the store:
//   ┌──────────────────────────────────────────────────────────┐
//   │ Sidebar │ Topbar                                          │
//   │         │──────────────────────────────────────────────  │
//   │         │ active view (dashboard | board | list | …)      │
//   └──────────────────────────────────────────────────────────┘
// Plus the ambient `.fx` background and the right-side TaskDetail slide-over.
// `body { overflow:hidden }` (globals.css) means this owns its own scrolling.

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { StoreProvider, useStore } from "@/lib/store";
import { PROJECTS, project } from "@/lib/seed";
import type { Marketplace, Task, ViewKey } from "@/lib/types";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { Board } from "@/components/board/Board";
import { TaskDetail } from "@/components/task-detail/TaskDetail";
import { Dashboard } from "@/components/views/Dashboard";
import { List } from "@/components/views/List";
import { Audits } from "@/components/views/Audits";
import { Timeline } from "@/components/views/Timeline";

function Fx() {
  return (
    <div className="fx" aria-hidden="true">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />
      <div className="grid" />
    </div>
  );
}

// Shared filtering used by every task-centric view (board / list / timeline).
function matchesSearch(t: Task, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const proj = project(t.projectId);
  return (
    t.title.toLowerCase().includes(needle) ||
    t.description.toLowerCase().includes(needle) ||
    (t.sku?.toLowerCase().includes(needle) ?? false) ||
    (proj?.name.toLowerCase().includes(needle) ?? false) ||
    t.labels.some((l) => l.name.toLowerCase().includes(needle))
  );
}

function Shell() {
  const { tasks } = useStore();

  const [view, setView] = useState<ViewKey>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState<Marketplace | "all">("all");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Tasks scoped by the active project + marketplace + search filters. The
  // dashboard and audits views intentionally ignore these (they're org-wide /
  // audit-specific), but the board, list and timeline all share this set.
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (marketplaceFilter !== "all" && t.marketplace !== marketplaceFilter) return false;
      if (!matchesSearch(t, search)) return false;
      return true;
    });
  }, [tasks, projectFilter, marketplaceFilter, search]);

  const activeProjectName =
    projectFilter ? PROJECTS.find((p) => p.id === projectFilter)?.name ?? null : null;

  function openTask(id: string) {
    setSelectedTaskId(id);
  }

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      <Fx />

      <div style={{ position: "relative", zIndex: 1, display: "flex", height: "100%", width: "100%" }}>
        <Sidebar
          view={view}
          setView={(v) => {
            setView(v);
            setMobileNavOpen(false);
          }}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <Topbar
            view={view}
            search={search}
            setSearch={setSearch}
            marketplaceFilter={marketplaceFilter}
            setMarketplaceFilter={setMarketplaceFilter}
            onNewTask={() => setView("board")}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            projectName={activeProjectName}
          />

          {/* Scrolling content region */}
          <main
            key={view}
            className="atlas-view"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "24px 24px 56px",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: "100%" }}
              >
                {view === "dashboard" && <Dashboard onOpen={openTask} setView={setView} />}
                {view === "board" && <Board tasks={filteredTasks} onOpen={openTask} />}
                {view === "list" && <List tasks={filteredTasks} onOpen={openTask} />}
                {view === "timeline" && <Timeline tasks={filteredTasks} onOpen={openTask} />}
                {view === "audits" && <Audits marketplaceFilter={marketplaceFilter} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <TaskDetail taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}

export function AppShell() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
