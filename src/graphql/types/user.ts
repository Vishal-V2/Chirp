import { z } from "zod";
import type { Builder } from "../builder";
import { badInput, requireUser } from "../auth";
import { prisma } from "@/lib/prisma";
import { bioSchema, displayNameSchema, usernameSchema } from "@/lib/validation";

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

  const profileInput = z.object({
    username: usernameSchema,
    displayName: displayNameSchema,
    bio: bioSchema.optional(),
    avatarUrl: z.url().optional(),
    bannerUrl: z.url().optional(),
  });

  const ProfileInput = builder.inputType("ProfileInput", {
    fields: (t) => ({
      username: t.string({ required: true }),
      displayName: t.string({ required: true }),
      bio: t.string(),
      avatarUrl: t.string(),
      bannerUrl: t.string(),
    }),
  });

  builder.mutationFields((t) => ({
    /** Create or update the signed-in user's profile (used for onboarding too). */
    upsertProfile: t.prismaField({
      type: "User",
      args: { input: t.arg({ type: ProfileInput, required: true }) },
      resolve: async (query, _root, { input }, ctx) => {
        const userId = requireUser(ctx);
        const parsed = profileInput.safeParse({
          ...input,
          bio: input.bio ?? undefined,
          avatarUrl: input.avatarUrl ?? undefined,
          bannerUrl: input.bannerUrl ?? undefined,
        });
        if (!parsed.success) throw badInput(parsed.error.issues[0].message);

        const taken = await prisma.user.findFirst({
          where: {
            username: { equals: parsed.data.username, mode: "insensitive" },
          },
          select: { id: true },
        });
        if (taken && taken.id !== userId) throw badInput("Username is taken.");

        return prisma.user.upsert({
          ...query,
          where: { id: userId },
          create: { id: userId, ...parsed.data },
          update: parsed.data,
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
