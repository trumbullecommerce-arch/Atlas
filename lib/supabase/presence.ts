"use client";

/**
 * usePresence — Supabase Realtime Presence hook.
 * Tracks which users are actively logged in and using Atlas.
 * Each client joins a shared "atlas:presence" channel on mount
 * and automatically leaves on unmount / tab close.
 */

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  userId: string;
  initials: string;
  fullName: string;
  hue: number;
  /** ISO timestamp when the user joined */
  joinedAt: string;
}

/**
 * Returns the list of currently online users.
 * Joins the shared presence channel and syncs state in real-time.
 *
 * @param currentUser — The current user's info to broadcast.
 *                       Pass `null` if not yet authenticated.
 */
export function usePresence(currentUser: PresenceUser | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();

    const channel = supabase.channel("atlas:presence", {
      config: { presence: { key: currentUser.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        const seen = new Set<string>();

        for (const key of Object.keys(state)) {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const p = presences[0];
            if (!seen.has(p.userId)) {
              seen.add(p.userId);
              users.push(p);
            }
          }
        }

        // Sort by join time so the order is stable
        users.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(currentUser);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return onlineUsers;
}
