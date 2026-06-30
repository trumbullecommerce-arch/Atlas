"use client";

/**
 * useTaskLocks — Real-time task editing indicators using Supabase.
 *
 * ARCHITECTURE (dual-channel for reliability):
 * 1. BROADCAST: When a user locks/unlocks a task, they broadcast an explicit
 *    message to all subscribers. This is instant and reliable for live updates.
 * 2. PRESENCE: Used as a persistent state store so that new joiners (or page
 *    refreshes) get the current state of all locks without waiting for a
 *    broadcast. Also handles cleanup when a user disconnects abruptly.
 *
 * The combination ensures:
 *  - Live updates arrive instantly via broadcast
 *  - State is always correct after refresh via presence sync
 *  - Stale locks are cleaned up when users go offline
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface TaskLock {
  taskId: string;
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
  /** ISO timestamp when the lock was acquired */
  lockedAt: string;
}

interface TaskLockPayload {
  type: "lock" | "unlock";
  taskId: string;
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
  lockedAt: string;
}

interface TaskLockPresence {
  taskId: string | null;
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
  lockedAt: string;
}

export function useTaskLocks(currentUser: {
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
} | null) {
  const [locks, setLocks] = useState<Map<string, TaskLock>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();

    const channel = supabase.channel("atlas:task-locks-v2", {
      config: { presence: { key: currentUser.userId } },
    });

    /**
     * Rebuild locks from Presence state (initial load + safety net).
     */
    function rebuildFromPresence() {
      const state = channel.presenceState<TaskLockPresence>();
      const nextLocks = new Map<string, TaskLock>();

      for (const key of Object.keys(state)) {
        const presences = state[key];
        if (presences && presences.length > 0) {
          const p = presences[0];
          if (p.taskId) {
            nextLocks.set(p.taskId, {
              taskId: p.taskId,
              userId: p.userId,
              initials: p.initials,
              fullName: p.fullName,
              hue: p.hue,
              lockedAt: p.lockedAt,
            });
          }
        }
      }

      setLocks(nextLocks);
    }

    channel
      // ── PRESENCE: for initial state + cleanup on disconnect ──
      .on("presence", { event: "sync" }, rebuildFromPresence)
      .on("presence", { event: "join" }, rebuildFromPresence)
      .on("presence", { event: "leave" }, rebuildFromPresence)

      // ── BROADCAST: for instant real-time lock/unlock notifications ──
      .on("broadcast", { event: "task-lock" }, ({ payload }) => {
        const msg = payload as TaskLockPayload;
        setLocks((prev) => {
          const next = new Map(prev);
          if (msg.type === "lock") {
            next.set(msg.taskId, {
              taskId: msg.taskId,
              userId: msg.userId,
              initials: msg.initials,
              fullName: msg.fullName,
              hue: msg.hue,
              lockedAt: msg.lockedAt,
            });
          } else {
            // On unlock, remove any lock owned by this user
            for (const [tid, lock] of next) {
              if (lock.userId === msg.userId) {
                next.delete(tid);
              }
            }
          }
          return next;
        });
      })

      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track initial presence (no task locked)
          await channel.track({
            taskId: null,
            userId: currentUser.userId,
            initials: currentUser.initials,
            fullName: currentUser.fullName,
            hue: currentUser.hue,
            lockedAt: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Call when the user opens a task's detail drawer. */
  const lockTask = useCallback(async (taskId: string) => {
    const user = userRef.current;
    if (!channelRef.current || !user) return;

    const payload: TaskLockPayload = {
      type: "lock",
      taskId,
      userId: user.userId,
      initials: user.initials,
      fullName: user.fullName,
      hue: user.hue,
      lockedAt: new Date().toISOString(),
    };

    // 1. Broadcast to all other clients (instant real-time update)
    await channelRef.current.send({
      type: "broadcast",
      event: "task-lock",
      payload,
    });

    // 2. Update presence state (persists for new joiners / refreshers)
    await channelRef.current.track({
      taskId,
      userId: user.userId,
      initials: user.initials,
      fullName: user.fullName,
      hue: user.hue,
      lockedAt: payload.lockedAt,
    });
  }, []);

  /** Call when the user closes the task detail drawer. */
  const unlockTask = useCallback(async () => {
    const user = userRef.current;
    if (!channelRef.current || !user) return;

    const payload: TaskLockPayload = {
      type: "unlock",
      taskId: "",
      userId: user.userId,
      initials: user.initials,
      fullName: user.fullName,
      hue: user.hue,
      lockedAt: new Date().toISOString(),
    };

    // 1. Broadcast unlock to all clients (instant)
    await channelRef.current.send({
      type: "broadcast",
      event: "task-lock",
      payload,
    });

    // 2. Clear presence state
    await channelRef.current.track({
      taskId: null,
      userId: user.userId,
      initials: user.initials,
      fullName: user.fullName,
      hue: user.hue,
      lockedAt: payload.lockedAt,
    });
  }, []);

  return { locks, lockTask, unlockTask };
}
