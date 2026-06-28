"use client";

import { motion, AnimatePresence } from "motion/react";
import { PROJECTS, person, ME } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { ViewKey } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";

const NAV: { key: ViewKey; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "board", label: "Board", icon: "board" },
  { key: "list", label: "List", icon: "list" },
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
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 4px 4px" }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--primary-bright) 26%, transparent), color-mix(in srgb, var(--tertiary-deep) 20%, transparent))",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 0 22px rgba(84,141,255,0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
          color: "var(--primary)",
        }}
      >
        <Icon name="logo" size={22} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text)" }}>ATLAS</div>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
          Command Center
        </div>
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
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "9px 12px",
        borderRadius: 11,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontSize: 13,
        fontWeight: 600,
        color: active ? "var(--text)" : "var(--muted)",
        background: active
          ? "linear-gradient(135deg, rgba(84,141,255,0.22), rgba(128,131,255,0.12))"
          : "transparent",
        boxShadow: active ? "inset 0 0 0 1px var(--border-strong), 0 10px 22px -14px rgba(84,141,255,0.6)" : "none",
        transition: "color var(--dur), background var(--dur)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {active && (
        <motion.span
          layoutId="nav-active-bar"
          style={{
            position: "absolute",
            left: -14,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 999,
            background: "var(--primary-bright)",
            boxShadow: "0 0 10px var(--primary-bright)",
          }}
        />
      )}
      <Icon name={item.icon} size={18} style={{ color: active ? "var(--primary)" : "var(--muted)" }} />
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "18px 14px", gap: 6 }}>
      <Logo />

      <div style={{ height: 1, background: "var(--border-soft)", margin: "12px 0 6px" }} />

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => (
          <NavItem key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} />
        ))}
      </nav>

      <div style={{ marginTop: 18, padding: "0 8px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-2)" }}>
          Projects
        </span>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>{PROJECTS.length}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", flex: 1, margin: "0 -4px", padding: "0 4px" }}>
        <button
          type="button"
          onClick={() => setProjectFilter(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            textAlign: "left",
            color: projectFilter === null ? "var(--text)" : "var(--text-soft)",
            background: projectFilter === null ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        >
          <Icon name="grid" size={15} style={{ color: "var(--muted)" }} />
          <span style={{ flex: 1 }}>All projects</span>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 500,
                textAlign: "left",
                color: selected ? "var(--text)" : "var(--text-soft)",
                background: selected ? "rgba(255,255,255,0.05)" : "transparent",
                transition: "background var(--dur)",
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  background: HEALTH_COLOR[p.health],
                  boxShadow: `0 0 7px ${HEALTH_COLOR[p.health]}`,
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              {p.kind === "audit" && (
                <Icon name="shield" size={12} style={{ color: "var(--muted-2)", flex: "0 0 auto" }} />
              )}
              <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", flex: "0 0 auto" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* User / settings */}
      <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 8px",
            borderRadius: 10,
          }}
        >
          <Avatar personId={ME} size={32} ring />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {me?.fullName}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "capitalize" }}>{me?.role}</div>
          </div>
          <button
            type="button"
            aria-label="Settings"
            onClick={onOpenSettings}
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              transition: "color var(--dur), border-color var(--dur)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
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
      <aside
        className="atlas-sidebar-desktop glass"
        style={{
          width: 248,
          flex: "0 0 248px",
          height: "100%",
          borderRight: "1px solid var(--border)",
          borderTop: "none",
          borderBottom: "none",
          borderLeft: "none",
          background: "var(--glass-2)",
          zIndex: 30,
        }}
      >
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
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(2,6,23,0.6)",
                backdropFilter: "blur(4px)",
                zIndex: 60,
              }}
              className="atlas-mobile-only"
            />
            <motion.aside
              initial={{ x: -310 }}
              animate={{ x: 0 }}
              exit={{ x: -310 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="atlas-mobile-only"
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                width: 300,
                zIndex: 70,
                borderRight: "1px solid var(--border)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-3)",
                overflow: "hidden",
              }}
            >
              <SidebarContent {...props} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
