"use client";

// Next.js error boundary page. Shown when an unhandled error occurs.

import { Icon } from "@/components/ui/Icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-5)",
        background: "var(--floor)",
        color: "var(--text)",
        fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--r-lg)",
          display: "grid",
          placeItems: "center",
          background: "color-mix(in srgb, var(--error) 12%, transparent)",
          color: "var(--error)",
        }}
      >
        <Icon name="alert" size={32} />
      </div>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 440 }}>
          Atlas encountered an unexpected error. This has been logged and we&apos;re looking into it.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "10px 24px",
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--border-strong)",
          background: "color-mix(in srgb, var(--primary-bright) 18%, transparent)",
          color: "var(--primary)",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Try again
      </button>
    </div>
  );
}
