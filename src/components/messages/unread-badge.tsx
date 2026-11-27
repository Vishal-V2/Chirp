"use client";

import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "urql";
import { useViewer } from "@/components/providers/viewer-provider";
import { UnreadMessageCountQuery } from "@/graphql/client/messages";
import { cn } from "@/lib/utils";
import { UnreadNotificationCountQuery } from "@/graphql/client/notifications";
import { useLiveMessages, useLiveNotifications } from "./realtime-provider";
import { isReadingNow } from "@/lib/reading-now";

/** Live unread count for Messages or Notifications; pops in when something arrives. */
export function UnreadBadge({
  kind,
  className,
}: {
  kind: "messages" | "notifications";
  className?: string;
}) {
  const viewer = useViewer();
  const [messages, refetchMessages] = useQuery({
    query: UnreadMessageCountQuery,
    pause: kind !== "messages",
  });
  const [notifications, refetchNotifications] = useQuery({
    query: UnreadNotificationCountQuery,
    pause: kind !== "notifications",
  });

  // Something arrived over the WebSocket: refresh the count.
  useLiveMessages((m) => {
    if (kind !== "messages" || m.senderId === viewer?.id) return;
    // You're looking at that chat: it's about to be marked read, which
    // refreshes the count itself, so don't flash it up as unread meanwhile.
    if (isReadingNow(m.conversationId)) return;
    refetchMessages({ requestPolicy: "network-only" });
  });
  useLiveNotifications(() => {
    if (kind === "notifications")
      refetchNotifications({ requestPolicy: "network-only" });
  });

  const count =
    (kind === "messages"
      ? messages.data?.unreadMessageCount
      : notifications.data?.unreadNotificationCount) ?? 0;
  const noun =
    kind === "messages"
      ? count === 1
        ? "message"
        : "messages"
      : count === 1
        ? "notification"
        : "notifications";
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          aria-label={`${count} unread ${noun}`}
          className={cn(
            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-bold text-primary-foreground ring-2 ring-background",
            className,
          )}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
