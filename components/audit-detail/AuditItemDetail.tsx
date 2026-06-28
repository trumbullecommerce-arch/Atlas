"use client";

// Right-side slide-over for a single audit ledger item. Mirrors TaskDetail's
// look + spring animation (scrim + Escape close) and surfaces the item's
// reference, listing, marketplace, owner, status, notes and verification time.

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { person, project } from "@/lib/seed";
import { MARKETPLACE_META, relTime } from "@/lib/format";
import type { AuditItem } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, AUDIT_STATUS_META, Chip } from "@/components/ui/Primitives";

function MetaRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 116, flex: "0 0 auto", color: "var(--muted)" }}>
        <Icon name={icon} size={15} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Inner({ item, onClose }: { item: AuditItem; onClose: () => void }) {
  const owner = person(item.ownerId);
  const proj = project(item.projectId);
  const statusMeta = AUDIT_STATUS_META[item.status];
  const mpColor = MARKETPLACE_META[item.marketplace].color;
  const flagged = item.status === "flagged";

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: proj?.color, flex: "0 0 auto", boxShadow: `0 0 7px ${proj?.color}` }} />
            <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {proj?.name ?? "Audit item"}
            </span>
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
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25, color: "var(--text)" }}>
          {item.title}
        </h2>
      </div>

      {/* Body (scrolls) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px 28px" }}>
        {/* Flagged banner */}
        {flagged && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "11px 13px",
              borderRadius: 12,
              marginBottom: 16,
              background: "color-mix(in srgb, var(--error) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--error) 38%, transparent)",
              borderLeft: "3px solid var(--error)",
            }}
          >
            <Icon name="alert" size={17} style={{ color: "var(--error)", marginTop: 1, flex: "0 0 auto" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--error-soft)" }}>Flagged</div>
              <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: 2, lineHeight: 1.4 }}>
                This listing needs attention before it can be verified clean.
              </div>
            </div>
          </div>
        )}

        {/* Meta grid */}
        <div style={{ borderRadius: 12 }}>
          <MetaRow icon="sku" label="Reference">
            <span className="mono" style={{ fontSize: 12, color: "var(--text-soft)", padding: "2px 8px", borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              {item.externalRef}
            </span>
          </MetaRow>

          <MetaRow icon="list" label="Listing">
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{item.title}</span>
          </MetaRow>

          <MetaRow icon="board" label="Marketplace">
            <Chip color={mpColor}>{item.marketplace}</Chip>
          </MetaRow>

          <MetaRow icon="user" label="Owner">
            {owner ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Avatar personId={owner.id} size={22} />
                <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{owner.fullName}</span>
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "var(--muted-2)" }}>Unassigned</span>
            )}
          </MetaRow>

          <MetaRow icon="activity" label="Status">
            <Chip color={statusMeta.color}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusMeta.color }} />
              {statusMeta.label}
            </Chip>
          </MetaRow>

          <MetaRow icon="check-circle" label="Verified">
            {item.verifiedAt ? (
              <span style={{ fontSize: 13, color: "var(--secondary)" }}>{relTime(item.verifiedAt)}</span>
            ) : (
              <span style={{ fontSize: 13, color: "var(--muted-2)" }}>Not yet verified</span>
            )}
          </MetaRow>
        </div>

        {/* Notes */}
        <div style={{ height: 1, background: "var(--border-soft)", margin: "14px 0 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="comment" size={14} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
            Notes
          </span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: item.notes ? "var(--text-soft)" : "var(--muted-2)", fontStyle: item.notes ? "normal" : "italic" }}>
          {item.notes ?? "No notes recorded for this listing."}
        </p>
      </div>
    </div>
  );
}

export function AuditItemDetail({ item, onClose }: { item: AuditItem | null; onClose: () => void }) {
  // Close on Escape (mirrors TaskDetail).
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
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
            aria-label={item.title}
            className="atlas-detail glass"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(540px, 100vw)",
              zIndex: 90,
              borderLeft: "1px solid var(--border)",
              background: "var(--glass-2)",
              boxShadow: "var(--shadow-3)",
            }}
          >
            <Inner item={item} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
