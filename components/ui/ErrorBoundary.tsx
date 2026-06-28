"use client";

// Atlas error boundary. Wraps view content to catch render errors and show
// a clean recovery UI rather than crashing the entire app.

import { Component, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-4)",
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--r-md)",
              display: "grid",
              placeItems: "center",
              background: "color-mix(in srgb, var(--error) 12%, transparent)",
              color: "var(--error)",
            }}
          >
            <Icon name="alert" size={28} />
          </div>
          <div>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-2)" }}>
              Something went wrong
            </div>
            <div style={{ fontSize: "var(--text-sm)", maxWidth: 420 }}>
              {this.state.error?.message ?? "An unexpected error occurred."}
            </div>
          </div>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: "var(--space-2) var(--space-5)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--primary-bright) 16%, transparent)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
