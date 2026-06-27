// Inline-SVG charts — gradient area line, donut, and stacked bar.
// No charting dependency; 2px strokes + gradient fills + glow per the design.

import { Fragment } from "react";

// ── Area + line chart (e.g. 14-day throughput) ──────────────────────────────
export function AreaLineChart({
  series,
  height = 220,
  pad = 28,
}: {
  series: {
    label: string;
    color: string;
    points: number[];
    fill?: boolean;
  }[];
  height?: number;
  pad?: number;
}) {
  const W = 760;
  const H = height;
  const n = series[0]?.points.length ?? 0;
  const allVals = series.flatMap((s) => s.points);
  const max = Math.max(1, ...allVals) * 1.15;
  const innerW = W - pad * 2;
  const innerH = H - pad * 1.4;

  const x = (i: number) => pad + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad * 0.4 + innerH - (v / max) * innerH;

  function smoothPath(points: number[]): string {
    if (!points.length) return "";
    const pts = points.map((v, i) => [x(i), y(v)] as const);
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const mx = (px + cx) / 2;
      d += ` C ${mx},${py} ${mx},${cy} ${cx},${cy}`;
    }
    return d;
  }

  const gridY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`area-${i}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* grid lines */}
      {gridY.map((g, i) => {
        const yy = pad * 0.4 + innerH - g * innerH;
        return (
          <line
            key={i}
            x1={pad}
            x2={W - pad}
            y1={yy}
            y2={yy}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3 5"
            opacity={0.5}
          />
        );
      })}

      {series.map((s, i) => {
        const line = smoothPath(s.points);
        const area = `${line} L ${x(n - 1)},${pad * 0.4 + innerH} L ${x(0)},${pad * 0.4 + innerH} Z`;
        return (
          <Fragment key={i}>
            {s.fill !== false && <path d={area} fill={`url(#area-${i})`} />}
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" className="chart-glow" strokeLinecap="round" />
            {/* last point marker */}
            {s.points.length > 0 && (
              <circle
                cx={x(n - 1)}
                cy={y(s.points[n - 1])}
                r="3.5"
                fill="var(--floor)"
                stroke={s.color}
                strokeWidth="2"
              />
            )}
          </Fragment>
        );
      })}
    </svg>
  );
}

// ── Donut chart (status distribution) ───────────────────────────────────────
export function Donut({
  segments,
  size = 160,
  thickness = 16,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const len = frac * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${s.color} 50%, transparent))` }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {centerLabel && (
            <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
              {centerLabel}
            </span>
          )}
          {centerSub && (
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {centerSub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mini sparkbars (compact bar series) ─────────────────────────────────────
export function SparkBars({
  values,
  color = "var(--primary-bright)",
  height = 44,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 25%, transparent))`,
          }}
        />
      ))}
    </div>
  );
}
