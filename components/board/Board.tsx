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
import styles from "./Board.module.css";

type ColumnDef = { key: string; name: string; color: string };

// Board columns: blocked is a first-class lane.
const COLUMNS: ColumnDef[] = [
  { key: "backlog", name: "Backlog", color: "var(--status-backlog)" },
  { key: "todo", name: "To do", color: "var(--status-todo)" },
  { key: "doing", name: "In progress", color: "var(--status-progress)" },
  { key: "blocked", name: "Blocked", color: "var(--status-blocked)" },
  { key: "review", name: "Review", color: "var(--status-review)" },
  { key: "done", name: "Verified", color: "var(--status-done)" },
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
      className={`${styles.draggableWrap} ${isDragging ? styles.draggableHidden : ""}`}
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

  const zoneClass = [
    styles.dropZone,
    isBlockedCol ? styles.blocked : "",
    isOver ? styles.over : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={styles.column}>
      {/* Column header */}
      <div className={styles.colHeader}>
        <span className={styles.colDot} style={{ background: col.color, boxShadow: `0 0 7px ${col.color}` }} />
        <span className={styles.colName}>{col.name}</span>
        <span className={`mono ${styles.colCount}`}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} className={zoneClass}>
        {tasks.length ? (
          tasks.map((t) => <DraggableCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />)
        ) : (
          <div className={styles.emptyCol}>
            <Icon name={isBlockedCol ? "check-circle" : "board"} size={20} />
            <span className={styles.emptyLabel}>{isBlockedCol ? "Nothing blocked" : "Drop tasks here"}</span>
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
    <div className={styles.grid}>
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
      <div className={styles.toolbar}>
        <div className={styles.groupLabel}>
          <Icon name="swimlane" size={15} />
          Group by
        </div>
        <div className={styles.groupToggle}>
          {(["none", "marketplace", "owner"] as GroupBy[]).map((g) => {
            const on = groupBy === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`${styles.groupBtn} ${on ? styles.groupBtnActive : ""}`}
              >
                {g === "none" ? "Status" : g}
              </button>
            );
          })}
        </div>
        <span className={styles.taskCount}>
          {tasks.length} tasks · drag between columns
        </span>
      </div>

      {/* Scrollable board surface */}
      <div className={styles.surface}>
        {lanes ? (
          <div className={styles.lanes}>
            {lanes.map((lane) => (
              <div key={lane.key}>
                <div className={styles.laneHeader}>
                  {groupBy === "owner" ? (
                    <Avatar personId={lane.key} size={22} />
                  ) : (
                    <span className={styles.laneDot} />
                  )}
                  <span className={styles.laneName}>{lane.label}</span>
                  <span className={`mono ${styles.laneCount}`}>{lane.tasks.length}</span>
                  <div className={styles.laneDivider} />
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
          <div className={styles.overlay}>
            <TaskCard task={active} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
