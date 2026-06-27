"use client";

import { useState } from "react";
import { PEOPLE } from "@/lib/seed";
import type { Marketplace, ViewKey } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Avatar, IconButton } from "@/components/ui/Primitives";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const VIEW_TITLES: Record<ViewKey, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Cross-project health across Amazon, Walmart & Wayfair" },
  board: { title: "Board", sub: "Drag work across the pipeline" },
  list: { title: "List", sub: "Every task, grouped and sortable" },
  timeline: { title: "Timeline", sub: "Work plotted against target dates" },
  audits: { title: "Audits", sub: "Coverage-verified, not a checkbox" },
};

const MARKETPLACES: Marketplace[] = ["Amazon", "Walmart", "Wayfair"];

export function Topbar({
  view,
  search,
  setSearch,
  marketplaceFilter,
  setMarketplaceFilter,
  onNewTask,
  onOpenMobileNav,
  projectName,
}: {
  view: ViewKey;
  search: string;
  setSearch: (s: string) => void;
  marketplaceFilter: Marketplace | "all";
  setMarketplaceFilter: (m: Marketplace | "all") => void;
  onNewTask: () => void;
  onOpenMobileNav: () => void;
  projectName: string | null;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const meta = VIEW_TITLES[view];
  const showMarketplaceFilter = view === "board" || view === "list" || view === "audits";

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
      {/* mobile menu */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="atlas-mobile-only"
        style={{
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--glass)",
          color: "var(--text-soft)",
          cursor: "pointer",
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

      {/* Marketplace filter (segmented) */}
      {showMarketplaceFilter && (
        <div
          className="atlas-mp-filter"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: 3,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-2)",
          }}
        >
          {(["all", ...MARKETPLACES] as const).map((m) => {
            const on = marketplaceFilter === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMarketplaceFilter(m)}
                style={{
                  padding: "6px 11px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: on ? "var(--text)" : "var(--muted)",
                  background: on ? "color-mix(in srgb, var(--primary-bright) 24%, transparent)" : "transparent",
                  boxShadow: on ? "inset 0 0 0 1px var(--border-strong)" : "none",
                  transition: "all var(--dur)",
                }}
              >
                {m === "all" ? "All" : m}
              </button>
            );
          })}
        </div>
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
