"use client";

import { motion, AnimatePresence } from "motion/react";
import { PROJECTS, person, ME } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { ViewKey } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
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

function Logo() {
  return (
    <div className={styles.logo}>
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

export function SidebarContent({
  view,
  setView,
  projectFilter,
  setProjectFilter,
  onOpenSettings,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  projectFilter: string | null;
  setProjectFilter: (id: string | null) => void;
  onOpenSettings: () => void;
}) {
  const { tasks } = useStore();
  const me = person(ME);

  function projectTaskCount(id: string) {
    return tasks.filter((t) => t.projectId === id && t.statusKey !== "done").length;
  }

  return (
    <div className={styles.content}>
      <Logo />

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
          onClick={() => setProjectFilter(null)}
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
              onClick={() => setProjectFilter(p.id)}
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

// Desktop fixed sidebar + mobile drawer.
export function Sidebar(props: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  projectFilter: string | null;
  setProjectFilter: (id: string | null) => void;
  mobileOpen: boolean;
  setMobileOpen: (b: boolean) => void;
  onOpenSettings: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className={`atlas-sidebar-desktop glass ${styles.desktop}`}>
        <SidebarContent {...props} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {props.mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => props.setMobileOpen(false)}
              className={`atlas-mobile-only ${styles.backdrop}`}
            />
            <motion.aside
              initial={{ x: -310 }}
              animate={{ x: 0 }}
              exit={{ x: -310 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className={`atlas-mobile-only ${styles.mobileDrawer}`}
            >
              <SidebarContent {...props} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
