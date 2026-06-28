"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { PEOPLE, person } from "@/lib/seed";
import type { Marketplace, Task } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
import { TaskCard } from "./TaskCard";

type ColumnDef = { key: string; name: string; color: string };

// Board columns: blocked is a first-class lane.
const COLUMNS: ColumnDef[] = [
  { key: "backlog", name: "Backlog", color: "#8c90a0" },
  { key: "todo", name: "To do", color: "#afc6ff" },
  { key: "doing", name: "In progress", color: "#548dff" },
  { key: "blocked", name: "Blocked", color: "#f43f5e" },
  { key: "review", name: "Review", color: "#c0c1ff" },
  { key: "done", name: "Verified", color: "#4edea3" },
];

type GroupBy = "none" | "marketplace" | "owner";

function columnOf(t: Task): string {
  return t.isBlocked ? "blocked" : t.statusKey;
}

function DraggableCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={`card-${task.id}`}
      {...attributes}
      {...listeners}
      style={{ marginBottom: 9, opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
    >
      <TaskCard task={task} onOpen={onOpen} />
    </motion.div>
  );
}

function Column({
  col,
  tasks,
  onOpen,
}: {
  col: ColumnDef;
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const isBlockedCol = col.key === "blocked";

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 268, width: 268, flex: "0 0 268px" }}>
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 10px" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, boxShadow: `0 0 7px ${col.color}` }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{col.name}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", padding: "1px 7px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 140,
          padding: 8,
          borderRadius: 14,
          background: isBlockedCol
            ? "color-mix(in srgb, var(--error) 6%, var(--bg))"
            : "color-mix(in srgb, var(--surface) 50%, transparent)",
          border: `1px solid ${
            isOver ? "var(--primary-bright)" : isBlockedCol ? "color-mix(in srgb, var(--error) 24%, transparent)" : "var(--border)"
          }`,
          boxShadow: isOver ? "var(--glow)" : "none",
          transition: "border-color var(--dur), box-shadow var(--dur)",
        }}
      >
        {tasks.length ? (
          tasks.map((t) => <DraggableCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />)
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "26px 8px",
              color: "var(--muted-2)",
            }}
          >
            <Icon name={isBlockedCol ? "check-circle" : "board"} size={20} />
            <span style={{ fontSize: 11.5 }}>{isBlockedCol ? "Nothing blocked" : "Drop tasks here"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardGrid({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "stretch", paddingBottom: 6 }}>
      {COLUMNS.map((col) => (
        <Column key={col.key} col={col} tasks={tasks.filter((t) => columnOf(t) === col.key)} onOpen={onOpen} />
      ))}
    </div>
  );
}

export function Board({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  const { moveTask, setBlocked } = useStore();
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const active = tasks.find((t) => t.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const target = String(over.id);
    const id = String(active.id);
    if (target === "blocked") {
      const t = tasks.find((x) => x.id === id);
      if (t && !t.isBlocked) setBlocked(id, true, "Moved to Blocked");
      return;
    }
    moveTask(id, target);
  }

  // Swimlanes: group tasks by marketplace or owner.
  const lanes = useMemo(() => {
    if (groupBy === "none") return null;
    if (groupBy === "marketplace") {
      const mps: (Marketplace | "none")[] = ["Amazon", "Walmart", "Wayfair", "Lowe's", "Home Depot", "Ferguson Home", "bath1.com", "none"];
      return mps
        .map((mp) => ({
          key: String(mp),
          label: mp === "none" ? "All channels" : mp,
          tasks: tasks.filter((t) => (t.marketplace ?? "none") === mp),
        }))
        .filter((l) => l.tasks.length > 0);
    }
    // owner
    return PEOPLE.map((p) => ({
      key: p.id,
      label: p.fullName,
      tasks: tasks.filter((t) => t.ownerId === p.id),
    })).filter((l) => l.tasks.length > 0);
  }, [groupBy, tasks]);

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--muted)" }}>
          <Icon name="swimlane" size={15} />
          Group by
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
          {(["none", "marketplace", "owner"] as GroupBy[]).map((g) => {
            const on = groupBy === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  color: on ? "#fff" : "var(--muted)",
                  background: on ? "color-mix(in srgb, var(--primary-bright) 24%, transparent)" : "transparent",
                  boxShadow: on ? "inset 0 0 0 1px var(--border-strong)" : "none",
                }}
              >
                {g === "none" ? "Status" : g}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--muted-2)" }}>
          {tasks.length} tasks · drag between columns
        </span>
      </div>

      {/* Scrollable board surface */}
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        {lanes ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {lanes.map((lane) => (
              <div key={lane.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, position: "sticky", left: 0 }}>
                  {groupBy === "owner" ? (
                    <Avatar personId={lane.key} size={22} />
                  ) : (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--tertiary)" }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lane.label}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted-2)" }}>{lane.tasks.length}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
                </div>
                <BoardGrid tasks={lane.tasks} onOpen={onOpen} />
              </div>
            ))}
          </div>
        ) : (
          <BoardGrid tasks={tasks} onOpen={onOpen} />
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
        {active ? (
          <div style={{ width: 252 }}>
            <TaskCard task={active} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
