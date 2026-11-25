import { z } from "zod";
import type { Builder } from "../builder";
import { badInput, notFound, requireUser } from "../auth";
import { prisma } from "@/lib/prisma";
import { PROFILE_IMAGES_BUCKET } from "@/lib/storage";
import { bioSchema, displayNameSchema } from "@/lib/validation";

export function addUserTypes(builder: Builder) {
  builder.prismaObject("User", {
    fields: (t) => ({
      id: t.exposeID("id"),
      username: t.exposeString("username"),
      displayName: t.exposeString("displayName"),
      bio: t.exposeString("bio", { nullable: true }),
      avatarUrl: t.exposeString("avatarUrl", { nullable: true }),
      bannerUrl: t.exposeString("bannerUrl", { nullable: true }),
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      followerCount: t.relationCount("followers"),
      followingCount: t.relationCount("following"),
      tweetCount: t.relationCount("tweets"),
      /** Top-level posts only (the profile "Posts" tab). */
      tweets: t.relatedConnection("tweets", {
        cursor: "id",
        query: () => ({
          where: { parentId: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      }),
      /** This user's replies (the profile "Replies" tab). */
      replies: t.relatedConnection("tweets", {
        cursor: "id",
        query: () => ({
          where: { parentId: { not: null } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      }),
      viewerIsFollowing: t.boolean({
        select: (_args, ctx) => ({
          followers: {
            where: { followerId: ctx.userId ?? undefined },
            select: { followerId: true },
            take: 1,
          },
        }),
        resolve: (user, _args, ctx) =>
          ctx.userId !== null && user.followers.length > 0,
      }),
    }),
  });

  builder.queryFields((t) => ({
    /** Tweets the signed-in user has liked, most recently liked first. Private to them. */
    likedTweets: t.prismaConnection({
      type: "Tweet",
      cursor: "id",
      resolve: (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        return prisma.tweet.findMany({
          ...query,
          where: { likes: { some: { userId: me } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
      },
    }),
    /** A few accounts the signed-in user doesn't follow yet, most-followed first. */
    whoToFollow: t.prismaField({
      type: ["User"],
      args: { first: t.arg.int({ defaultValue: 3 }) },
      resolve: (query, _root, args, ctx) => {
        if (!ctx.userId) return [];
        return prisma.user.findMany({
          ...query,
          where: {
            id: { not: ctx.userId },
            followers: { none: { followerId: ctx.userId } },
          },
          orderBy: [{ followers: { _count: "desc" } }, { createdAt: "asc" }],
          take: Math.min(Math.max(args.first ?? 3, 1), 10),
        });
      },
    }),
    me: t.prismaField({
      type: "User",
      nullable: true,
      resolve: (query, _root, _args, ctx) =>
        ctx.userId
          ? prisma.user.findUnique({ ...query, where: { id: ctx.userId } })
          : null,
    }),
    user: t.prismaField({
      type: "User",
      nullable: true,
      args: { username: t.arg.string({ required: true }) },
      resolve: (query, _root, { username }) =>
        prisma.user.findUnique({ ...query, where: { username } }),
    }),
  }));

  /**
   * Profile images must live in this user's own folder in our Supabase Storage
   * bucket, so nobody can point their avatar at arbitrary external URLs.
   */
  const ownImageUrl = (userId: string) =>
    z
      .url()
      .refine(
        (url) =>
          url.startsWith(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")}/storage/v1/object/public/${PROFILE_IMAGES_BUCKET}/${userId}/`,
          ),
        "Images must be uploaded through Chirp.",
      );

  const UpdateProfileInput = builder.inputType("UpdateProfileInput", {
    fields: (t) => ({
      displayName: t.string({ required: true }),
      /** Empty or null clears it. */
      bio: t.string(),
      /** null removes the image. */
      avatarUrl: t.string(),
      bannerUrl: t.string(),
    }),
  });

  builder.mutationFields((t) => ({
    /** Edit the signed-in user's profile. Every field is replaced (null clears). */
    updateProfile: t.prismaField({
      type: "User",
      args: { input: t.arg({ type: UpdateProfileInput, required: true }) },
      resolve: async (query, _root, { input }, ctx) => {
        const userId = requireUser(ctx);
        const parsed = z
          .object({
            displayName: displayNameSchema,
            bio: bioSchema.nullable(),
            avatarUrl: ownImageUrl(userId).nullable(),
            bannerUrl: ownImageUrl(userId).nullable(),
          })
          .safeParse({
            displayName: input.displayName,
            bio: input.bio?.trim() ? input.bio : null,
            avatarUrl: input.avatarUrl ?? null,
            bannerUrl: input.bannerUrl ?? null,
          });
        if (!parsed.success) throw badInput(parsed.error.issues[0].message);

        const exists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!exists) throw badInput("Finish setting up your profile first.");

        return prisma.user.update({
          ...query,
          where: { id: userId },
          data: parsed.data,
        });
      },
    }),
    follow: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const target = String(args.userId);
        if (target === me) throw badInput("You can't follow yourself.");
        const exists = await prisma.user.findUnique({
          where: { id: target },
          select: { id: true },
        });
        if (!exists) throw notFound("This account doesn't exist.");
        await prisma.follow.upsert({
          where: {
            followerId_followingId: { followerId: me, followingId: target },
          },
          create: { followerId: me, followingId: target },
          update: {},
        });
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: target },
        });
      },
    }),
    unfollow: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const target = String(args.userId);
        await prisma.follow.deleteMany({
          where: { followerId: me, followingId: target },
        });
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: target },
        });
      },
    }),
  }));
}
