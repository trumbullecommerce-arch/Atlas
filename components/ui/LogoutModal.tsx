"use client";

/**
 * LogoutModal — Full-screen confirmation overlay for logging out.
 * Blurs the background, shows a centered card asking "Are you sure?",
 * then on confirm: signs out via Supabase → shows "Thank you" → redirects to /login.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import styles from "./LogoutModal.module.css";

type Phase = "confirm" | "goodbye";

export function LogoutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setPhase("goodbye");
    setLoading(false);

    // After 2 seconds, redirect to login
    setTimeout(() => {
      router.push("/login");
      router.refresh();
      // Reset phase for next time
      setTimeout(() => setPhase("confirm"), 500);
    }, 2000);
  }

  function handleCancel() {
    onClose();
    // Reset phase after animation
    setTimeout(() => setPhase("confirm"), 300);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Blurred backdrop */}
          <motion.div
            className={styles.backdrop}
            onClick={phase === "confirm" ? handleCancel : undefined}
          />

          {/* Modal card */}
          <AnimatePresence mode="wait">
            {phase === "confirm" ? (
              <motion.div
                key="confirm"
                className={styles.card}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className={styles.iconWrap}>
                  <Icon name="logout" size={28} />
                </div>
                <h2 className={styles.title}>Sign out of Atlas?</h2>
                <p className={styles.subtitle}>
                  You&apos;ll need to log in again to access the command center.
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className={styles.logoutBtn}
                  >
                    {loading ? (
                      <span className={styles.spinner} />
                    ) : (
                      <>
                        <Icon name="logout" size={15} />
                        Sign out
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="goodbye"
                className={styles.card}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className={styles.goodbyeIcon}>
                  <Icon name="check-circle" size={36} />
                </div>
                <h2 className={styles.title}>Thank you for using Atlas</h2>
                <p className={styles.subtitle}>
                  Redirecting to login&hellip;
                </p>
                <div className={styles.progressBar}>
                  <motion.div
                    className={styles.progressFill}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
