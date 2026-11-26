import { z } from "zod";
import type { Builder } from "../builder";
import { badInput, notFound, requireUser } from "../auth";
import { notify, unnotify } from "../notify";
import {
  activeUser,
  assertNotWalled,
  notWalledFrom,
  visibleAuthor,
  visibleTo,
} from "../safety";
import { loadTimeline } from "../timeline";
import { addTweetTypes, escapeLike } from "./tweet";
import { prisma } from "@/lib/prisma";
import { PROFILE_IMAGES_BUCKET } from "@/lib/storage";
import { bioSchema, displayNameSchema, usernameSchema } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";

/** Is this username used by anyone else (ignoring capitals)? */
async function usernameTakenByOther(username: string, userId: string) {
  const owner = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  return Boolean(owner && owner.id !== userId);
}

export function addUserTypes(
  builder: Builder,
  refs: { Tweet: ReturnType<typeof addTweetTypes> },
) {
  builder.prismaObject("User", {
    fields: (t) => ({
      id: t.exposeID("id"),
      username: t.exposeString("username"),
      displayName: t.exposeString("displayName"),
      bio: t.exposeString("bio", { nullable: true }),
      avatarUrl: t.exposeString("avatarUrl", { nullable: true }),
      bannerUrl: t.exposeString("bannerUrl", { nullable: true }),
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      // Deactivated accounts don't count.
      followerCount: t.relationCount("followers", {
        where: { follower: activeUser },
      }),
      followingCount: t.relationCount("following", {
        where: { following: activeUser },
      }),
      tweetCount: t.relationCount("tweets"),
      /** Top-level posts only (the profile "Posts" tab). */
      // Across a block, a profile's chirps aren't shown at all.
      tweets: t.relatedConnection("tweets", {
        cursor: "id",
        query: (_args, ctx) => ({
          where: {
            parentId: null,
            author: ctx.userId ? notWalledFrom(ctx.userId) : activeUser,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      }),
      /** Chirps and replies with images or GIFs (the profile "Media" tab). */
      media: t.relatedConnection("tweets", {
        cursor: "id",
        query: (_args, ctx) => ({
          where: {
            mediaUrls: { isEmpty: false },
            author: ctx.userId ? notWalledFrom(ctx.userId) : activeUser,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      }),
      /** This user's replies (the profile "Replies" tab). */
      replies: t.relatedConnection("tweets", {
        cursor: "id",
        query: (_args, ctx) => ({
          where: {
            parentId: { not: null },
            author: ctx.userId ? notWalledFrom(ctx.userId) : activeUser,
          },
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
      /** Whether this user follows the signed-in user (the "Follows you" badge). */
      followsViewer: t.boolean({
        select: (_args, ctx) => ({
          following: {
            where: { followingId: ctx.userId ?? undefined },
            select: { followingId: true },
            take: 1,
          },
        }),
        resolve: (user, _args, ctx) =>
          ctx.userId !== null &&
          user.id !== ctx.userId &&
          user.following.length > 0,
      }),
      /**
       * The profile "Chirps" tab: own chirps plus reposts, newest activity first.
       * Repost edges carry `repostedAt`.
       */
      timeline: t.connection(
        {
          type: refs.Tweet,
          resolve: (user, args, ctx) => loadTimeline(user.id, args, ctx.userId),
        },
        { name: "UserTimelineConnection" },
        {
          name: "UserTimelineEdge",
          fields: (te) => ({
            repostedAt: te.field({
              type: "DateTime",
              nullable: true,
              description:
                "Set when this entry is a repost: when it was reposted.",
              resolve: (edge) =>
                (edge as { repostedAt?: Date | null }).repostedAt ?? null,
            }),
            pinned: te.boolean({
              description: "The pinned chirp, shown first on the first page.",
              resolve: (edge) => Boolean((edge as { pinned?: boolean }).pinned),
            }),
          }),
        },
      ),
      /** People who follow this user, most recent first. */
      followers: t.relatedConnection("followers", {
        cursor: "followerId_followingId",
        query: () => ({
          where: { follower: activeUser },
          orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
        }),
      }),
      /** People this user follows, most recent first. */
      following: t.relatedConnection("following", {
        cursor: "followerId_followingId",
        query: () => ({
          where: { following: activeUser },
          orderBy: [{ createdAt: "desc" }, { followingId: "desc" }],
        }),
      }),
    }),
  });

  /** One "A follows B" link; list pages read `follower` or `following` from it. */
  builder.prismaObject("Follow", {
    fields: (t) => ({
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      follower: t.relation("follower"),
      following: t.relation("following"),
    }),
  });

  /** One of your likes: when you liked it, and the chirp. */
  builder.prismaObject("Like", {
    fields: (t) => ({
      likedAt: t.expose("createdAt", { type: "DateTime" }),
      tweet: t.relation("tweet"),
    }),
  });

  const UsernameCheck = builder
    .objectRef<{ available: boolean; message: string | null }>("UsernameCheck")
    .implement({
      fields: (t) => ({
        available: t.exposeBoolean("available"),
        /** Why it can't be used (invalid, reserved or taken). */
        message: t.exposeString("message", { nullable: true }),
      }),
    });

  builder.queryFields((t) => ({
    /** Live check for the username field: is this name free for you to take? */
    usernameAvailable: t.field({
      type: UsernameCheck,
      args: { username: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const me = requireUser(ctx);
        const parsed = usernameSchema.safeParse(
          args.username.replace(/^@/, ""),
        );
        if (!parsed.success)
          return { available: false, message: parsed.error.issues[0].message };
        if (await usernameTakenByOther(parsed.data, me)) {
          return { available: false, message: "That username is taken." };
        }
        return { available: true, message: null };
      },
    }),
    /** Your likes, most recently liked first (not by when the chirp was posted). Private. */
    likedTweets: t.prismaConnection({
      type: "Like",
      cursor: "userId_tweetId",
      resolve: (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        return prisma.like.findMany({
          ...query,
          where: { userId: me, tweet: visibleAuthor(me) },
          orderBy: [{ createdAt: "desc" }, { tweetId: "desc" }],
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
            ...visibleTo(ctx.userId),
          },
          orderBy: [{ followers: { _count: "desc" } }, { createdAt: "asc" }],
          take: Math.min(Math.max(args.first ?? 3, 1), 20),
        });
      },
    }),
    /** People whose name or @username contains the search text, most-followed first. */
    searchUsers: t.prismaField({
      type: ["User"],
      args: { query: t.arg.string({ required: true }) },
      resolve: (query, _root, args) => {
        const raw = args.query.trim().replace(/^@/, "").slice(0, 50);
        if (!raw) throw badInput("Type something to search for.");
        const text = escapeLike(raw);
        return prisma.user.findMany({
          ...query,
          where: {
            ...activeUser,
            OR: [
              { username: { contains: text, mode: "insensitive" } },
              { displayName: { contains: text, mode: "insensitive" } },
            ],
          },
          orderBy: [{ followers: { _count: "desc" } }, { username: "asc" }],
          take: 20,
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
      // A deactivated account reads as "doesn't exist".
      resolve: (query, _root, { username }) =>
        prisma.user.findFirst({
          ...query,
          where: { username, ...activeUser },
        }),
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
      /** Leave out to keep your current username. */
      username: t.string(),
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
            username: usernameSchema.optional(),
            bio: bioSchema.nullable(),
            avatarUrl: ownImageUrl(userId).nullable(),
            bannerUrl: ownImageUrl(userId).nullable(),
          })
          .safeParse({
            displayName: input.displayName,
            username: input.username?.replace(/^@/, "") || undefined,
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

        // New username: nobody else may have it, ignoring capitals.
        // (Changing only the capitals of your own is fine.)
        if (
          parsed.data.username &&
          (await usernameTakenByOther(parsed.data.username, userId))
        ) {
          throw badInput("That username is taken.");
        }

        try {
          return await prisma.user.update({
            ...query,
            where: { id: userId },
            data: parsed.data,
          });
        } catch (e) {
          // Someone took it between our check and the save.
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            throw badInput("That username is taken.");
          }
          throw e;
        }
      },
    }),
    follow: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const target = String(args.userId);
        if (target === me) throw badInput("You can't follow yourself.");
        await assertNotWalled(me, target, "You can't follow this account.");
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
        await notify({ type: "FOLLOW", actorId: me, recipientId: target });
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
        await unnotify({ type: "FOLLOW", actorId: me, recipientId: target });
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: target },
        });
      },
    }),
  }));
}
