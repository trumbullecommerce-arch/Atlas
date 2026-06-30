// Lightweight inline-SVG icon set (no icon-font dependency, builds clean).
// Stroke-based, 1.6px, currentColor — matches the precision-engineering look.

import type { CSSProperties } from "react";

export type IconName =
  | "dashboard"
  | "board"
  | "list"
  | "timeline"
  | "audit"
  | "search"
  | "filter"
  | "plus"
  | "bell"
  | "settings"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "close"
  | "check"
  | "check-circle"
  | "alert"
  | "block"
  | "clock"
  | "calendar"
  | "flag"
  | "user"
  | "users"
  | "comment"
  | "activity"
  | "tag"
  | "link"
  | "sku"
  | "arrow-up-right"
  | "trending-up"
  | "trending-down"
  | "menu"
  | "logo"
  | "more"
  | "subtask"
  | "sparkle"
  | "shield"
  | "target"
  | "grid"
  | "swimlane"
  | "task"
  | "keyboard"
  | "theme"
  | "help"
  | "logout";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="16" y="4" width="5" height="14" rx="1.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  timeline: (
    <>
      <path d="M3 6h10M3 12h14M3 18h7" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
    </>
  ),
  audit: (
    <>
      <path d="M9 11l2 2 4-4" />
      <path d="M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
    </>
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5L20 6" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-1.5 3.5L16 11H5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 21a6.5 6.5 0 0113 0" />
      <path d="M16 5.2A3.5 3.5 0 0116 12M21.5 21a6.5 6.5 0 00-5-6.3" />
    </>
  ),
  comment: <path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" />,
  activity: <path d="M3 12h4l2.5 7 5-16L17 12h4" />,
  tag: (
    <>
      <path d="M20 13.3l-7.3 7.3a1.5 1.5 0 01-2.1 0l-7-7A1.5 1.5 0 013 12.6V5a2 2 0 012-2h7.6a1.5 1.5 0 011 .4l7.4 7.4a1.5 1.5 0 010 2.1z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  link: (
    <>
      <path d="M9 15l6-6" />
      <path d="M11 6l1-1a4 4 0 016 6l-1 1M13 18l-1 1a4 4 0 01-6-6l1-1" />
    </>
  ),
  sku: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M7 9v6M10 9v6M13.5 9v6M17 9v6" />
    </>
  ),
  "arrow-up-right": <path d="M7 17L17 7M9 7h8v8" />,
  "trending-up": (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </>
  ),
  "trending-down": (
    <>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M17 17h4v-4" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  logo: (
    <>
      <path d="M12 2.5l8.5 5v9L12 21.5 3.5 16.5v-9L12 2.5z" />
      <path d="M12 7.5l4.3 2.5v5L12 17.5 7.7 15v-5L12 7.5z" fill="currentColor" stroke="none" opacity="0.9" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  subtask: (
    <>
      <path d="M5 4v8a3 3 0 003 3h4" />
      <rect x="12" y="11.5" width="8" height="7" rx="1.5" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  swimlane: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </>
  ),
  task: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </>
  ),
  theme: (
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  style,
  strokeWidth = 1.6,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
