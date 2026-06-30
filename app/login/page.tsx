"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      {/* Background FX */}
      <div className={styles.fx} aria-hidden="true">
        <div className={styles.glow1} />
        <div className={styles.glow2} />
        <div className={styles.grid} />
      </div>

      <form onSubmit={handleSubmit} className={styles.card}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoMark}>
            <Icon name="logo" size={28} />
          </div>
          <div>
            <div className={styles.logoTitle}>ATLAS</div>
            <div className={styles.logoSub}>Command Center</div>
          </div>
        </div>

        <div className={styles.divider} />

        <h1 className={styles.heading}>Sign in to Atlas</h1>
        <p className={styles.subheading}>
          Enter your Trumbull credentials to access the command center.
        </p>

        {error && (
          <div className={styles.error}>
            <Icon name="alert" size={14} />
            {error}
          </div>
        )}

        <label className={styles.label}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@trumbull.com"
            required
            autoComplete="email"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className={styles.input}
          />
        </label>

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              Sign in
              <Icon name="arrow-up-right" size={15} />
            </>
          )}
        </button>

        <p className={styles.footer}>
          Trumbull E-Commerce &middot; Atlas v1.0
        </p>
      </form>
    </div>
  );
}
