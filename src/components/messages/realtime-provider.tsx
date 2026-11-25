"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** A new message as streamed by Supabase Realtime (a raw "Message" row). */
export type LiveMessage = {
  id: string;
  content: string;
  createdAt: string;
  conversationId: string;
  senderId: string;
};

type Listener = (message: LiveMessage) => void;
type NotificationListener = () => void;

const ListenersContext = createContext<Set<Listener> | null>(null);
const NotificationListenersContext =
  createContext<Set<NotificationListener> | null>(null);

/** Postgres "timestamp without time zone" arrives without a zone; it's UTC. */
const asUtc = (t: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`);

/**
 * Opens ONE WebSocket subscription (Supabase Realtime) for new messages and
 * fans them out to any component that listens. The database only sends rows
 * the signed-in user may read, i.e. messages from their own conversations.
 */
export function RealtimeMessagesProvider({
  userId,
  children,
}: {
  /** The signed-in user; their private channel is `inbox:<userId>`. */
  userId: string;
  children: React.ReactNode;
}) {
  // A stable set of callbacks; created once, never replaced.
  const [listeners] = useState(() => new Set<Listener>());
  const [notificationListeners] = useState(
    () => new Set<NotificationListener>(),
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    (async () => {
      // Make sure the socket carries the user's login, so the database's
      // participant-only rule can be applied to them.
      await supabase.auth.getSession();
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        // Private: only this user may join (checked by a rule on realtime.messages).
        .channel(`inbox:${userId}`, { config: { private: true } })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Message" },
          (payload) => {
            // Messages you may not read arrive as empty events tagged
            // "401 Unauthorized" (no content leaks); ignore them.
            if (
              payload.errors?.length ||
              !(payload.new as Partial<LiveMessage>)?.id
            )
              return;
            const row = payload.new as LiveMessage;
            const message = {
              ...row,
              createdAt: new Date(asUtc(row.createdAt)).toISOString(),
            };
            listeners.forEach((fn) => fn(message));
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Notification" },
          (payload) => {
            // Only your own notifications carry data; anything else is an empty 401 event.
            if (payload.errors?.length || !(payload.new as { id?: string })?.id)
              return;
            notificationListeners.forEach((fn) => fn());
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [listeners, notificationListeners, userId]);

  return (
    <ListenersContext.Provider value={listeners}>
      <NotificationListenersContext.Provider value={notificationListeners}>
        {children}
      </NotificationListenersContext.Provider>
    </ListenersContext.Provider>
  );
}

/** Calls `onMessage` for every new message in your conversations, as it happens. */
export function useLiveMessages(onMessage: Listener) {
  const listeners = useContext(ListenersContext);
  const latest = useRef(onMessage);
  useEffect(() => {
    latest.current = onMessage;
  });
  useEffect(() => {
    if (!listeners) return;
    const fn: Listener = (m) => latest.current(m);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [listeners]);
}

/** Calls `onNotification` whenever you get a new notification, as it happens. */
export function useLiveNotifications(onNotification: () => void) {
  const listeners = useContext(NotificationListenersContext);
  const latest = useRef(onNotification);
  useEffect(() => {
    latest.current = onNotification;
  });
  useEffect(() => {
    if (!listeners) return;
    const fn = () => latest.current();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [listeners]);
}
