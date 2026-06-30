"use client";

// Right-side "New task" creation slide-over. Mirrors the look + spring
// animation of components/task-detail/TaskDetail.tsx (scrim + glass panel).
// Collects the core task fields, calls store.addTask on submit, then hands the
// new id back so the shell can open its detail panel.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore, type NewTaskInput } from "@/lib/store";
import { ME, PEOPLE, PROJECTS, STATUSES, person } from "@/lib/seed";
import { useAuth } from "@/lib/auth-context";
import { MARKETPLACE_META, PRIORITY_META } from "@/lib/format";
import type { Marketplace, Priority } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
import { CustomSelect } from "@/components/ui/Select";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-2)",
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

const MARKETPLACES: Marketplace[] = [
  "Amazon",
  "Walmart",
  "Wayfair",
  "Lowe's",
  "Home Depot",
  "Ferguson Home",
  "bath1.com",
];

const PRIORITIES: Priority[] = [1, 2, 3, 4];
const PRIORITY_LABEL: Record<Priority, string> = {
  1: "P1 · Urgent",
  2: "P2 · High",
  3: "P3 · Medium",
  4: "P4 · Low",
};

function focusRing(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "var(--primary-bright)";
  e.currentTarget.style.boxShadow = "var(--glow)";
}
function blurRing(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "var(--border)";
  e.currentTarget.style.boxShadow = "none";
}

function Field({
  icon,
  label,
  required,
  children,
}: {
  icon: IconName;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        <Icon name={icon} size={13} />
        {label}
        {required && <span style={{ color: "var(--primary-bright)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Inner({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { addTask } = useStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(PROJECTS[0]?.id ?? "");
  const [statusKey, setStatusKey] = useState("todo");
  const [priority, setPriority] = useState<Priority>(3);
  const { currentUser: authUser } = useAuth();
  const meId = authUser?.id ?? ME;
  const [ownerId, setOwnerId] = useState(meId);
  const [dueDate, setDueDate] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace | "">("");
  const [sku, setSku] = useState("");

  const canSubmit = title.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    const input: NewTaskInput = {
      title,
      description,
      projectId,
      statusKey,
      priority,
      ownerId,
      dueDate: dueDate || null,
      marketplace: marketplace || null,
      sku: sku || null,
    };
    const id = addTask(input);
    onCreated(id);
  }

  const owner = person(ownerId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
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
              <Icon name="plus" size={16} />
            </span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)" }}>New task</h2>
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

      {/* Body (scrolls) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Field icon="list" label="Title" required>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to get done?"
            style={INPUT_STYLE}
            onFocus={focusRing}
            onBlur={blurRing}
          />
        </Field>

        <Field icon="comment" label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context, acceptance criteria, links…"
            rows={4}
            style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 84 }}
            onFocus={focusRing}
            onBlur={blurRing}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field icon="grid" label="Project">
            <CustomSelect
              ariaLabel="Project"
              value={projectId}
              onChange={setProjectId}
              options={PROJECTS.map((p) => ({ value: p.id, label: p.name, color: p.color }))}
            />
          </Field>

          <Field icon="activity" label="Status">
            <CustomSelect
              ariaLabel="Status"
              value={statusKey}
              onChange={setStatusKey}
              options={STATUSES.map((s) => ({ value: s.key, label: s.name, color: s.color }))}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field icon="flag" label="Priority">
            <CustomSelect
              ariaLabel="Priority"
              value={String(priority)}
              onChange={(v) => setPriority(Number(v) as Priority)}
              options={PRIORITIES.map((p) => ({ value: String(p), label: PRIORITY_LABEL[p], color: PRIORITY_META[p].color }))}
            />
          </Field>

          <Field icon="user" label="Owner">
            <CustomSelect
              ariaLabel="Owner"
              value={ownerId}
              onChange={setOwnerId}
              options={PEOPLE.map((p) => ({ value: p.id, label: p.fullName }))}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field icon="calendar" label="Target date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={INPUT_STYLE} onFocus={focusRing} onBlur={blurRing} />
          </Field>

          <Field icon="board" label="Marketplace">
            <CustomSelect
              ariaLabel="Marketplace"
              value={marketplace}
              onChange={(v) => setMarketplace(v as Marketplace | "")}
              placeholder="All channels"
              options={[
                { value: "", label: "All channels", color: "var(--muted)" },
                ...MARKETPLACES.map((m) => ({ value: m, label: m, color: MARKETPLACE_META[m].color })),
              ]}
            />
          </Field>
        </div>

        <Field icon="sku" label="SKU / Ref">
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Optional listing reference"
            className="mono"
            style={INPUT_STYLE}
            onFocus={focusRing}
            onBlur={blurRing}
          />
        </Field>

        {/* Owner preview chip — small touch matching the detail panel */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
          <Avatar personId={ownerId} size={20} />
          <span>
            Assigned to <span style={{ color: "var(--text-soft)", fontWeight: 600 }}>{owner?.fullName}</span>
          </span>
        </div>
      </div>

      {/* Footer actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 9,
          padding: "14px 22px",
          borderTop: "1px solid var(--border)",
          background: "linear-gradient(0deg, rgba(255,255,255,0.03), transparent)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            height: 38,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-soft)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 38,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--primary-bright) 50%, transparent)",
            borderTopColor: "rgba(255,255,255,0.4)",
            background: "linear-gradient(180deg, var(--primary-bright), color-mix(in srgb, var(--primary-bright) 82%, #000))",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "default",
            opacity: canSubmit ? 1 : 0.45,
            boxShadow: canSubmit ? "0 8px 20px -10px rgba(84,141,255,0.8)" : "none",
            transition: "opacity var(--dur)",
          }}
        >
          <Icon name="plus" size={15} />
          Create task
        </button>
      </div>
    </form>
  );
}

export function NewTaskDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  // Close on Escape (matches TaskDetail).
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
            aria-label="New task"
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
            <Inner onClose={onClose} onCreated={onCreated} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
