"use client";

// Audit coverage ledger for the "discontinued silicone" project. Coverage is
// verification-based (verified / total), shown as a prominent meter plus the
// real 412-item universe broken out by marketplace. The table below is the
// editable sample: each row's status can be changed via setAuditStatus, and the
// list filters by status + (inherited) marketplace.

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { AUDIT_BUCKETS, AUDIT_TOTALS, person } from "@/lib/seed";
import type { AuditItem, AuditItemStatus, Marketplace } from "@/lib/types";
import { MARKETPLACE_META } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Avatar, AUDIT_STATUS_META, AuditStatusPill, Chip } from "@/components/ui/Primitives";
import { AuditItemDetail } from "@/components/audit-detail/AuditItemDetail";

const STATUS_ORDER: AuditItemStatus[] = ["verified", "in_progress", "pending", "flagged", "na"];

function CoverageMeter({ verified, total }: { verified: number; total: number }) {
  const pct = total ? verified / total : 0;
  const size = 168;
  const thickness = 13;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = pct * c;

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={thickness} />
        <defs>
          <linearGradient id="cov-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" />
            <stop offset="100%" stopColor="var(--primary-bright)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#cov-grad)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--secondary) 55%, transparent))", transition: "stroke-dasharray 0.7s var(--ease)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: 34, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
          {Math.round(pct * 100)}%
        </span>
        <span style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
          verified
        </span>
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: AuditItemStatus; onChange: (s: AuditItemStatus) => void }) {
  const [open, setOpen] = useState(false);
  const meta = AUDIT_STATUS_META[value];
  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 8px 3px 9px",
          borderRadius: 999,
          border: `1px solid color-mix(in srgb, ${meta.color} 32%, var(--border))`,
          background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
          color: meta.color,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }} />
        {meta.label}
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            className="glass"
            style={{
              position: "absolute",
              right: 0,
              top: 30,
              zIndex: 50,
              borderRadius: 10,
              padding: 5,
              minWidth: 150,
              boxShadow: "var(--shadow-3)",
            }}
          >
            {STATUS_ORDER.map((s) => {
              const m = AUDIT_STATUS_META[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: 7,
                    border: "none",
                    background: s === value ? "rgba(255,255,255,0.05)" : "transparent",
                    color: "var(--text-soft)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = s === value ? "rgba(255,255,255,0.05)" : "transparent")}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
                  {m.label}
                  {s === value && <Icon name="check" size={13} style={{ marginLeft: "auto", color: "var(--secondary)" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Channel → color, sourced from the shared meta so all 7 channels resolve.
const MARKETPLACE_COLOR = (m: Marketplace): string => MARKETPLACE_META[m].color;

export function Audits({ marketplaceFilter }: { marketplaceFilter: Marketplace | "all" }) {
  const { auditItems, setAuditStatus } = useStore();
  const [statusFilter, setStatusFilter] = useState<AuditItemStatus | "all">("all");
  // Selected ledger row (opens the right-side detail drawer). Tracked by id so
  // the drawer always reflects the live item (e.g. after an inline status edit).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem: AuditItem | null = useMemo(
    () => auditItems.find((a) => a.id === selectedId) ?? null,
    [auditItems, selectedId],
  );

  const rows = useMemo(() => {
    return auditItems.filter((a) => {
      if (marketplaceFilter !== "all" && a.marketplace !== marketplaceFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return true;
    });
  }, [auditItems, marketplaceFilter, statusFilter]);

  // Status counts within the editable sample (drives the filter chips' counts).
  const sampleCounts = useMemo(() => {
    const base: Record<string, number> = { all: auditItems.length };
    for (const s of STATUS_ORDER) base[s] = 0;
    for (const a of auditItems) base[a.status] = (base[a.status] ?? 0) + 1;
    return base;
  }, [auditItems]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1380, margin: "0 auto" }}>
      {/* Coverage hero */}
      <div className="panel atlas-audit-hero" style={{ padding: 22, display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <CoverageMeter verified={AUDIT_TOTALS.verified} total={AUDIT_TOTALS.total} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="shield" size={16} style={{ color: "var(--secondary)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Coverage ledger</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, maxWidth: 240, lineHeight: 1.45 }}>
              Silicone reference sweep — every listing must be individually verified clean, not just checked off.
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 10 }}>
              <span style={{ color: "var(--secondary)", fontWeight: 700 }}>{AUDIT_TOTALS.verified}</span> / {AUDIT_TOTALS.total} verified
              <span style={{ color: "var(--muted-2)" }}> · {AUDIT_TOTALS.total - AUDIT_TOTALS.verified} remaining</span>
            </div>
          </div>
        </div>

        {/* Per-marketplace breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="atlas-audit-buckets">
          {AUDIT_BUCKETS.map((b) => {
            const pct = b.total ? b.verified / b.total : 0;
            const color = MARKETPLACE_COLOR(b.marketplace);
            return (
              <div key={b.marketplace} style={{ padding: "13px 14px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                    {b.marketplace}
                  </span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color }}>
                    {Math.round(pct * 100)}%
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ height: "100%", width: `${pct * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 60%, transparent), ${color})`, boxShadow: `0 0 10px color-mix(in srgb, ${color} 55%, transparent)` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: "var(--muted)" }}>
                  <span className="mono">{b.verified}/{b.total}</span>
                  {b.flagged > 0 ? (
                    <span style={{ color: "var(--error)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Icon name="alert" size={11} /> {b.flagged} flagged
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted-2)" }}>{b.inProgress + b.pending} open</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="filter" size={14} /> Filter
        </span>
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const on = statusFilter === s;
          const color = s === "all" ? "var(--primary-bright)" : AUDIT_STATUS_META[s].color;
          const label = s === "all" ? "All" : AUDIT_STATUS_META[s].label;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: on ? "var(--text)" : "var(--muted)",
                background: on ? `color-mix(in srgb, ${color} 22%, transparent)` : "var(--bg-2)",
                border: `1px solid ${on ? `color-mix(in srgb, ${color} 45%, transparent)` : "var(--border)"}`,
              }}
            >
              {s !== "all" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />}
              {label}
              <span className="mono" style={{ fontSize: 10.5, opacity: 0.8 }}>{sampleCounts[s] ?? 0}</span>
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-2)" }}>
          Showing {rows.length} of {auditItems.length} sample items
        </span>
      </div>

      {/* Ledger table */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {/* header */}
        <div
          className="atlas-audit-thead"
          style={{
            display: "grid",
            gridTemplateColumns: "150px minmax(0,1fr) 110px 150px 150px",
            gap: 12,
            padding: "11px 18px",
            borderBottom: "1px solid var(--border)",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--muted-2)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
          }}
        >
          <span>Reference</span>
          <span>Listing</span>
          <span>Marketplace</span>
          <span>Owner</span>
          <span style={{ textAlign: "right" }}>Status</span>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: "44px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No audit items match this filter.
          </div>
        )}

        <div className="stagger">
          {rows.map((a) => {
            const owner = person(a.ownerId);
            const flaggedBg = a.status === "flagged" ? "color-mix(in srgb, var(--error) 5%, transparent)" : "transparent";
            return (
              <div
                key={a.id}
                className="atlas-audit-row is-clickable"
                role="button"
                tabIndex={0}
                aria-label={`Open audit item ${a.externalRef}`}
                onClick={() => setSelectedId(a.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(a.id);
                  }
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.028)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = flaggedBg)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px minmax(0,1fr) 110px 150px 150px",
                  gap: 12,
                  alignItems: "center",
                  padding: "11px 18px",
                  borderTop: "1px solid var(--border-soft)",
                  cursor: "pointer",
                  background: flaggedBg,
                  transition: "background var(--dur)",
                }}
              >
                <span className="mono" style={{ fontSize: 11.5, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.externalRef}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.title}
                  </div>
                  {a.notes && (
                    <div className="atlas-audit-note" style={{ fontSize: 11, color: a.status === "flagged" ? "var(--error-soft)" : "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.notes}
                    </div>
                  )}
                </div>
                <span>
                  <Chip color={MARKETPLACE_COLOR(a.marketplace)}>{a.marketplace}</Chip>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  {owner ? (
                    <>
                      <Avatar personId={owner.id} size={22} />
                      <span style={{ fontSize: 12, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner.fullName}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted-2)" }}>Unassigned</span>
                  )}
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <StatusSelect value={a.status} onChange={(s) => setAuditStatus(a.id, s)} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--muted-2)", textAlign: "center", display: "inline-flex", gap: 5, alignItems: "center", justifyContent: "center" }}>
        <Icon name="check-circle" size={12} />
        Sample reflects the table; the meter above tracks the full {AUDIT_TOTALS.total}-listing universe.
      </div>

      {/* Right-side audit-item detail drawer */}
      <AuditItemDetail item={selectedItem} onClose={() => setSelectedId(null)} />
    </div>
  );
}
