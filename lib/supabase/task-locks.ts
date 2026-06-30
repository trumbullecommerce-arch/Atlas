"use client";

/**
 * useTaskLocks — Supabase Realtime Presence for task editing indicators.
 * When a user opens the task detail drawer, they broadcast a "lock" on that task.
 * Other users see an animated glow around the card in the locked user's color.
 * When the drawer closes, the lock is released.
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
 * @param currentUserId — The current user's ID. Pass `null` if not authenticated.
 * @param currentUser   — Info about the current user for broadcasting.
 */
export function useTaskLocks(currentUser: {
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
} | null) {
  const [locks, setLocks] = useState<Map<string, TaskLock>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();

    const channel = supabase.channel("atlas:task-locks", {
      config: { presence: { key: currentUser.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
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
      })
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
      if (!channelRef.current || !currentUser) return;
      await channelRef.current.track({
        taskId,
        userId: currentUser.userId,
        initials: currentUser.initials,
        fullName: currentUser.fullName,
        hue: currentUser.hue,
        lockedAt: new Date().toISOString(),
      });
    },
    [currentUser],
  );

  /** Call when the user closes the task detail drawer. */
  const unlockTask = useCallback(async () => {
    if (!channelRef.current || !currentUser) return;
    await channelRef.current.track({
      taskId: null,
      userId: currentUser.userId,
      initials: currentUser.initials,
      fullName: currentUser.fullName,
      hue: currentUser.hue,
      lockedAt: new Date().toISOString(),
    });
  }, [currentUser]);

  return { locks, lockTask, unlockTask };
}
