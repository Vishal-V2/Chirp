import type { NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Event = {
  type: NotificationType;
  actorId: string;
  recipientId: string;
  /** The chirp liked/reposted, or the reply itself. */
  tweetId?: string;
};

/** Likes, reposts and follows can be undone, so each pair gets one notification. */
const dedupeKey = (e: Event) =>
  e.type === "REPLY" || e.type === "MENTION" || e.type === "QUOTE"
    ? null // each reply/mention/quote is its own event
    : `${e.type}:${e.actorId}:${e.tweetId ?? e.recipientId}`;

/**
 * Records a notification (never for your own actions). Failures are logged,
 * not thrown: a notification problem must never break the like/reply itself.
 */
export async function notify(e: Event) {
  if (e.actorId === e.recipientId) return;
  try {
    const key = dedupeKey(e);
    if (key) {
      await prisma.notification.upsert({
        where: { dedupeKey: key },
        create: { ...e, dedupeKey: key },
        update: {},
      });
    } else {
      await prisma.notification.create({ data: e });
    }
  } catch (err) {
    console.error("notify failed", err);
  }
}

/** Removes the notification for an undone like/repost/follow. */
export async function unnotify(
  e: Omit<Event, "recipientId"> & { recipientId?: string },
) {
  try {
    await prisma.notification.deleteMany({
      where: {
        dedupeKey: `${e.type}:${e.actorId}:${e.tweetId ?? e.recipientId}`,
      },
    });
  } catch (err) {
    console.error("unnotify failed", err);
  }
}

/** Who wrote a chirp (to notify them). */
export async function authorOf(tweetId: string) {
  return (
    await prisma.tweet.findUnique({
      where: { id: tweetId },
      select: { authorId: true },
    })
  )?.authorId;
}
