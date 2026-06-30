"use client";

/**
 * useTaskLocks — Real-time task editing indicators using Supabase Broadcast.
 *
 * ARCHITECTURE: Pure Broadcast (no Presence — Presence + Broadcast on the same
 * channel causes WebSocket conflicts where one direction stops receiving).
 *
 * How it works:
 * 1. Each client subscribes to a shared broadcast channel.
 * 2. When a user opens a task drawer, they broadcast { type: "lock", ... }.
 * 3. When they close it, they broadcast { type: "unlock", ... }.
 * 4. On subscribe, the new client broadcasts { type: "roll-call" }.
 *    All existing clients respond by re-broadcasting their current lock state.
 *    This gives the new joiner the full picture without needing Presence.
 * 5. Local state is also applied immediately (no round-trip for your own locks).
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
  lockedAt: string;
}

interface LockMsg {
  type: "lock" | "unlock" | "roll-call" | "state-reply";
  taskId: string;
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
  // Track what task THIS client currently has locked (for roll-call replies)
  const myLockedTaskRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();

    // Use a simple broadcast channel — NO presence config
    const channel = supabase.channel("atlas:locks-v3");

    channel
      .on("broadcast", { event: "task-lock" }, ({ payload }) => {
        const msg = payload as LockMsg;

        // Ignore messages from self (we apply local state directly)
        if (msg.userId === currentUser.userId) return;

        if (msg.type === "lock" || msg.type === "state-reply") {
          if (msg.taskId) {
            setLocks((prev) => {
              const next = new Map(prev);
              next.set(msg.taskId, {
                taskId: msg.taskId,
                userId: msg.userId,
                initials: msg.initials,
                fullName: msg.fullName,
                hue: msg.hue,
                lockedAt: msg.lockedAt,
              });
              return next;
            });
          }
        } else if (msg.type === "unlock") {
          setLocks((prev) => {
            const next = new Map(prev);
            // Remove any lock owned by this user
            for (const [tid, lock] of next) {
              if (lock.userId === msg.userId) {
                next.delete(tid);
              }
            }
            return next;
          });
        } else if (msg.type === "roll-call") {
          // Someone new joined — reply with our current lock if we have one
          const myTask = myLockedTaskRef.current;
          const user = userRef.current;
          if (myTask && user) {
            channel.send({
              type: "broadcast",
              event: "task-lock",
              payload: {
                type: "state-reply",
                taskId: myTask,
                userId: user.userId,
                initials: user.initials,
                fullName: user.fullName,
                hue: user.hue,
                lockedAt: new Date().toISOString(),
              } satisfies LockMsg,
            });
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Ask all existing clients to tell us their lock state
          setTimeout(() => {
            channel.send({
              type: "broadcast",
              event: "task-lock",
              payload: {
                type: "roll-call",
                taskId: "",
                userId: currentUser.userId,
                initials: currentUser.initials,
                fullName: currentUser.fullName,
                hue: currentUser.hue,
                lockedAt: new Date().toISOString(),
              } satisfies LockMsg,
            });
          }, 300); // Small delay to ensure other clients' listeners are active
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Call when the user opens a task's detail drawer. */
  const lockTask = useCallback(async (taskId: string) => {
    const user = userRef.current;
    if (!channelRef.current || !user) return;

    myLockedTaskRef.current = taskId;

    // Apply locally immediately (don't wait for round-trip)
    setLocks((prev) => {
      const next = new Map(prev);
      next.set(taskId, {
        taskId,
        userId: user.userId,
        initials: user.initials,
        fullName: user.fullName,
        hue: user.hue,
        lockedAt: new Date().toISOString(),
      });
      return next;
    });

    // Broadcast to other clients
    channelRef.current.send({
      type: "broadcast",
      event: "task-lock",
      payload: {
        type: "lock",
        taskId,
        userId: user.userId,
        initials: user.initials,
        fullName: user.fullName,
        hue: user.hue,
        lockedAt: new Date().toISOString(),
      } satisfies LockMsg,
    });
  }, []);

  /** Call when the user closes the task detail drawer. */
  const unlockTask = useCallback(async () => {
    const user = userRef.current;
    if (!channelRef.current || !user) return;

    const prevTask = myLockedTaskRef.current;
    myLockedTaskRef.current = null;

    // Apply locally immediately
    if (prevTask) {
      setLocks((prev) => {
        const next = new Map(prev);
        next.delete(prevTask);
        return next;
      });
    }

    // Broadcast to other clients
    channelRef.current.send({
      type: "broadcast",
      event: "task-lock",
      payload: {
        type: "unlock",
        taskId: "",
        userId: user.userId,
        initials: user.initials,
        fullName: user.fullName,
        hue: user.hue,
        lockedAt: new Date().toISOString(),
      } satisfies LockMsg,
    });
  }, []);

  return { locks, lockTask, unlockTask };
}
