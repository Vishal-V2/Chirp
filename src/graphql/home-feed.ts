import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { badInput } from "./auth";
import { visibleSql } from "./safety";

/**
 * The "Following" feed: top-level chirps by you and the people you follow,
 * plus anything any of you reposted. Each chirp appears ONCE, at its latest
 * activity: if someone in your circle reposted it, it sits at the most recent
 * repost (with "X reposted"); otherwise at the time it was posted.
 */

type Row = { tweet_id: string; at: Date; reposter: string | null };

const encode = (r: Pick<Row, "at" | "tweet_id">) =>
  Buffer.from(`${r.at.toISOString()}|${r.tweet_id}`).toString("base64url");

function decode(cursor: string) {
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const date = new Date(at);
  if (!id || Number.isNaN(date.getTime()))
    throw badInput("Invalid page cursor.");
  return { at: date, id };
}

export async function loadHomeFeed(
  me: string,
  args: { first?: number | null; after?: string | null },
) {
  const take = Math.min(Math.max(args.first ?? 20, 1), 50);
  const after = args.after ? decode(args.after) : null;

  const rows = await prisma.$queryRaw<Row[]>`
    WITH circle AS (
      SELECT ${me}::uuid AS id
      UNION
      SELECT "followingId" FROM "Follow" WHERE "followerId" = ${me}::uuid
    ),
    -- Latest repost of each chirp by anyone in your circle.
    reposts AS (
      SELECT DISTINCT ON (r."tweetId")
        r."tweetId" AS tweet_id, r."createdAt" AS at, r."userId" AS reposter
      FROM "Retweet" r
      JOIN "Tweet" rt ON rt.id = r."tweetId"
      WHERE r."userId" IN (SELECT id FROM circle)
        -- skip reposts of people you blocked/muted (or who blocked you)
        AND ${visibleSql(me, Prisma.sql`rt."authorId"`)}
        AND ${visibleSql(me, Prisma.sql`r."userId"`)}
      ORDER BY r."tweetId", r."createdAt" DESC
    ),
    -- Original chirps from your circle that nobody there has reposted.
    posts AS (
      SELECT t.id AS tweet_id, t."createdAt" AS at, NULL::uuid AS reposter
      FROM "Tweet" t
      WHERE t."authorId" IN (SELECT id FROM circle)
        AND ${visibleSql(me, Prisma.sql`t."authorId"`)}
        AND t."parentId" IS NULL
        AND t.id NOT IN (SELECT tweet_id FROM reposts)
    ),
    items AS (SELECT * FROM reposts UNION ALL SELECT * FROM posts)
    SELECT tweet_id, at, reposter FROM items
    ${after ? Prisma.sql`WHERE (at, tweet_id) < (${after.at}, ${after.id})` : Prisma.empty}
    ORDER BY at DESC, tweet_id DESC
    LIMIT ${take + 1}`;

  const page = rows.slice(0, take);
  const [tweets, reposters] = await Promise.all([
    prisma.tweet.findMany({
      where: { id: { in: page.map((r) => r.tweet_id) } },
    }),
    prisma.user.findMany({
      where: {
        id: { in: page.flatMap((r) => (r.reposter ? [r.reposter] : [])) },
      },
      select: { id: true, username: true, displayName: true },
    }),
  ]);
  const tweetById = new Map(tweets.map((t) => [t.id, t]));
  const userById = new Map(reposters.map((u) => [u.id, u]));

  const edges = page.flatMap((r) => {
    const node = tweetById.get(r.tweet_id);
    if (!node) return []; // deleted in the meantime
    return [
      {
        cursor: encode(r),
        node,
        repostedBy: r.reposter ? (userById.get(r.reposter) ?? null) : null,
      },
    ];
  });

  return {
    edges,
    pageInfo: {
      hasNextPage: rows.length > take,
      hasPreviousPage: Boolean(after),
      startCursor: page[0] ? encode(page[0]) : null,
      endCursor: page.length ? encode(page[page.length - 1]) : null,
    },
  };
}
