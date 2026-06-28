"use client";

// Atlas Calendar view — monthly grid showing tasks by due date.
// Tasks are color-coded by status, clickable to open TaskDetail.

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { STATUSES } from "@/lib/seed";
import type { Task } from "@/lib/types";
import styles from "./Calendar.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLOR: Record<string, string> = {
  backlog: "var(--status-backlog)",
  todo: "var(--status-todo)",
  doing: "var(--status-progress)",
  review: "var(--status-review)",
  done: "var(--status-done)",
  blocked: "var(--status-blocked)",
};

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);

  // Leading nulls for days before the 1st
  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    // Previous month days
    const prevDate = new Date(year, month, -firstDay + i + 1);
    grid.push(prevDate);
  }
  grid.push(...daysInMonth);

  // Trailing days to fill the 6th row
  while (grid.length < 42) {
    const nextDate = new Date(year, month + 1, grid.length - firstDay - daysInMonth.length + 1);
    grid.push(nextDate);
  }

  return grid;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Calendar({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const grid = useMemo(() => getCalendarGrid(year, month), [year, month]);

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = t.dueDate.split("T")[0];
      const existing = map.get(key) ?? [];
      existing.push(t);
      map.set(key, existing);
    }
    return map;
  }, [tasks]);

  const tasksWithDue = tasks.filter((t) => t.dueDate).length;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
          <Icon name="chevron-left" size={16} />
        </button>
        <span className={styles.monthLabel}>{MONTH_NAMES[month]} {year}</span>
        <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
          <Icon name="chevron-right" size={16} />
        </button>
        <button type="button" className={styles.todayBtn} onClick={goToday}>
          Today
        </button>
        <span className={styles.taskCount}>{tasksWithDue} tasks with due dates</span>
      </div>

      {/* Weekday headers */}
      <div className={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={styles.grid}>
        {grid.map((date, i) => {
          if (!date) return <div key={i} className={styles.day} />;

          const isCurrentMonth = date.getMonth() === month;
          const isToday = isSameDay(date, today);
          const key = dateKey(date);
          const dayTasks = tasksByDate.get(key) ?? [];
          const maxVisible = 3;

          const cellClass = [
            styles.day,
            !isCurrentMonth ? styles.dayOutside : "",
            isToday ? styles.dayToday : "",
          ].filter(Boolean).join(" ");

          return (
            <div key={i} className={cellClass}>
              <div className={styles.dayNumber}>
                <span className={styles.dayNum}>{date.getDate()}</span>
                {isToday && <span className={styles.todayDot} />}
              </div>
              <div className={styles.tasks}>
                {dayTasks.slice(0, maxVisible).map((t) => {
                  const color = t.isBlocked ? STATUS_COLOR.blocked : STATUS_COLOR[t.statusKey] ?? "var(--muted)";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.taskPill}
                      onClick={() => onOpen(t.id)}
                      title={t.title}
                    >
                      <span className={styles.taskPillDot} style={{ background: color }} />
                      {t.title}
                    </button>
                  );
                })}
                {dayTasks.length > maxVisible && (
                  <span className={styles.more}>+{dayTasks.length - maxVisible} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
