"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClient } from "urql";
import {
  useLiveMessages,
  useLiveNotifications,
} from "@/components/messages/realtime-provider";
import { useViewer } from "@/components/providers/viewer-provider";
import { PingSenderQuery } from "@/graphql/client/messages";
import { PingNotificationsQuery } from "@/graphql/client/notifications";
import {
  claimPing,
  playChirp,
  popupPermission,
  preparePopups,
  primeAudio,
  setPopupsEnabled,
  showPopup,
} from "@/lib/ping";

const OFFERED_KEY = "chirp:ping-offered";

const snippet = (text?: string | null) =>
  text && text.length > 120 ? `${text.slice(0, 119)}…` : (text ?? undefined);

/** Is the person looking at Chirp right now? */
const watching = () =>
  document.visibilityState === "visible" && document.hasFocus();

/**
 * Plays a chirp and shows a system pop-up for new notifications and
 * messages. Rendered once in the app shell; it draws nothing itself.
 * The pop-up only appears when Chirp isn't the window you're looking at.
 */
export function Pinger() {
  const client = useClient();
  const viewer = useViewer();
  const router = useRouter();
  const pathname = usePathname();

  // Wake the audio engine on first interaction; get pop-ups ready; follow
  // pop-up clicks (sent by the service worker) inside the open tab.
  useEffect(() => {
    primeAudio();
    preparePopups();
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "open" && typeof e.data.url === "string") {
        router.push(new URL(e.data.url).pathname);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    navigator.serviceWorker?.startMessages();
    return () =>
      navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [router]);

  // Offer pop-ups once per browser.
  useEffect(() => {
    if (popupPermission() !== "default") return;
    try {
      if (localStorage.getItem(OFFERED_KEY)) return;
      localStorage.setItem(OFFERED_KEY, "1");
    } catch {
      return;
    }
    const t = setTimeout(() => {
      toast("Get a pop-up when someone likes, replies or messages you?", {
        duration: 15000,
        action: {
          label: "Turn on",
          onClick: async () => {
            const on = await setPopupsEnabled(true);
            if (on) toast.success("Notifications are on");
            else
              toast.error(
                "Notifications are blocked. Allow them in your browser's site settings.",
              );
          },
        },
      });
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  useLiveNotifications(async ({ id }) => {
    if (!claimPing(`n:${id}`)) return;
    playChirp();
    if (watching()) return;
    const result = await client
      .query(PingNotificationsQuery, {}, { requestPolicy: "network-only" })
      .toPromise();
    const n = result.data?.notifications.edges.find(
      (e) => e.node.id === id,
    )?.node;
    if (!n) return;
    const name = n.actor.displayName;
    const t = n.tweet;
    const tweetUrl = t ? `/${t.author.username}/status/${t.id}` : null;
    const text = {
      LIKE: `${name} liked your chirp`,
      REPOST: `${name} reposted your chirp`,
      REPLY: `${name} replied to you`,
      QUOTE: `${name} quoted your chirp`,
      MENTION: `${name} mentioned you`,
      FOLLOW: `${name} followed you`,
    }[n.type];
    await showPopup({
      title: text,
      body: snippet(t?.content),
      url:
        n.type === "FOLLOW"
          ? `/${n.actor.username}`
          : (tweetUrl ?? "/notifications"),
      tag: `n:${id}`,
    });
  });

  useLiveMessages(async (m) => {
    if (m.edited) return; // an unsend, not a new message
    if (m.senderId === viewer?.id) return; // your own message
    // Already reading this chat.
    if (pathname === `/messages/${m.conversationId}` && watching()) return;
    const result = await client
      .query(
        PingSenderQuery,
        { id: m.conversationId },
        { requestPolicy: "network-only" },
      )
      .toPromise();
    const sender = result.data?.conversation?.otherParticipant;
    // Muted people's messages still arrive (and count as unread), silently;
    // message requests don't ping either.
    if (!sender || sender.viewerHasMuted) return;
    if (result.data?.conversation?.isRequest) return;
    if (!claimPing(`m:${m.id}`)) return;
    playChirp();
    if (watching()) return;
    await showPopup({
      title: sender.displayName,
      body: m.content
        ? snippet(m.content)
        : m.mediaPaths?.length > 1
          ? "Sent photos"
          : "Sent a photo",
      url: `/messages/${m.conversationId}`,
      tag: `m:${m.conversationId}`,
    });
  });

  return null;
}
