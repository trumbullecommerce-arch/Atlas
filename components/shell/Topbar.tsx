"use client";

import { useState } from "react";
import { PEOPLE } from "@/lib/seed";
import { MARKETPLACE_META } from "@/lib/format";
import type { Marketplace, ScopeFilter, ViewKey } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, IconButton } from "@/components/ui/Primitives";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const VIEW_TITLES: Record<ViewKey, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Cross-project health across all your channels" },
  board: { title: "Board", sub: "Drag work across the pipeline" },
  list: { title: "List", sub: "Every task, grouped and sortable" },
  calendar: { title: "Calendar", sub: "Tasks plotted on a monthly grid" },
  timeline: { title: "Timeline", sub: "Work plotted against target dates" },
  audits: { title: "Audits", sub: "Coverage-verified, not a checkbox" },
};

// Full channel list (order matters for the dropdown). Mirrors the Marketplace
// union in lib/types.ts and the swimlanes in Board.tsx.
const MARKETPLACES: Marketplace[] = [
  "Amazon",
  "Walmart",
  "Wayfair",
  "Lowe's",
  "Home Depot",
  "Ferguson Home",
  "bath1.com",
];

// Small color dot used in both the trigger and the menu rows.
function ChannelDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flex: "0 0 auto",
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  );
}

// On-theme dropdown that replaces the old segmented marketplace filter. Scales
// cleanly to all 7 channels; renders a glass popover like the other menus.
function MarketplaceFilter({
  value,
  onChange,
}: {
  value: Marketplace | "all";
  onChange: (m: Marketplace | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const isAll = value === "all";
  const selColor = isAll ? "var(--muted)" : MARKETPLACE_META[value].color;

  return (
    <div className="atlas-mp-filter" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 10px 0 12px",
          borderRadius: 10,
          border: `1px solid ${open ? "var(--border-strong)" : "var(--border)"}`,
          background: "var(--bg-2)",
          color: "var(--text)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: open ? "var(--glow)" : "none",
          transition: "border-color var(--dur), box-shadow var(--dur)",
        }}
      >
        <ChannelDot color={selColor} />
        <span>{isAll ? "All channels" : value}</span>
        <Icon
          name="chevron-down"
          size={14}
          style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dur)" }}
        />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            role="listbox"
            className="glass"
            style={{
              position: "absolute",
              right: 0,
              top: 46,
              zIndex: 50,
              minWidth: 184,
              borderRadius: 12,
              padding: 5,
              boxShadow: "var(--shadow-3)",
            }}
          >
            {(["all", ...MARKETPLACES] as const).map((m) => {
              const on = value === m;
              const color = m === "all" ? "var(--muted)" : MARKETPLACE_META[m].color;
              return (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12.5,
                    fontWeight: on ? 600 : 500,
                    color: on ? "var(--text)" : "var(--text-soft)",
                    background: on ? "rgba(255,255,255,0.05)" : "transparent",
                    transition: "background var(--dur)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = on ? "rgba(255,255,255,0.05)" : "transparent")}
                >
                  <ChannelDot color={color} />
                  <span style={{ flex: 1 }}>{m === "all" ? "All channels" : m}</span>
                  {on && <Icon name="check" size={14} style={{ color: "var(--secondary)" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Assignment-scope options (order matters for the dropdown). Each carries the
// icon + short trigger label used by the on-theme glass popover below.
const SCOPE_OPTIONS: { key: ScopeFilter; label: string; trigger: string; icon: IconName; desc: string }[] = [
  { key: "everyone", label: "Everyone", trigger: "Everyone", icon: "users", desc: "All tasks across the team" },
  { key: "mine", label: "Assigned to me", trigger: "Assigned to me", icon: "user", desc: "I own or am an assignee" },
  { key: "involving", label: "Involving me", trigger: "Involving me", icon: "grid", desc: "Any project I'm part of" },
];

// On-theme scope filter; renders a glass popover like the channel menu. Filters
// the board / list / timeline by how the task relates to the current user.
function ScopeFilterControl({
  value,
  onChange,
}: {
  value: ScopeFilter;
  onChange: (s: ScopeFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = SCOPE_OPTIONS.find((o) => o.key === value) ?? SCOPE_OPTIONS[0];
  const accent = value === "everyone" ? "var(--muted)" : "var(--primary)";

  return (
    <div className="atlas-scope-filter" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Filter by assignment"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 10px 0 11px",
          borderRadius: 10,
          border: `1px solid ${open ? "var(--border-strong)" : "var(--border)"}`,
          background: "var(--bg-2)",
          color: "var(--text)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: open ? "var(--glow)" : "none",
          transition: "border-color var(--dur), box-shadow var(--dur)",
        }}
      >
        <Icon name={current.icon} size={15} style={{ color: accent }} />
        <span className="atlas-scope-label">{current.trigger}</span>
        <Icon
          name="chevron-down"
          size={14}
          style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dur)" }}
        />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            role="listbox"
            className="glass"
            style={{
              position: "absolute",
              right: 0,
              top: 46,
              zIndex: 50,
              minWidth: 224,
              borderRadius: 12,
              padding: 5,
              boxShadow: "var(--shadow-3)",
            }}
          >
            {SCOPE_OPTIONS.map((o) => {
              const on = value === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 9px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    background: on ? "rgba(255,255,255,0.05)" : "transparent",
                    transition: "background var(--dur)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = on ? "rgba(255,255,255,0.05)" : "transparent")}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      flex: "0 0 auto",
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      color: on ? "var(--primary)" : "var(--muted)",
                      background: on ? "color-mix(in srgb, var(--primary-bright) 14%, transparent)" : "var(--bg-2)",
                      border: `1px solid ${on ? "color-mix(in srgb, var(--primary-bright) 32%, transparent)" : "var(--border)"}`,
                    }}
                  >
                    <Icon name={o.icon} size={15} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--text)" : "var(--text-soft)" }}>
                      {o.label}
                    </span>
                    <span style={{ display: "block", fontSize: 10.5, color: "var(--muted-2)", marginTop: 1 }}>{o.desc}</span>
                  </span>
                  {on && <Icon name="check" size={14} style={{ color: "var(--secondary)", flex: "0 0 auto" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function Topbar({
  view,
  search,
  setSearch,
  marketplaceFilter,
  setMarketplaceFilter,
  scopeFilter,
  setScopeFilter,
  onNewTask,
  onOpenMobileNav,
  projectName,
}: {
  view: ViewKey;
  search: string;
  setSearch: (s: string) => void;
  marketplaceFilter: Marketplace | "all";
  setMarketplaceFilter: (m: Marketplace | "all") => void;
  scopeFilter: ScopeFilter;
  setScopeFilter: (s: ScopeFilter) => void;
  onNewTask: () => void;
  onOpenMobileNav: () => void;
  projectName: string | null;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const meta = VIEW_TITLES[view];
  const showMarketplaceFilter = view === "board" || view === "list" || view === "audits";
  // Scope filter applies to the task-centric views that share AppShell's filter.
  const showScopeFilter = view === "board" || view === "list" || view === "timeline";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 25,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--glass-2)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        flexWrap: "wrap",
      }}
    >
      {/* open command center */}
      <button
        type="button"
        aria-label="Open command center"
        title="Open command center"
        onClick={onOpenMobileNav}
        className="atlas-mobile-only"
        style={{
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          border: "1px solid var(--border-strong)",
          background: "color-mix(in srgb, var(--primary-bright) 12%, var(--glass))",
          color: "var(--primary)",
          cursor: "pointer",
          transition: "background var(--dur), transform var(--dur), box-shadow var(--dur)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "color-mix(in srgb, var(--primary-bright) 26%, transparent)";
          e.currentTarget.style.transform = "translateY(-1px) scale(1.05)";
          e.currentTarget.style.boxShadow = "var(--glow)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "color-mix(in srgb, var(--primary-bright) 12%, var(--glass))";
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <Icon name="menu" size={18} />
      </button>

      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)", lineHeight: 1.15 }}>
          {meta.title}
          {projectName && (
            <span style={{ color: "var(--muted)", fontWeight: 500 }}>
              {"  ·  "}
              <span style={{ color: "var(--text-soft)", fontSize: 15 }}>{projectName}</span>
            </span>
          )}
        </h1>
        <p className="atlas-topbar-sub" style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          {meta.sub}
        </p>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div className="atlas-search" style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Icon name="search" size={16} style={{ position: "absolute", left: 11, color: "var(--muted)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks, SKUs, owners…"
          style={{
            width: 240,
            height: 38,
            padding: "0 12px 0 34px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-2)",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
            transition: "border-color var(--dur), box-shadow var(--dur)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-bright)";
            e.currentTarget.style.boxShadow = "var(--glow)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Assignment-scope filter (everyone / mine / involving me) */}
      {showScopeFilter && (
        <ScopeFilterControl value={scopeFilter} onChange={setScopeFilter} />
      )}

      {/* Marketplace filter (dropdown — scales to all 7 channels) */}
      {showMarketplaceFilter && (
        <MarketplaceFilter value={marketplaceFilter} onChange={setMarketplaceFilter} />
      )}

      <ThemeToggle />

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <IconButton
          icon={<Icon name="bell" size={18} />}
          label="Notifications"
          badge={3}
          active={notifOpen}
          onClick={() => setNotifOpen((v) => !v)}
        />
        {notifOpen && (
          <>
            <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div
              className="glass"
              style={{
                position: "absolute",
                right: 0,
                top: 46,
                width: 300,
                borderRadius: 14,
                padding: 12,
                zIndex: 50,
                boxShadow: "var(--shadow-3)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Notifications
              </div>
              {[
                { c: "var(--error)", t: "Prop 65 flags blocked — legal language pending", w: "2h ago" },
                { c: "var(--warning)", t: "7 SKUs fall below cost in pricing model", w: "5h ago" },
                { c: "var(--secondary)", t: "Avery commented on Walmart listings", w: "yesterday" },
              ].map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 9, padding: "8px 6px", borderRadius: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.c, marginTop: 5, flex: "0 0 auto", boxShadow: `0 0 6px ${n.c}` }} />
                  <div>
                    <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.35 }}>{n.t}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 2 }}>{n.w}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Team avatars */}
      <div className="atlas-team" style={{ display: "flex", alignItems: "center" }}>
        {PEOPLE.slice(0, 4).map((p, i) => (
          <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: "50%", boxShadow: "0 0 0 2px var(--floor)" }}>
            <Avatar personId={p.id} size={30} />
          </span>
        ))}
      </div>

      {/* New task */}
      <button
        type="button"
        onClick={onNewTask}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 38,
          padding: "0 15px",
          borderRadius: 10,
          border: "1px solid color-mix(in srgb, var(--primary-bright) 50%, transparent)",
          borderTopColor: "rgba(255,255,255,0.4)",
          background: "linear-gradient(180deg, var(--primary-bright), color-mix(in srgb, var(--primary-bright) 82%, #000))",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 8px 20px -10px rgba(84,141,255,0.8)",
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="plus" size={16} />
        <span className="atlas-newtask-label">New task</span>
      </button>
    </header>
  );
}
