import type { Tweet } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { badInput } from "./auth";
import { isWalled, visibleAuthor } from "./safety";

/**
 * A profile's "Chirps" tab: the user's own top-level chirps merged with their
 * reposts of other people's chirps, newest activity first (a repost is placed
 * at the time it was reposted, like on Twitter).
 */

type Item = {
  time: Date;
  kind: 0 | 1;
  id: string;
  tweet: Tweet;
  repostedAt: Date | null;
};
type Cursor = Pick<Item, "time" | "kind" | "id">;

const encode = (i: Cursor) =>
  Buffer.from(`${i.time.toISOString()}|${i.kind}|${i.id}`).toString(
    "base64url",
  );

function decode(cursor: string): Cursor {
  const [time, kind, id] = Buffer.from(cursor, "base64url")
    .toString()
    .split("|");
  const date = new Date(time);
  if (!id || Number.isNaN(date.getTime()) || (kind !== "0" && kind !== "1")) {
    throw badInput("Invalid page cursor.");
  }
  return { time: date, kind: Number(kind) as 0 | 1, id };
}

/** Negative when `a` comes before `b` (newest first; ties broken by kind, then id). */
function compare(a: Cursor, b: Cursor) {
  return (
    b.time.getTime() - a.time.getTime() ||
    b.kind - a.kind ||
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

export async function loadTimeline(
  userId: string,
  args: { first?: number | null; after?: string | null },
  /** Who's looking: nothing is shown across a block, and their muted people's chirps are skipped. */
  viewerId: string | null = null,
) {
  const take = Math.min(Math.max(args.first ?? 20, 1), 50);
  const after = args.after ? decode(args.after) : null;
  // Fetch a few extra in case several items share the cursor's exact timestamp.
  const fetchCount = take + 10;
  const createdAt = after ? { lte: after.time } : undefined;

  if (viewerId && (await isWalled(viewerId, userId))) {
    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    };
  }

  // The pinned chirp goes first on the first page and is left out of the rest.
  const pinned = (
    await prisma.user.findUnique({
      where: { id: userId },
      select: { pinnedTweet: true },
    })
  )?.pinnedTweet;

  const [posts, reposts] = await Promise.all([
    prisma.tweet.findMany({
      where: {
        authorId: userId,
        parentId: null,
        createdAt,
        ...(pinned && { id: { not: pinned.id } }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: fetchCount,
    }),
    prisma.retweet.findMany({
      // Reposts of your own chirps would duplicate them, so they're left out.
      where: {
        userId,
        createdAt,
        tweet: { authorId: { not: userId }, ...visibleAuthor(viewerId) },
      },
      orderBy: [{ createdAt: "desc" }, { tweetId: "desc" }],
      take: fetchCount,
      include: { tweet: true },
    }),
  ]);

  const items: Item[] = [
    ...posts.map((p) => ({
      time: p.createdAt,
      kind: 0 as const,
      id: p.id,
      tweet: p,
      repostedAt: null,
    })),
    ...reposts.map((r) => ({
      time: r.createdAt,
      kind: 1 as const,
      id: r.tweetId,
      tweet: r.tweet,
      repostedAt: r.createdAt,
    })),
  ]
    .filter((i) => !after || compare(after, i) < 0) // strictly after the cursor
    .sort(compare);

  const page = items.slice(0, take);
  const pinnedEdge =
    pinned && !after
      ? [
          {
            cursor: encode({ time: pinned.createdAt, kind: 0, id: pinned.id }),
            node: pinned,
            repostedAt: null,
            pinned: true,
          },
        ]
      : [];
  return {
    edges: [
      ...pinnedEdge,
      ...page.map((i) => ({
        cursor: encode(i),
        node: i.tweet,
        repostedAt: i.repostedAt,
      })),
    ],
    pageInfo: {
      hasNextPage: items.length > take,
      hasPreviousPage: Boolean(after),
      startCursor: page[0] ? encode(page[0]) : null,
      endCursor: page.length ? encode(page[page.length - 1]) : null,
    },
  };
}
