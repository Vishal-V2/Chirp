"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const SEND_EVERY_MS = 2000; // don't flood the socket while someone types
const SHOW_FOR_MS = 3500; // hide "typing…" if no new signal arrives

/**
 * "Typing…" indicators over a private Supabase Realtime broadcast channel
 * (WebSocket); only the conversation's two participants can join it.
 * Nothing is stored; it's just a short-lived signal between the two people.
 */
export function useTyping(conversationId: string, myId: string) {
  const [otherTyping, setOtherTyping] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const supabase = createClient();
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
          if (payload?.userId === myId) return;
          clearTimeout(hideTimer.current);
          if (payload?.stopped) {
            setOtherTyping(false);
            return;
          }
          setOtherTyping(true);
          hideTimer.current = setTimeout(
            () => setOtherTyping(false),
            SHOW_FOR_MS,
          );
        })
        .subscribe();
      channel.current = ch;
    })();

    return () => {
      cancelled = true;
      clearTimeout(hideTimer.current);
      channel.current = null;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [conversationId, myId]);

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

  /** Call after sending or clearing the box, so the other side hides it at once. */
  const notifyStopped = useCallback(() => {
    lastSent.current = 0;
    void channel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: myId, stopped: true },
    });
  }, [myId]);

  /** Hide right away when their message lands. */
  const clearOtherTyping = useCallback(() => {
    clearTimeout(hideTimer.current);
    setOtherTyping(false);
  }, []);

  return { otherTyping, notifyTyping, notifyStopped, clearOtherTyping };
}
