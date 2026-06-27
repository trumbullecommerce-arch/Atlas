"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { motion } from "motion/react";

type ColKey = "todo" | "doing" | "blocked" | "done";
type Marketplace = "Amazon" | "Walmart" | "Wayfair" | null;

interface Card {
  id: string;
  col: ColKey;
  title: string;
  mp: Marketplace;
  who: string;
  p: 1 | 2 | 3 | 4;
  due: string;
  reason?: string;
}

const COLUMNS: { key: ColKey; name: string; dot: string }[] = [
  { key: "todo", name: "To do", dot: "#888780" },
  { key: "doing", name: "In progress", dot: "#378add" },
  { key: "blocked", name: "Blocked", dot: "#e24b4a" },
  { key: "done", name: "Verified", dot: "#1d9e75" },
];

const MP_TINT: Record<string, { bg: string; fg: string }> = {
  Amazon: { bg: "#faeeda", fg: "#633806" },
  Walmart: { bg: "#e6f1fb", fg: "#0c447c" },
  Wayfair: { bg: "#eeedfe", fg: "#3c3489" },
};

const PRIO: Record<number, { t: string; c: string }> = {
  1: { t: "P1", c: "#e24b4a" },
  2: { t: "P2", c: "#ba7517" },
  3: { t: "P3", c: "#378add" },
  4: { t: "P4", c: "#888780" },
};

const SEED: Card[] = [
  { id: "t1", col: "todo", title: "Audit bullet points", mp: "Amazon", who: "JL", p: 2, due: "Jul 2" },
  { id: "t2", col: "todo", title: "Update box artwork", mp: "Wayfair", who: "DT", p: 2, due: "Jul 7" },
  { id: "t3", col: "todo", title: "Refresh install guide", mp: null, who: "MR", p: 3, due: "Jul 9" },
  { id: "t4", col: "doing", title: "Audit titles + bullets", mp: "Walmart", who: "JL", p: 1, due: "Jul 1" },
  { id: "t5", col: "doing", title: "Replace product images", mp: "Amazon", who: "SK", p: 2, due: "Jul 3" },
  { id: "t6", col: "blocked", title: "Re-shoot hero images", mp: null, who: "SK", p: 2, due: "Jul 5", reason: "Waiting on photographer" },
  { id: "t7", col: "blocked", title: "Update spec sheet", mp: "Wayfair", who: "DT", p: 3, due: "Jul 8", reason: "Vendor not responding" },
  { id: "t8", col: "done", title: "Audit bullet points", mp: "Walmart", who: "JL", p: 2, due: "Jun 24" },
  { id: "t9", col: "done", title: "Remove mention in FAQ", mp: null, who: "MR", p: 3, due: "Jun 22" },
];

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      style={{
        width: 20, height: 20, borderRadius: "50%", background: "var(--accent-soft)",
        color: "var(--accent)", fontSize: 10, fontWeight: 500, display: "inline-flex",
        alignItems: "center", justifyContent: "center", flex: "0 0 auto",
      }}
    >
      {initials}
    </span>
  );
}

function CardView({ card, dragging }: { card: Card; dragging?: boolean }) {
  const tint = card.mp ? MP_TINT[card.mp] : null;
  return (
    <div
      style={{
        background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10,
        padding: "9px 10px", boxShadow: dragging ? "0 8px 24px rgba(0,0,0,0.16)" : "none",
        cursor: "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <span
          style={{
            fontSize: 10, padding: "1px 7px", borderRadius: 999,
            background: tint ? tint.bg : "var(--surface-soft)",
            color: tint ? tint.fg : "var(--muted)",
            border: tint ? "none" : "0.5px solid var(--border)",
          }}
        >
          {card.mp ?? "All"}
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIO[card.p].c }} />
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{PRIO[card.p].t}</span>
        </span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", lineHeight: 1.3, marginBottom: 8 }}>
        {card.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Avatar initials={card.who} />
        <span style={{ fontSize: 10, color: "var(--muted)" }}>
          {card.col === "done" ? "verified" : card.due}
        </span>
      </div>
      {card.col === "blocked" && card.reason && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 4, marginTop: 7, padding: "4px 6px",
            background: "var(--danger-soft)", borderRadius: 6,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--danger-ink)", lineHeight: 1.3 }}>{card.reason}</span>
        </div>
      )}
    </div>
  );
}

function DraggableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      {...attributes}
      {...listeners}
      style={{ marginBottom: 8, opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
    >
      <CardView card={card} />
    </motion.div>
  );
}

function Column({ col, cards }: { col: { key: ColKey; name: string; dot: string }; cards: Card[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: "var(--surface-soft)", borderRadius: 12, padding: 9, minHeight: 120,
        outline: isOver ? "2px solid var(--accent)" : "2px solid transparent", transition: "outline-color .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 4px 9px" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{col.name}</span>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{cards.length}</span>
      </div>
      {cards.length ? (
        cards.map((c) => <DraggableCard key={c.id} card={c} />)
      ) : (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>None</div>
      )}
    </div>
  );
}

export default function Board() {
  const [cards, setCards] = useState<Card[]>(SEED);
  const [mp, setMp] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visible = cards.filter((c) => mp === "all" || c.mp === mp);
  const active = cards.find((c) => c.id === activeId) ?? null;
  const verified = cards.filter((c) => c.col === "done").length;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const target = String(over.id) as ColKey;
    setCards((prev) =>
      prev.map((c) => (c.id === String(active.id) ? { ...c, col: target } : c))
    );
  }

  const chips = ["all", "Amazon", "Walmart", "Wayfair"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: 8, background: "var(--text)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)",
            fontWeight: 600, fontSize: 15,
          }}
        >
          A
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Remove discontinued silicone references</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Atlas · Listing audit · all marketplaces</div>
        </div>
      </div>

      <div style={{ background: "var(--surface-soft)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Coverage</span>
          <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
            <strong style={{ fontWeight: 500 }}>388</strong> of 412 verified
          </span>
        </div>
        <div style={{ height: 9, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 999, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "94%" }}
            transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ height: "100%", background: "var(--ok)", borderRadius: 999 }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 2 }}>Filter</span>
        {chips.map((c) => {
          const on = mp === c;
          return (
            <button
              key={c}
              onClick={() => setMp(c)}
              style={{
                fontSize: 12, padding: "4px 11px", borderRadius: 999, cursor: "pointer",
                border: `0.5px solid ${on ? "var(--border-strong)" : "var(--border)"}`,
                background: on ? "var(--text)" : "var(--surface)",
                color: on ? "var(--bg)" : "var(--text-soft)",
              }}
            >
              {c === "all" ? "All" : c}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{verified} verified · drag cards between columns</span>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, alignItems: "start" }}>
          {COLUMNS.map((col) => (
            <Column key={col.key} col={col} cards={visible.filter((c) => c.col === col.key)} />
          ))}
        </div>
        <DragOverlay>{active ? <div style={{ width: 230 }}><CardView card={active} dragging /></div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
