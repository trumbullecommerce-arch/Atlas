// Atlas CSV export utility.
// Exports the current filtered view data as a downloadable CSV file.

import { dueLabel, dueState } from "./format";
import { person, project, STATUSES } from "./seed";
import type { AuditItem, Task } from "./types";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function statusLabel(key: string): string {
  return STATUSES.find((s) => s.key === key)?.name ?? key;
}

function priorityLabel(priority: number): string {
  switch (priority) {
    case 1: return "Critical";
    case 2: return "High";
    case 3: return "Medium";
    case 4: return "Low";
    default: return String(priority);
  }
}

/** Export tasks as CSV */
export function exportTasksCSV(tasks: Task[], viewName: string = "tasks"): void {
  const headers = [
    "Title",
    "Status",
    "Priority",
    "Project",
    "Marketplace",
    "Owner",
    "Due Date",
    "Blocked",
    "Blocked Reason",
    "SKU",
    "Checklist Progress",
    "Comments",
    "Created",
  ];

  const rows = tasks.map((t) => {
    const owner = person(t.ownerId);
    const proj = project(t.projectId);
    const doneChecks = t.checklist.filter((c) => c.done).length;

    return [
      t.title,
      statusLabel(t.statusKey),
      priorityLabel(t.priority),
      proj?.name ?? "",
      t.marketplace ?? "",
      owner?.fullName ?? "",
      t.dueDate ? dueLabel(t.dueDate) : "",
      t.isBlocked ? "Yes" : "No",
      t.blockedReason ?? "",
      t.sku ?? "",
      t.checklist.length > 0 ? `${doneChecks}/${t.checklist.length}` : "",
      String(t.comments.length),
      t.createdAt?.split("T")[0] ?? "",
    ].map(escapeCSV);
  });

  downloadCSV(headers, rows, viewName);
}

/** Export audit items as CSV */
export function exportAuditItemsCSV(items: AuditItem[], viewName: string = "audits"): void {
  const headers = [
    "Title",
    "Status",
    "Marketplace",
    "External Ref",
    "Owner",
    "Notes",
    "Verified At",
  ];

  const rows = items.map((a) => {
    const owner = a.ownerId ? person(a.ownerId) : null;
    return [
      a.title,
      a.status,
      a.marketplace ?? "",
      a.externalRef ?? "",
      owner?.fullName ?? "",
      a.notes ?? "",
      a.verifiedAt ?? "",
    ].map(escapeCSV);
  });

  downloadCSV(headers, rows, viewName);
}

function downloadCSV(headers: string[], rows: string[][], viewName: string): void {
  const date = new Date().toISOString().split("T")[0];
  const filename = `atlas-export-${viewName}-${date}.csv`;
  const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
