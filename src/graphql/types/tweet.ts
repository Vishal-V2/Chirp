import { z } from "zod";
import type { Builder } from "../builder";
import { badInput, notFound, requireUser } from "../auth";
import { loadHomeFeed } from "../home-feed";
import { authorOf, notify, unnotify } from "../notify";
import {
  activeUser,
  assertNotWalled,
  notWalledFrom,
  visibleAuthor,
} from "../safety";
import {
  extractHashtags,
  extractMentions,
  normalizeTag,
} from "@/lib/rich-text";
import { prisma } from "@/lib/prisma";
import {
  CHIRP_MEDIA_BUCKET,
  MAX_CHIRP_IMAGES,
  MAX_POLL_OPTION,
} from "@/lib/storage";
import { Prisma } from "@/generated/prisma/client";

/** Splits a search box value into words (max 5, each up to 50 chars). */
export function searchWords(input: string): string[] {
  return input
    .trim()
    .slice(0, 100)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => escapeLike(w.slice(0, 50)));
}

/** Makes % and _ match literally (they're wildcards in SQL LIKE, which Prisma uses). */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

/** Throws a clean NOT_FOUND error instead of a database error for missing tweets. */
/**
 * Notifies people @mentioned in a new chirp. Skips you, unknown usernames, and
 * the person you're replying to (they already get a reply notification).
 */
async function notifyMentions(
  content: string,
  authorId: string,
  tweetId: string,
  parentId?: string,
) {
  const usernames = extractMentions(content).slice(0, 10);
  if (usernames.length === 0) return;
  const [people, parentAuthor] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: usernames.map((u) => ({
          username: { equals: u, mode: "insensitive" as const },
        })),
      },
      select: { id: true },
    }),
    parentId ? authorOf(parentId) : undefined,
  ]);
  for (const p of people) {
    if (p.id === parentAuthor) continue;
    await notify({
      type: "MENTION",
      actorId: authorId,
      recipientId: p.id,
      tweetId,
    });
  }
}

export async function requireTweet(id: string) {
  const tweet = await prisma.tweet.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tweet)
    throw notFound("This chirp doesn't exist. It may have been deleted.");
}

/** The most chirps one thread can have. */
const MAX_THREAD_PARTS = 25;

export function addTweetTypes(builder: Builder) {
  const newestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];

  const TweetRef = builder.prismaObject("Tweet", {
    fields: (t) => ({
      id: t.exposeID("id"),
      content: t.exposeString("content"),
      mediaUrls: t.exposeStringList("mediaUrls"),
      location: t.exposeString("location", { nullable: true }),
      poll: t.relation("poll", { nullable: true }),
      /** The chirp this one quotes (null if it isn't a quote, or the original was deleted). */
      // Hidden (shown as unavailable) when there's a block between you and its author.
      quoted: t.prismaField({
        type: "Tweet",
        nullable: true,
        resolve: (query, tweet, _args, ctx) =>
          tweet.quotedId
            ? prisma.tweet.findFirst({
                ...query,
                where: {
                  id: tweet.quotedId,
                  author: ctx.userId ? notWalledFrom(ctx.userId) : activeUser,
                },
              })
            : null,
      }),
      /** True for quote reposts, even after the quoted chirp is gone. */
      isQuote: t.exposeBoolean("isQuote"),
      /** The author replied to this chirp themselves: it starts a thread. */
      hasThread: t.boolean({
        resolve: async (tweet) =>
          (await prisma.tweet.count({
            where: { parentId: tweet.id, authorId: tweet.authorId },
          })) > 0,
      }),
      /**
       * The rest of the author's thread after this chirp: each next part is
       * the author's earliest reply to the previous one (up to 25).
       */
      threadContinuation: t.prismaField({
        type: ["Tweet"],
        resolve: async (query, tweet) => {
          const ids: string[] = [];
          let current = tweet.id;
          while (ids.length < MAX_THREAD_PARTS) {
            const next = await prisma.tweet.findFirst({
              where: { parentId: current, authorId: tweet.authorId },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              select: { id: true },
            });
            if (!next) break;
            ids.push(next.id);
            current = next.id;
          }
          if (ids.length === 0) return [];
          const rows = await prisma.tweet.findMany({
            ...query,
            where: { id: { in: ids } },
          });
          const byId = new Map(rows.map((r) => [r.id, r]));
          return ids.flatMap((id) => byId.get(id) ?? []);
        },
      }),
      /** Pinned to the top of its author's profile. */
      isPinned: t.boolean({
        select: { pinnedBy: { select: { id: true } } },
        resolve: (tweet) => tweet.pinnedBy !== null,
      }),
      quoteCount: t.relationCount("quotes"),
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      author: t.relation("author"),
      parent: t.relation("parent", { nullable: true }),
      /** The chain of tweets this one replies to, root first (for thread pages). */
      ancestors: t.prismaField({
        type: ["Tweet"],
        resolve: async (query, tweet) => {
          const MAX_DEPTH = 50;
          const ids: string[] = [];
          let parentId = (
            await prisma.tweet.findUnique({
              where: { id: tweet.id },
              select: { parentId: true },
            })
          )?.parentId;
          while (parentId && ids.length < MAX_DEPTH) {
            ids.unshift(parentId);
            parentId = (
              await prisma.tweet.findUnique({
                where: { id: parentId },
                select: { parentId: true },
              })
            )?.parentId;
          }
          const rows = await prisma.tweet.findMany({
            ...query,
            where: { id: { in: ids } },
          });
          const byId = new Map(rows.map((r) => [r.id, r]));
          return ids.flatMap((id) => byId.get(id) ?? []);
        },
      }),
      // Replies from people you blocked, muted or who blocked you are hidden.
      replies: t.relatedConnection("replies", {
        cursor: "id",
        query: (_args, ctx) => ({
          where: visibleAuthor(ctx.userId),
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
      }),
      likeCount: t.relationCount("likes"),
      retweetCount: t.relationCount("retweets"),
      replyCount: t.relationCount("replies"),
      viewerHasLiked: t.boolean({
        select: (_args, ctx) => ({
          likes: {
            where: { userId: ctx.userId ?? undefined },
            select: { userId: true },
            take: 1,
          },
        }),
        resolve: (tweet, _args, ctx) =>
          ctx.userId !== null && tweet.likes.length > 0,
      }),
      viewerHasRetweeted: t.boolean({
        select: (_args, ctx) => ({
          retweets: {
            where: { userId: ctx.userId ?? undefined },
            select: { userId: true },
            take: 1,
          },
        }),
        resolve: (tweet, _args, ctx) =>
          ctx.userId !== null && tweet.retweets.length > 0,
      }),
    }),
  });

  const Reposter = builder
    .objectRef<{ id: string; username: string; displayName: string }>(
      "Reposter",
    )
    .implement({
      description: "Who reposted a chirp into your feed.",
      fields: (t) => ({
        id: t.exposeID("id"),
        username: t.exposeString("username"),
        displayName: t.exposeString("displayName"),
      }),
    });

  const Trend = builder
    .objectRef<{ tag: string; chirpCount: number }>("Trend")
    .implement({
      description: "A #tag and how many chirps used it recently.",
      fields: (t) => ({
        tag: t.exposeString("tag"),
        chirpCount: t.exposeInt("chirpCount"),
      }),
    });

  builder.queryFields((t) => ({
    tweet: t.prismaField({
      type: "Tweet",
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      // Across a block, the chirp is treated as not found.
      resolve: (query, _root, { id }, ctx) =>
        prisma.tweet.findFirst({
          ...query,
          where: {
            id: String(id),
            author: ctx.userId ? notWalledFrom(ctx.userId) : activeUser,
          },
        }),
    }),
    /**
     * Your "Following" feed: chirps from you and the people you follow, plus
     * their reposts (each chirp once, at its latest activity).
     */
    homeFeed: t.connection(
      {
        type: TweetRef,
        resolve: (_root, args, ctx) => loadHomeFeed(requireUser(ctx), args),
      },
      { name: "QueryHomeFeedConnection" },
      {
        name: "QueryHomeFeedConnectionEdge",
        fields: (te) => ({
          repostedBy: te.field({
            type: Reposter,
            nullable: true,
            description:
              "Set when this entry is here because someone reposted it.",
            resolve: (edge) =>
              (
                edge as {
                  repostedBy?: {
                    id: string;
                    username: string;
                    displayName: string;
                  } | null;
                }
              ).repostedBy ?? null,
          }),
        }),
      },
    ),
    /** Chirps with a #tag, newest first. */
    hashtagTweets: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      args: { tag: t.arg.string({ required: true }) },
      resolve: (query, _root, args, ctx) => {
        const tag = normalizeTag(args.tag);
        if (!tag) throw badInput("Which hashtag?");
        return prisma.tweet.findMany({
          ...query,
          where: { hashtags: { has: tag }, ...visibleAuthor(ctx.userId) },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
      },
    }),
    /** The most-used #tags of the last 7 days. */
    trendingHashtags: t.field({
      type: [Trend],
      args: { first: t.arg.int({ defaultValue: 10 }) },
      resolve: async (_root, args) => {
        const limit = Math.min(Math.max(args.first ?? 10, 1), 30);
        const rows = await prisma.$queryRaw<{ tag: string; chirps: number }[]>`
          SELECT tag, count(*)::int AS chirps
          FROM "Tweet", unnest("hashtags") AS tag
          WHERE "createdAt" > now() - interval '7 days'
          GROUP BY tag
          ORDER BY chirps DESC, tag ASC
          LIMIT ${limit}`;
        return rows.map((r) => ({ tag: r.tag, chirpCount: r.chirps }));
      },
    }),
    /** Most-liked top-level chirps from the last 30 days (newest breaks ties). */
    popularTweets: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      resolve: (query, _root, _args, ctx) =>
        prisma.tweet.findMany({
          ...query,
          where: {
            parentId: null,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            ...visibleAuthor(ctx.userId),
          },
          orderBy: [
            { likes: { _count: "desc" } },
            { createdAt: "desc" },
            { id: "desc" },
          ],
        }),
    }),
    /** Chirps (including replies) whose text contains the search words. */
    searchTweets: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      args: { query: t.arg.string({ required: true }) },
      resolve: (query, _root, args, ctx) => {
        const words = searchWords(args.query);
        if (words.length === 0) throw badInput("Type something to search for.");
        return prisma.tweet.findMany({
          ...query,
          // Every word must appear somewhere, in any order.
          where: {
            AND: words.map((w) => ({
              content: { contains: w, mode: "insensitive" as const },
            })),
            ...visibleAuthor(ctx.userId),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
      },
    }),
    /** Every top-level tweet, newest first. Works signed out. */
    exploreFeed: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      resolve: (query, _root, _args, ctx) =>
        prisma.tweet.findMany({
          ...query,
          where: { parentId: null, ...visibleAuthor(ctx.userId) },
          orderBy: newestFirst,
        }),
    }),
  }));

  /** Chirp images must be in the author's own folder of our media bucket. */

  const pollInput = z
    .object({
      options: z
        .array(
          z
            .string()
            .trim()
            .min(1, "Poll choices can't be empty.")
            .max(
              MAX_POLL_OPTION,
              `Poll choices can be up to ${MAX_POLL_OPTION} characters.`,
            ),
        )
        .min(2, "A poll needs at least 2 choices.")
        .max(4, "A poll can have up to 4 choices.")
        .refine(
          (opts) =>
            new Set(opts.map((o) => o.toLowerCase())).size === opts.length,
          "Poll choices must be different.",
        ),
      durationMinutes: z
        .number()
        .int()
        .min(5, "Polls must run for at least 5 minutes.")
        .max(7 * 24 * 60, "Polls can run for up to 7 days."),
    })
    .optional();

  /** Images (including GIFs) must be in the author's own folder of our bucket. */
  const tweetInput = (authorId: string) => {
    const mediaPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")}/storage/v1/object/public/${CHIRP_MEDIA_BUCKET}/${authorId}/`;
    return z
      .object({
        content: z
          .string()
          .trim()
          .max(280, "Chirps can be up to 280 characters."),
        mediaUrls: z
          .array(
            z
              .url()
              .refine(
                (u) => u.startsWith(mediaPrefix),
                "Images must be uploaded through Chirp.",
              ),
          )
          .max(
            MAX_CHIRP_IMAGES,
            `A chirp can have up to ${MAX_CHIRP_IMAGES} images.`,
          )
          .default([]),
        location: z
          .string()
          .trim()
          .max(60, "Locations can be up to 60 characters.")
          .optional()
          .transform((l) => l || undefined),
        poll: pollInput,
        parentId: z.string().optional(),
        quotedId: z.string().optional(),
      })
      .refine((t) => !t.poll || t.content.length > 0, {
        message: "Add a question for your poll.",
      })
      .refine((t) => t.content.length > 0 || t.mediaUrls.length > 0, {
        message: "A chirp needs some text or an image.",
      })
      .refine((t) => !(t.poll && t.quotedId), {
        message: "A quote can't have a poll.",
      })
      .refine((t) => !t.poll || t.mediaUrls.length === 0, {
        message: "A poll can't have images or a GIF.",
      });
  };

  const PollInput = builder.inputType("PollInput", {
    fields: (t) => ({
      options: t.stringList({ required: true }),
      durationMinutes: t.int({ required: true }),
    }),
  });

  /** One chirp of a new thread. Only the first may have a poll. */
  const ThreadPartInput = builder.inputType("ThreadPartInput", {
    fields: (t) => ({
      content: t.string({ required: true }),
      mediaUrls: t.stringList(),
      location: t.string(),
      poll: t.field({ type: PollInput }),
    }),
  });

  builder.mutationFields((t) => ({
    /**
     * Posts a thread: several chirps at once, each a reply to the one before.
     * Every part is checked first, then they're saved together (all or none).
     * Returns the first chirp.
     */
    createThread: t.prismaField({
      type: "Tweet",
      args: {
        parts: t.arg({ type: [ThreadPartInput], required: true }),
      },
      resolve: async (query, _root, args, ctx) => {
        const authorId = requireUser(ctx);
        if (args.parts.length < 2)
          throw badInput("A thread needs at least 2 chirps.");
        if (args.parts.length > MAX_THREAD_PARTS)
          throw badInput(`A thread can have up to ${MAX_THREAD_PARTS} chirps.`);
        const parts = args.parts.map((part, i) => {
          if (i > 0 && part.poll)
            throw badInput("Only the first chirp of a thread can have a poll.");
          const parsed = tweetInput(authorId).safeParse({
            content: part.content,
            mediaUrls: part.mediaUrls ?? undefined,
            location: part.location ?? undefined,
            poll: part.poll ?? undefined,
          });
          if (!parsed.success) {
            throw badInput(`Chirp ${i + 1}: ${parsed.error.issues[0].message}`);
          }
          return parsed.data;
        });

        const ids = await prisma.$transaction(async (tx) => {
          const created: string[] = [];
          for (const { poll, ...part } of parts) {
            const row = await tx.tweet.create({
              data: {
                ...part,
                hashtags: extractHashtags(part.content),
                authorId,
                parentId: created.at(-1),
                ...(poll && {
                  poll: {
                    create: {
                      endsAt: new Date(
                        Date.now() + poll.durationMinutes * 60_000,
                      ),
                      options: {
                        create: poll.options.map((text, position) => ({
                          text,
                          position,
                        })),
                      },
                    },
                  },
                }),
              },
              select: { id: true },
            });
            created.push(row.id);
          }
          return created;
        });

        // @mentions in every part (replying to yourself notifies nobody).
        for (const [i, part] of parts.entries()) {
          await notifyMentions(part.content, authorId, ids[i], ids[i - 1]);
        }
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: ids[0] },
        });
      },
    }),
    createTweet: t.prismaField({
      type: "Tweet",
      args: {
        content: t.arg.string({ required: true }),
        mediaUrls: t.arg.stringList(),
        location: t.arg.string(),
        poll: t.arg({ type: PollInput }),
        parentId: t.arg.id(),
        /** Makes this a quote repost of that chirp. */
        quotedId: t.arg.id(),
      },
      resolve: async (query, _root, args, ctx) => {
        const authorId = requireUser(ctx);
        const parsed = tweetInput(authorId).safeParse({
          content: args.content,
          mediaUrls: args.mediaUrls ?? undefined,
          location: args.location ?? undefined,
          poll: args.poll ?? undefined,
          parentId: args.parentId ? String(args.parentId) : undefined,
          quotedId: args.quotedId ? String(args.quotedId) : undefined,
        });
        if (!parsed.success) throw badInput(parsed.error.issues[0].message);
        // Replying to a post that was just deleted gives a clear error.
        if (parsed.data.parentId) await requireTweet(parsed.data.parentId);
        // Quoting a chirp that was just deleted gives a clear error too.
        if (parsed.data.quotedId) await requireTweet(parsed.data.quotedId);
        // No replying to or quoting someone across a block.
        if (parsed.data.parentId) {
          await assertNotWalled(
            authorId,
            await authorOf(parsed.data.parentId),
            "You can't reply to this chirp.",
          );
        }
        if (parsed.data.quotedId) {
          await assertNotWalled(
            authorId,
            await authorOf(parsed.data.quotedId),
            "You can't quote this chirp.",
          );
        }
        const { poll, ...tweet } = parsed.data;
        const created = await prisma.tweet.create({
          ...query,
          data: {
            ...tweet,
            hashtags: extractHashtags(tweet.content),
            isQuote: Boolean(tweet.quotedId),
            authorId,
            ...(poll && {
              poll: {
                create: {
                  endsAt: new Date(Date.now() + poll.durationMinutes * 60_000),
                  options: {
                    create: poll.options.map((text, position) => ({
                      text,
                      position,
                    })),
                  },
                },
              },
            }),
          },
        });
        // Tell the person you replied to.
        if (tweet.parentId) {
          const recipientId = await authorOf(tweet.parentId);
          if (recipientId) {
            await notify({
              type: "REPLY",
              actorId: authorId,
              recipientId,
              tweetId: created.id,
            });
          }
        }
        // Tell the person whose chirp you quoted.
        if (tweet.quotedId) {
          const recipientId = await authorOf(tweet.quotedId);
          if (recipientId) {
            await notify({
              type: "QUOTE",
              actorId: authorId,
              recipientId,
              tweetId: created.id,
            });
          }
        }
        await notifyMentions(
          tweet.content,
          authorId,
          created.id,
          tweet.parentId,
        );
        return created;
      },
    }),
    deleteTweet: t.boolean({
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }, ctx) => {
        const me = requireUser(ctx);
        const { count } = await prisma.tweet.deleteMany({
          where: { id: String(id), authorId: me },
        });
        return count > 0;
      },
    }),
    /**
     * Pins one of your own chirps (not a reply) to the top of your profile,
     * replacing any earlier pin. Returns the chirps whose pin changed.
     */
    pinTweet: t.prismaField({
      type: ["Tweet"],
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const tweetId = String(args.id);
        const tweet = await prisma.tweet.findUnique({
          where: { id: tweetId },
          select: { authorId: true, parentId: true },
        });
        if (!tweet) throw notFound("This chirp doesn't exist.");
        if (tweet.authorId !== me)
          throw badInput("You can only pin your own chirps.");
        if (tweet.parentId) throw badInput("Replies can't be pinned.");
        const before = await prisma.user.findUnique({
          where: { id: me },
          select: { pinnedTweetId: true },
        });
        await prisma.user.update({
          where: { id: me },
          data: { pinnedTweetId: tweetId },
        });
        const changed = [tweetId, before?.pinnedTweetId].filter(
          (id): id is string => Boolean(id),
        );
        return prisma.tweet.findMany({
          ...query,
          where: { id: { in: changed } },
        });
      },
    }),
    unpinTweet: t.prismaField({
      type: ["Tweet"],
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const tweetId = String(args.id);
        await prisma.user.updateMany({
          where: { id: me, pinnedTweetId: tweetId },
          data: { pinnedTweetId: null },
        });
        return prisma.tweet.findMany({ ...query, where: { id: tweetId } });
      },
    }),
    likeTweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await assertNotWalled(
          userId,
          await authorOf(tweetId),
          "You can't like this chirp.",
        );
        await prisma.like.upsert({
          where: { userId_tweetId: { userId, tweetId } },
          create: { userId, tweetId },
          update: {},
        });
        const recipientId = await authorOf(tweetId);
        if (recipientId)
          await notify({ type: "LIKE", actorId: userId, recipientId, tweetId });
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: tweetId },
        });
      },
    }),
    unlikeTweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await prisma.like.deleteMany({ where: { userId, tweetId } });
        await unnotify({ type: "LIKE", actorId: userId, tweetId });
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: tweetId },
        });
      },
    }),
    retweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await assertNotWalled(
          userId,
          await authorOf(tweetId),
          "You can't repost this chirp.",
        );
        await prisma.retweet.upsert({
          where: { userId_tweetId: { userId, tweetId } },
          create: { userId, tweetId },
          update: {},
        });
        const recipientId = await authorOf(tweetId);
        if (recipientId)
          await notify({
            type: "REPOST",
            actorId: userId,
            recipientId,
            tweetId,
          });
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: tweetId },
        });
      },
    }),
    unretweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await prisma.retweet.deleteMany({ where: { userId, tweetId } });
        await unnotify({ type: "REPOST", actorId: userId, tweetId });
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: tweetId },
        });
      },
    }),
  }));

  builder.prismaObject("PollOption", {
    fields: (t) => ({
      id: t.exposeID("id"),
      text: t.exposeString("text"),
      voteCount: t.relationCount("votes"),
    }),
  });

  builder.prismaObject("Poll", {
    fields: (t) => ({
      id: t.exposeID("id"),
      endsAt: t.expose("endsAt", { type: "DateTime" }),
      isClosed: t.boolean({
        resolve: (poll) => poll.endsAt.getTime() <= Date.now(),
      }),
      totalVotes: t.relationCount("votes"),
      options: t.relation("options", {
        query: { orderBy: { position: "asc" } },
      }),
      /** Which option you picked, if you've voted. */
      viewerVoteOptionId: t.id({
        nullable: true,
        select: (_args, ctx) => ({
          votes: {
            where: { userId: ctx.userId ?? undefined },
            select: { optionId: true },
            take: 1,
          },
        }),
        resolve: (poll, _args, ctx) =>
          ctx.userId ? (poll.votes[0]?.optionId ?? null) : null,
      }),
      /** Whether you wrote the chirp (authors see results and can't vote). */
      viewerIsAuthor: t.boolean({
        select: { tweet: { select: { authorId: true } } },
        resolve: (poll, _args, ctx) => poll.tweet.authorId === ctx.userId,
      }),
    }),
  });

  builder.mutationFields((t) => ({
    votePoll: t.prismaField({
      type: "Poll",
      args: { optionId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const option = await prisma.pollOption.findUnique({
          where: { id: String(args.optionId) },
          select: {
            pollId: true,
            poll: {
              select: { endsAt: true, tweet: { select: { authorId: true } } },
            },
          },
        });
        if (!option) throw notFound("This poll doesn't exist.");
        if (option.poll.endsAt.getTime() <= Date.now())
          throw badInput("This poll has ended.");
        if (option.poll.tweet.authorId === userId)
          throw badInput("You can't vote in your own poll.");
        try {
          await prisma.pollVote.create({
            data: {
              pollId: option.pollId,
              optionId: String(args.optionId),
              userId,
            },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            throw badInput("You've already voted in this poll.");
          }
          throw e;
        }
        return prisma.poll.findUniqueOrThrow({
          ...query,
          where: { id: option.pollId },
        });
      },
    }),
  }));

  return TweetRef;
}
