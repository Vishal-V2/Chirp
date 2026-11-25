import { prisma } from "@/lib/prisma";
import { requireUser } from "../auth";
import type { Builder } from "../builder";
import { requireTweet } from "./tweet";

/** Bookmarks: private saves. Only you can see yours; nobody is notified. */
export function addBookmarkTypes(builder: Builder) {
  builder.prismaObject("Bookmark", {
    fields: (t) => ({
      savedAt: t.expose("createdAt", { type: "DateTime" }),
      tweet: t.relation("tweet"),
    }),
  });

  builder.prismaObjectField("Tweet", "viewerHasBookmarked", (t) =>
    t.boolean({
      select: (_args, ctx) => ({
        bookmarks: {
          where: { userId: ctx.userId ?? undefined },
          select: { userId: true },
          take: 1,
        },
      }),
      resolve: (tweet, _args, ctx) =>
        ctx.userId !== null && tweet.bookmarks.length > 0,
    }),
  );

  builder.queryFields((t) => ({
    /** Your bookmarks, most recently saved first. */
    bookmarks: t.prismaConnection({
      type: "Bookmark",
      cursor: "userId_tweetId",
      resolve: (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        return prisma.bookmark.findMany({
          ...query,
          where: { userId: me },
          orderBy: [{ createdAt: "desc" }, { tweetId: "desc" }],
        });
      },
    }),
  }));

  builder.mutationFields((t) => ({
    bookmarkTweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await prisma.bookmark.upsert({
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
    unbookmarkTweet: t.prismaField({
      type: "Tweet",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const userId = requireUser(ctx);
        const tweetId = String(args.id);
        await requireTweet(tweetId);
        await prisma.bookmark.deleteMany({ where: { userId, tweetId } });
        return prisma.tweet.findUniqueOrThrow({
          ...query,
          where: { id: tweetId },
        });
      },
    }),
  }));
}
