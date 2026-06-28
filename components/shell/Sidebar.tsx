"use client";

// Atlas sidebar — three display modes driven by the user's `sidebarMode` pref:
//
//   "fixed"       → Full 248px sidebar always visible on desktop
//   "icon-rail"   → Narrow 56px icon strip always visible; click logo to expand flyout
//   "collapsible" → No sidebar visible; hamburger in topbar opens a drawer
//
// On small screens (< 860px) all modes fall back to the hamburger + drawer.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PROJECTS, person, ME } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { ViewKey } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
import type { SidebarMode } from "@/lib/prefs";
import styles from "./Sidebar.module.css";

const NAV: { key: ViewKey; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "board", label: "Board", icon: "board" },
  { key: "list", label: "List", icon: "list" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "timeline", label: "Timeline", icon: "timeline" },
  { key: "audits", label: "Audits", icon: "audit" },
];

const HEALTH_COLOR: Record<string, string> = {
  on_track: "var(--secondary)",
  at_risk: "var(--warning)",
  blocked: "var(--error)",
};

/* ── Logo ──────────────────────────────────────────────────────────────── */

function Logo({ onClick }: { onClick?: () => void }) {
  const isClickable = !!onClick;
  return (
    <div
      className={`${styles.logo} ${isClickable ? styles.logoClickable : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
    >
      <div className={styles.logoMark}>
        <Icon name="logo" size={22} />
      </div>
      <div>
        <div className={styles.logoTitle}>ATLAS</div>
        <div className={styles.logoSub}>Command Center</div>
      </div>
    </div>
  );
}

/* ── NavItem ───────────────────────────────────────────────────────────── */

function NavItem({
  item,
  active,
  onClick,
}: {
  item: { key: ViewKey; label: string; icon: IconName };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${active ? "atlas-nav-item is-active" : "atlas-nav-item"} ${styles.navBtn} ${active ? styles.navBtnActive : ""}`}
    >
      {active && (
        <motion.span
          layoutId="nav-active-bar"
          className={styles.navActiveBar}
        />
      )}
      <Icon name={item.icon} size={18} className={active ? styles.navIconActive : styles.navIcon} />
      <span className="lab">{item.label}</span>
    </button>
  );
}

/* ── SidebarContent (shared by desktop rail, mobile drawer, and flyout) ── */

export function SidebarContent({
  view,
  setView,
  projectFilter,
  setProjectFilter,
  onOpenSettings,
  onClose,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  projectFilter: string | null;
  setProjectFilter: (id: string | null) => void;
  onOpenSettings: () => void;
  /** When provided, clicking the logo toggles the drawer closed. */
  onClose?: () => void;
}) {
  const { tasks } = useStore();
  const me = person(ME);

  function projectTaskCount(id: string) {
    return tasks.filter((t) => t.projectId === id && t.statusKey !== "done").length;
  }

  return (
    <div className={styles.content}>
      <Logo onClick={onClose} />

      <div className={styles.divider} />

      <nav className={styles.nav}>
        {NAV.map((item) => (
          <NavItem key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} />
        ))}
      </nav>

      <div className={styles.projHeader}>
        <span className={styles.projLabel}>Projects</span>
        <span className={`mono ${styles.projCount}`}>{PROJECTS.length}</span>
      </div>

      <div className={styles.projList}>
        <button
          type="button"
          onClick={() => {
            setProjectFilter(null);
            // If on a view that doesn't respond to project filter, jump to board
            if (view === "dashboard" || view === "audits") setView("board");
          }}
          className={`${styles.projBtn} ${projectFilter === null ? styles.active : ""}`}
        >
          <Icon name="grid" size={15} className={styles.navIcon} />
          <span className={styles.projName}>All projects</span>
        </button>
        {PROJECTS.map((p) => {
          const selected = projectFilter === p.id;
          const count = projectTaskCount(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProjectFilter(p.id);
                // If on a view that doesn't respond to project filter, jump to board
                if (view === "dashboard" || view === "audits") setView("board");
              }}
              title={p.name}
              className={`${selected ? "atlas-proj-item is-active" : "atlas-proj-item"} ${styles.projBtn} ${selected ? styles.active : ""}`}
            >
              <span
                className={styles.projDot}
                style={{
                  background: HEALTH_COLOR[p.health],
                  boxShadow: `0 0 7px ${HEALTH_COLOR[p.health]}`,
                }}
              />
              <span className={styles.projName}>{p.name}</span>
              {p.kind === "audit" && (
                <Icon name="shield" size={12} className={styles.projAuditIcon} />
              )}
              <span className={`mono ${styles.projTaskCount}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* User / settings */}
      <div className={styles.userSection}>
        <div className={styles.userCard}>
          <Avatar personId={ME} size={32} ring />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{me?.fullName}</div>
            <div className={styles.userRole}>{me?.role}</div>
          </div>
          <button
            type="button"
            aria-label="Settings"
            onClick={onOpenSettings}
            className={styles.settingsBtn}
          >
            <Icon name="settings" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Icon Rail ─────────────────────────────────────────────────────────── */

function IconRail({
  view,
  setView,
  onExpandRail,
  onOpenSettings,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  onExpandRail: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <aside className={`atlas-icon-rail ${styles.iconRail}`}>
      {/* Logo mark — click to expand flyout */}
      <button
        type="button"
        className={styles.railLogoBtn}
        onClick={onExpandRail}
        aria-label="Expand navigation"
        title="Expand navigation"
      >
        <div className={styles.railLogoMark}>
          <Icon name="logo" size={20} />
        </div>
      </button>

      <div className={styles.railDivider} />

      {/* Navigation icons */}
      <nav className={styles.railNav}>
        {NAV.map((item) => {
          const isActive = view === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`${styles.railBtn} ${isActive ? styles.railBtnActive : ""}`}
              onClick={() => setView(item.key)}
              aria-label={item.label}
              title={item.label}
            >
              {isActive && (
                <motion.span
                  layoutId="rail-active-indicator"
                  className={styles.railActiveIndicator}
                />
              )}
              <Icon name={item.icon} size={20} className={isActive ? styles.railIconActive : styles.railIcon} />
            </button>
          );
        })}
      </nav>

      {/* Bottom: settings + avatar */}
      <div className={styles.railBottom}>
        <button
          type="button"
          className={styles.railBtn}
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <Icon name="settings" size={20} className={styles.railIcon} />
        </button>
        <div className={styles.railAvatar}>
          <Avatar personId={ME} size={30} ring />
        </div>
      </div>
    </aside>
  );
}

/* ── Sidebar (exported root) ───────────────────────────────────────────── */

// Composes the three modes + the mobile drawer shared by all.
export function Sidebar(props: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  projectFilter: string | null;
  setProjectFilter: (id: string | null) => void;
  mobileOpen: boolean;
  setMobileOpen: (b: boolean) => void;
  onOpenSettings: () => void;
  sidebarMode: SidebarMode;
}) {
  // State for the icon-rail flyout expansion
  const [railExpanded, setRailExpanded] = useState(false);

  function closeDrawer() {
    props.setMobileOpen(false);
  }

  function closeRailFlyout() {
    setRailExpanded(false);
  }

  return (
    <>
      {/* ── Desktop: Fixed full sidebar ────────────────────────────────── */}
      <aside className={`atlas-sidebar-desktop glass ${styles.desktop}`}>
        <SidebarContent {...props} />
      </aside>

      {/* ── Desktop: Icon Rail ─────────────────────────────────────────── */}
      <IconRail
        view={props.view}
        setView={(v) => {
          props.setView(v);
          setRailExpanded(false);
        }}
        onExpandRail={() => setRailExpanded(true)}
        onOpenSettings={() => {
          props.onOpenSettings();
          setRailExpanded(false);
        }}
      />

      {/* ── Icon Rail flyout overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {railExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRailFlyout}
              className={`atlas-rail-flyout-backdrop ${styles.railFlyoutBackdrop}`}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className={`atlas-rail-flyout ${styles.railFlyout}`}
            >
              <SidebarContent
                {...props}
                setView={(v) => {
                  props.setView(v);
                  setRailExpanded(false);
                }}
                onClose={closeRailFlyout}
                onOpenSettings={() => {
                  props.onOpenSettings();
                  setRailExpanded(false);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile / Collapsible drawer ────────────────────────────────── */}
      <AnimatePresence>
        {props.mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className={`atlas-mobile-only ${styles.backdrop}`}
            />
            <motion.aside
              initial={{ x: -310 }}
              animate={{ x: 0 }}
              exit={{ x: -310 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className={`atlas-mobile-only ${styles.mobileDrawer}`}
            >
              <SidebarContent {...props} onClose={closeDrawer} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
