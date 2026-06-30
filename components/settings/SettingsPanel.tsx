"use client";

// Settings slide-over. Opened from the gear in the sidebar footer. Mirrors the
// look + spring animation of TaskDetail. Scaffolded as labelled "sections" so
// more settings can be dropped in later — today it exposes:
//   • Sidebar display mode (fixed rail vs collapsible drawer)
//   • Theme (light / dark)

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefs, type SidebarMode, type ThemeMode, type DefaultView } from "@/lib/prefs";
import { Icon, type IconName } from "@/components/ui/Icon";

type Mode = ThemeMode;

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--primary)",
          }}
        >
          <Icon name={icon} size={15} />
        </span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
          {description && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{description}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

// A pair of large radio-style cards (the "clear control" the spec asks for).
function OptionCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        minWidth: 0,
        padding: "13px 14px",
        borderRadius: 12,
        textAlign: "left",
        cursor: "pointer",
        color: active ? "var(--text)" : "var(--text-soft)",
        background: active ? "color-mix(in srgb, var(--primary-bright) 14%, transparent)" : "var(--bg-2)",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
        boxShadow: active ? "var(--glow)" : "none",
        transition: "all var(--dur)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Icon name={icon} size={18} style={{ color: active ? "var(--primary)" : "var(--muted)" }} />
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            border: `1.5px solid ${active ? "var(--primary-bright)" : "var(--outline)"}`,
            background: active ? "var(--primary-bright)" : "transparent",
            color: "#fff",
          }}
        >
          {active && <Icon name="check" size={10} strokeWidth={2.6} />}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>{description}</div>
    </button>
  );
}

function Inner({ onClose }: { onClose: () => void }) {
  const { prefs, setPref } = usePrefs();

  function setTheme(next: Mode) {
    setPref("theme", next);
  }

  function setSidebar(next: SidebarMode) {
    setPref("sidebarMode", next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 22px 14px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
                background: "color-mix(in srgb, var(--primary-bright) 18%, transparent)",
                border: "1px solid var(--border-strong)",
                color: "var(--primary)",
              }}
            >
              <Icon name="settings" size={16} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)" }}>Settings</h2>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>Personalize your workspace</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-soft)", cursor: "pointer" }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 28px", display: "flex", flexDirection: "column", gap: 26 }}>
        {/* Sidebar display */}
        <Section
          icon="board"
          title="Sidebar display"
          description="Choose how navigation appears on larger screens."
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <OptionCard
              active={prefs.sidebarMode === "fixed"}
              onClick={() => setSidebar("fixed")}
              icon="swimlane"
              title="Fixed rail"
              description="Navigation stays pinned alongside your work."
            />
            <OptionCard
              active={prefs.sidebarMode === "icon-rail"}
              onClick={() => setSidebar("icon-rail")}
              icon="grid"
              title="Icon rail"
              description="A slim icon strip for quick navigation. Expand for full details."
            />
            <OptionCard
              active={prefs.sidebarMode === "collapsible"}
              onClick={() => setSidebar("collapsible")}
              icon="menu"
              title="Collapsible"
              description="Hide it behind a menu for a full-width canvas."
            />
          </div>
        </Section>

        <div style={{ height: 1, background: "var(--border-soft)" }} />

        {/* Theme */}
        <Section icon="sparkle" title="Appearance" description="Switch between light and dark.">
          <div style={{ display: "flex", gap: 12 }}>
            <OptionCard
              active={prefs.theme === "dark"}
              onClick={() => setTheme("dark")}
              icon="logo"
              title="Dark"
              description="The default midnight command center."
            />
            <OptionCard
              active={prefs.theme === "light"}
              onClick={() => setTheme("light")}
              icon="target"
              title="Light"
              description="A brighter, high-contrast surface."
            />
          </div>
        </Section>

        <div style={{ height: 1, background: "var(--border-soft)" }} />

        {/* Default landing page */}
        <Section
          icon="dashboard"
          title="Default landing page"
          description="Choose which view opens when you log in."
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <OptionCard
              active={prefs.defaultView === "dashboard"}
              onClick={() => setPref("defaultView", "dashboard")}
              icon="grid"
              title="Dashboard"
              description="Start with the cross-project health overview."
            />
            <OptionCard
              active={prefs.defaultView === "board"}
              onClick={() => setPref("defaultView", "board")}
              icon="board"
              title="Board"
              description="Jump straight into the Kanban workflow."
            />
            <OptionCard
              active={prefs.defaultView === "list"}
              onClick={() => setPref("defaultView", "list")}
              icon="list"
              title="List"
              description="Open the dense, sortable task list."
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", backdropFilter: "blur(3px)", zIndex: 80 }}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="atlas-detail glass"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(480px, 100vw)",
              zIndex: 90,
              borderLeft: "1px solid var(--border)",
              background: "var(--glass-2)",
              boxShadow: "var(--shadow-3)",
            }}
          >
            <Inner onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
