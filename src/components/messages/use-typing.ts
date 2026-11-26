"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const SEND_EVERY_MS = 2000; // don't flood the socket while someone types
const SHOW_FOR_MS = 3500; // hide "typing…" if no new signal arrives

/**
 * Live signals for one chat over a private Supabase Realtime broadcast
 * channel (WebSocket); only the chat's participants can join it. Nothing is
 * stored; they're short-lived signals:
 *   - "typing": who's typing right now (several people, in groups);
 *   - "read":   someone just read the chat, so "Seen" can update.
 */
export function useTyping(
  conversationId: string,
  myId: string,
  onRead?: (userId: string) => void,
) {
  // Ids of the people typing now.
  const [typers, setTypers] = useState<string[]>([]);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const readCallback = useRef(onRead);
  useEffect(() => {
    readCallback.current = onRead;
  });

  const stopShowing = useCallback((userId: string) => {
    clearTimeout(timers.current.get(userId));
    timers.current.delete(userId);
    setTypers((list) => list.filter((id) => id !== userId));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const pending = timers.current;
    let ch: RealtimeChannel | undefined;
    let cancelled = false;

    (async () => {
      // Private channel: Supabase checks the database rule that only this
      // conversation's participants may join or send, so the socket must carry
      // the user's login first.
      await supabase.auth.getSession();
      await supabase.realtime.setAuth();
      if (cancelled) return;
      ch = supabase
        .channel(`typing:${conversationId}`, {
          config: { private: true, broadcast: { self: false } },
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const userId = payload?.userId;
          if (typeof userId !== "string" || userId === myId) return;
          if (payload?.stopped) return stopShowing(userId);
          clearTimeout(pending.get(userId));
          setTypers((list) =>
            list.includes(userId) ? list : [...list, userId],
          );
          pending.set(
            userId,
            setTimeout(() => stopShowing(userId), SHOW_FOR_MS),
          );
        })
        .on("broadcast", { event: "read" }, ({ payload }) => {
          const userId = payload?.userId;
          if (typeof userId === "string" && userId !== myId) {
            readCallback.current?.(userId);
          }
        })
        .subscribe();
      channel.current = ch;
    })();

    return () => {
      cancelled = true;
      pending.forEach(clearTimeout);
      pending.clear();
      channel.current = null;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [conversationId, myId, stopShowing]);

  /** Call on every keystroke; it's throttled. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < SEND_EVERY_MS) return;
    lastSent.current = now;
    void channel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: myId },
    });
  }, [myId]);

  /** Call after sending or clearing the box, so others hide it at once. */
  const notifyStopped = useCallback(() => {
    lastSent.current = 0;
    void channel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: myId, stopped: true },
    });
  }, [myId]);

  /** Tell the others you've just read the chat (only if receipts are on). */
  const notifyRead = useCallback(() => {
    void channel.current?.send({
      type: "broadcast",
      event: "read",
      payload: { userId: myId },
    });
  }, [myId]);

  return {
    typers,
    /** Kept for 1-on-1 chats: is the other person typing? */
    otherTyping: typers.length > 0,
    notifyTyping,
    notifyStopped,
    notifyRead,
    /** Hide someone's "typing…" right away when their message lands. */
    clearTyper: stopShowing,
  };
}
