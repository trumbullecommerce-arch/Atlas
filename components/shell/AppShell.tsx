"use client";

import styles from "./AppShell.module.css";

// Atlas application shell. Assembles the full client app on top of the store:
//   ┌──────────────────────────────────────────────────────────┐
//   │ Sidebar │ Topbar                                          │
//   │         │──────────────────────────────────────────────  │
//   │         │ active view (dashboard | board | list | …)      │
//   └──────────────────────────────────────────────────────────┘
// Plus the ambient `.fx` background and the right-side TaskDetail slide-over.
// `body { overflow:hidden }` (globals.css) means this owns its own scrolling.

import { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { StoreProvider, useStore } from "@/lib/store";
import { PrefsProvider, usePrefs } from "@/lib/prefs";
import { ME, PROJECTS, project } from "@/lib/seed";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import type { Marketplace, ScopeFilter, Task, ViewKey } from "@/lib/types";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { Board } from "@/components/board/Board";
import { TaskDetail } from "@/components/task-detail/TaskDetail";
import { NewTaskDrawer } from "@/components/task-create/NewTaskDrawer";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { AtlasToaster } from "@/components/ui/Toaster";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useShortcuts, ShortcutsPanel } from "@/lib/shortcuts";
import { HelpPanel, HelpFab } from "@/components/ui/HelpHub";
import { LogoutModal } from "@/components/ui/LogoutModal";
import { Dashboard } from "@/components/views/Dashboard";
import { List } from "@/components/views/List";
import { Audits } from "@/components/views/Audits";
import { Calendar } from "@/components/views/Calendar";
import { Timeline } from "@/components/views/Timeline";
import { usePresence, type PresenceUser } from "@/lib/supabase/presence";
import { useTaskLocks } from "@/lib/supabase/task-locks";
import { person as seedPerson } from "@/lib/seed";

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
  const { prefs, setPref } = usePrefs();

  const [view, setViewRaw] = useState<ViewKey>(prefs.defaultView ?? "dashboard");

  // Navigate with the native View Transitions API for GPU-composited cross-fades.
  // Falls back to instant state update if the browser doesn't support it.
  const navigateView = useCallback((v: ViewKey) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => setViewRaw(v));
      });
    } else {
      setViewRaw(v);
    }
  }, []);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState<Marketplace | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("everyone");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  // When the dashboard routes into the List focused on a status, this holds the
  // status key so the List can expand + scroll that group into view (see List C).
  const [listFocus, setListFocus] = useState<string | null>(null);

  // ── Presence & Task Locks ───────────────────────────────────────────────
  // Build the current user's presence info from the auth session.
  const { currentUser: authUser } = useAuth();
  const meId = authUser?.id ?? ME; // fallback to seed ME if not logged in

  const presenceUser = useMemo<PresenceUser | null>(() => {
    if (!authUser) {
      const me = seedPerson(ME);
      if (!me) return null;
      return {
        userId: me.id,
        initials: me.initials,
        fullName: me.fullName,
        hue: me.hue,
        joinedAt: new Date().toISOString(),
      };
    }
    return {
      userId: authUser.id,
      initials: authUser.initials,
      fullName: authUser.fullName,
      hue: authUser.hue,
      joinedAt: new Date().toISOString(),
    };
  }, [authUser]);

  const onlineUsers = usePresence(presenceUser);
  const { locks: taskLocks, lockTask, unlockTask } = useTaskLocks(
    presenceUser ? { userId: presenceUser.userId, initials: presenceUser.initials, fullName: presenceUser.fullName, hue: presenceUser.hue } : null,
  );

  // Keyboard shortcuts
  useShortcuts({
    onNavigate: (v) => { navigateView(v); setMobileNavOpen(false); },
    onNewTask: () => setNewTaskOpen(true),
    onCommandPalette: () => setCmdPaletteOpen((p) => !p),
    onClosePanel: () => {
      if (cmdPaletteOpen) { setCmdPaletteOpen(false); return; }
      if (shortcutsOpen) { setShortcutsOpen(false); return; }
      if (selectedTaskId) { setSelectedTaskId(null); return; }
      if (newTaskOpen) { setNewTaskOpen(false); return; }
      if (settingsOpen) { setSettingsOpen(false); return; }
    },
    onFocusSearch: () => {
      const el = document.querySelector<HTMLInputElement>('.atlas-search input');
      el?.focus();
    },
    onShowShortcuts: () => setShortcutsOpen(true),
  });

  // Tasks scoped by the active project + marketplace + scope + search filters.
  // The dashboard and audits views intentionally ignore these (they're org-wide
  // / audit-specific), but the board, list and timeline all share this set.
  const involvingProjects = useMemo(() => {
    // Projects with at least one task assigned to the current user (owner or assignee).
    const ids = new Set<string>();
    for (const t of tasks) {
      if (t.ownerId === meId || t.assigneeIds.includes(meId)) ids.add(t.projectId);
    }
    return ids;
  }, [tasks, meId]);

  const matchesScope = useCallback(
    (t: Task): boolean => {
      if (scopeFilter === "mine") return t.ownerId === meId || t.assigneeIds.includes(meId);
      if (scopeFilter === "involving") return involvingProjects.has(t.projectId);
      return true;
    },
    [scopeFilter, involvingProjects, meId],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (marketplaceFilter !== "all" && t.marketplace !== marketplaceFilter) return false;
      if (!matchesScope(t)) return false;
      if (!matchesSearch(t, search)) return false;
      return true;
    });
  }, [tasks, projectFilter, marketplaceFilter, matchesScope, search]);

  const activeProjectName =
    projectFilter ? PROJECTS.find((p) => p.id === projectFilter)?.name ?? null : null;

  function openTask(id: string) {
    setSelectedTaskId(id);
    lockTask(id);
  }

  function closeTask() {
    setSelectedTaskId(null);
    unlockTask();
  }

  return (
    // data-sidebar drives whether the persistent rail or the hamburger shows on
    // desktop (see the responsive rules in globals.css). Small screens always
    // fall back to the collapsible drawer regardless of this value.
    <div data-sidebar={prefs.sidebarMode} className={styles.root}>
      <Fx />

      <div className={styles.layout}>
        <Sidebar
          view={view}
          setView={(v) => {
            navigateView(v);
            setMobileNavOpen(false);
          }}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
          onOpenSettings={() => {
            setSettingsOpen(true);
            setMobileNavOpen(false);
          }}
          sidebarMode={prefs.sidebarMode}
          onOpenTask={openTask}
          onLogout={() => setLogoutOpen(true)}
        />

        <div className={styles.main}>
          <Topbar
            view={view}
            search={search}
            setSearch={setSearch}
            marketplaceFilter={marketplaceFilter}
            setMarketplaceFilter={setMarketplaceFilter}
            scopeFilter={scopeFilter}
            setScopeFilter={setScopeFilter}
            onNewTask={() => setNewTaskOpen(true)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            projectName={activeProjectName}
            onlineUsers={onlineUsers}
            tasks={tasks}
            onOpenTask={openTask}
            onNavigateAndOpen={(targetView, taskId) => {
              navigateView(targetView);
              setMobileNavOpen(false);
              openTask(taskId);
            }}
          />

          {/* Scrolling content region */}
          <main
            id="atlas-main"
            key={view}
            className={`atlas-view ${styles.view}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={styles.viewMotion}
              >
                {view === "dashboard" && (
                  <Dashboard
                    onOpen={openTask}
                    setView={navigateView}
                    onFocusStatus={(statusKey) => {
                      setListFocus(statusKey);
                      navigateView("list");
                    }}
                  />
                )}
                {view === "board" && <Board tasks={filteredTasks} onOpen={openTask} taskLocks={taskLocks} currentUserId={presenceUser?.userId ?? null} />}
                {view === "list" && (
                  <List
                    tasks={filteredTasks}
                    onOpen={openTask}
                    listFocus={listFocus}
                    clearFocus={() => setListFocus(null)}
                    taskLocks={taskLocks}
                    currentUserId={presenceUser?.userId ?? null}
                  />
                )}
                {view === "calendar" && <Calendar tasks={filteredTasks} onOpen={openTask} />}
                {view === "timeline" && <Timeline tasks={filteredTasks} onOpen={openTask} />}
                {view === "audits" && <Audits marketplaceFilter={marketplaceFilter} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <TaskDetail taskId={selectedTaskId} onClose={closeTask} />

      <NewTaskDrawer
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={(id) => {
          setNewTaskOpen(false);
          // Surface the freshly created task so the user immediately sees it.
          setSelectedTaskId(id);
        }}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onNavigate={(v) => { navigateView(v); setMobileNavOpen(false); }}
        onOpenTask={(id) => setSelectedTaskId(id)}
        onNewTask={() => setNewTaskOpen(true)}
        onToggleTheme={() => {
          const next = prefs.theme === "dark" ? "light" : "dark";
          setPref("theme", next);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onProjectFilter={setProjectFilter}
      />

      <ShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentView={view} />
      <HelpFab onClick={() => setHelpOpen(true)} />

      <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <PrefsProvider>
        <StoreProvider>
          <Shell />
          <AtlasToaster />
        </StoreProvider>
      </PrefsProvider>
    </AuthProvider>
  );
}
