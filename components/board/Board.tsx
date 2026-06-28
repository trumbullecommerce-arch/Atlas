"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  type DragMoveEvent,
} from "@dnd-kit/core";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
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

/** Clamp a number to a range. */
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function DraggableCard({ task, onOpen, staggerIndex }: { task: Task; onOpen: () => void; staggerIndex: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={`card-${task.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 28 },
        opacity: { duration: 0.25, delay: staggerIndex * 0.03 },
        y: { duration: 0.3, delay: staggerIndex * 0.03 },
      }}
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
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {tasks.length ? (
              tasks.map((t, i) => <DraggableCard key={t.id} task={t} onOpen={() => onOpen(t.id)} staggerIndex={i} />)
            ) : (
              <motion.div
                key="empty"
                className={styles.emptyCol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Icon name={isBlockedCol ? "check-circle" : "board"} size={20} />
                <span className={styles.emptyLabel}>{isBlockedCol ? "Nothing blocked" : "Drop tasks here"}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
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

  // ── Velocity tracking for physics-based tilt ──
  const velocityRef = useRef({ x: 0, y: 0 });
  const [dragRotate, setDragRotate] = useState(0);

  // ── Cursor tracking for spotlight effect ──
  const surfaceRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.PointerEvent) => {
    const surface = surfaceRef.current;
    if (!surface) return;

    // Update CSS custom properties on all cards within the board surface
    const cards = surface.querySelectorAll<HTMLElement>("[class*='card']");
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    });
  }, []);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    velocityRef.current = { x: 0, y: 0 };
    setDragRotate(0);
  }

  function onDragMove(e: DragMoveEvent) {
    // Track cursor velocity for physics-based tilt
    const dx = e.delta.x;
    const dy = e.delta.y;
    velocityRef.current = { x: dx, y: dy };

    // Calculate tilt: tilts in the direction of movement, clamped to ±12°
    const tilt = clamp(dx * 0.5, -12, 12);
    setDragRotate(tilt);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setDragRotate(0);
    velocityRef.current = { x: 0, y: 0 };
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

  // ── Spring-based drop animation (replaces canned cubic-bezier) ──
  const springDrop = {
    duration: 280,
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",  // Overshoot spring approximation
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
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

      {/* Scrollable board surface — cursor tracking */}
      <div
        ref={surfaceRef}
        className={styles.surface}
        onPointerMove={handleMouseMove}
      >
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

      <DragOverlay dropAnimation={springDrop}>
        {active ? (
          <motion.div
            className={styles.overlay}
            animate={{
              rotate: dragRotate,
              scale: 1.04,
            }}
            transition={{
              rotate: { type: "spring", stiffness: 600, damping: 30 },
              scale: { type: "spring", stiffness: 400, damping: 25 },
            }}
          >
            <TaskCard task={active} dragging />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
