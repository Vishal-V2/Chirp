import { z } from "zod";
import type { Builder } from "../builder";
import { badInput, notFound, requireUser } from "../auth";
import { prisma } from "@/lib/prisma";

/** Throws a clean NOT_FOUND error instead of a database error for missing tweets. */
async function requireTweet(id: string) {
  const tweet = await prisma.tweet.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tweet)
    throw notFound("This post doesn't exist. It may have been deleted.");
}

export function addTweetTypes(builder: Builder) {
  const newestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];

  builder.prismaObject("Tweet", {
    fields: (t) => ({
      id: t.exposeID("id"),
      content: t.exposeString("content"),
      mediaUrls: t.exposeStringList("mediaUrls"),
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
      replies: t.relatedConnection("replies", {
        cursor: "id",
        query: () => ({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
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

  builder.queryFields((t) => ({
    tweet: t.prismaField({
      type: "Tweet",
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (query, _root, { id }) =>
        prisma.tweet.findUnique({ ...query, where: { id: String(id) } }),
    }),
    /** Home timeline: your tweets plus tweets from people you follow. */
    homeFeed: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      resolve: (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        return prisma.tweet.findMany({
          ...query,
          where: {
            parentId: null,
            OR: [
              { authorId: me },
              { author: { followers: { some: { followerId: me } } } },
            ],
          },
          orderBy: newestFirst,
        });
      },
    }),
    /** Every top-level tweet, newest first. Works signed out. */
    exploreFeed: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      resolve: (query) =>
        prisma.tweet.findMany({
          ...query,
          where: { parentId: null },
          orderBy: newestFirst,
        }),
    }),
  }));

  const tweetInput = z.object({
    content: z
      .string()
      .trim()
      .min(1, "Tweet can't be empty.")
      .max(280, "Tweets can be up to 280 characters."),
    mediaUrls: z.array(z.url()).max(4).default([]),
    parentId: z.string().optional(),
  });

  builder.mutationFields((t) => ({
    createTweet: t.prismaField({
      type: "Tweet",
      args: {
        content: t.arg.string({ required: true }),
        mediaUrls: t.arg.stringList(),
        parentId: t.arg.id(),
      },
      resolve: async (query, _root, args, ctx) => {
        const authorId = requireUser(ctx);
        const parsed = tweetInput.safeParse({
          content: args.content,
          mediaUrls: args.mediaUrls ?? undefined,
          parentId: args.parentId ? String(args.parentId) : undefined,
        });
        if (!parsed.success) throw badInput(parsed.error.issues[0].message);
        // Replying to a post that was just deleted gives a clear error.
        if (parsed.data.parentId) await requireTweet(parsed.data.parentId);
        return prisma.tweet.create({
          ...query,
          data: { ...parsed.data, authorId },
        });
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
    likeTweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await prisma.like.upsert({
          where: { userId_tweetId: { userId, tweetId } },
          create: { userId, tweetId },
          update: {},
        });
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
        await prisma.retweet.upsert({
          where: { userId_tweetId: { userId, tweetId } },
          create: { userId, tweetId },
          update: {},
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
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: tweetId },
        });
      },
    }),
  }));
}
