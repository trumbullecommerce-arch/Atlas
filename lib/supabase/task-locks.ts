"use client";

/**
 * useTaskLocks — Supabase Realtime Presence for task editing indicators.
 * When a user opens the task detail drawer, they broadcast a "lock" on that task.
 * Other users see an animated glow around the card in the locked user's color.
 * When the drawer closes, the lock is released.
 *
 * This hook listens to ALL three presence events (sync, join, leave) to ensure
 * real-time updates are captured regardless of Supabase SDK event dispatching.
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

interface TaskLockPresence {
  taskId: string | null;
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
  lockedAt: string;
}

/**
 * Returns a Map of taskId → TaskLock for all currently locked tasks,
 * plus functions to lock/unlock the current user's task.
 *
 * @param currentUser — Info about the current user for broadcasting.
 *                      Pass `null` if not authenticated.
 */
export function useTaskLocks(currentUser: {
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
} | null) {
  const [locks, setLocks] = useState<Map<string, TaskLock>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Store currentUser in a ref so callbacks always see the latest value
  // without needing it in the effect deps (which would cause reconnects).
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();

    const channel = supabase.channel("atlas:task-locks", {
      config: { presence: { key: currentUser.userId } },
    });

    /**
     * Rebuild the locks map from the full presence state.
     * Called on sync, join, AND leave events for maximum reliability.
     */
    function rebuildLocks() {
      const state = channel.presenceState<TaskLockPresence>();
      const nextLocks = new Map<string, TaskLock>();

      for (const key of Object.keys(state)) {
        const presences = state[key];
        if (presences && presences.length > 0) {
          const p = presences[0];
          // Only add if the user actually has a task open
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
      // Listen to ALL presence events for real-time reliability.
      // `sync` fires when the full state is in sync.
      // `join` fires when a user joins or updates their tracked state.
      // `leave` fires when a user leaves or clears their tracked state.
      .on("presence", { event: "sync" }, rebuildLocks)
      .on("presence", { event: "join" }, rebuildLocks)
      .on("presence", { event: "leave" }, rebuildLocks)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Start with no task locked
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
  const lockTask = useCallback(
    async (taskId: string) => {
      const user = userRef.current;
      if (!channelRef.current || !user) return;
      await channelRef.current.track({
        taskId,
        userId: user.userId,
        initials: user.initials,
        fullName: user.fullName,
        hue: user.hue,
        lockedAt: new Date().toISOString(),
      });
    },
    [],
  );

  /** Call when the user closes the task detail drawer. */
  const unlockTask = useCallback(async () => {
    const user = userRef.current;
    if (!channelRef.current || !user) return;
    await channelRef.current.track({
      taskId: null,
      userId: user.userId,
      initials: user.initials,
      fullName: user.fullName,
      hue: user.hue,
      lockedAt: new Date().toISOString(),
    });
  }, []);

  return { locks, lockTask, unlockTask };
}
