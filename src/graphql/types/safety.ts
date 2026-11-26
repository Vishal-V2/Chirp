import { prisma } from "@/lib/prisma";
import { badInput, notFound, requireUser } from "../auth";
import type { Builder } from "../builder";

/** Block and mute: flags on User, your lists, and the actions. See ../safety.ts. */
export function addSafetyTypes(builder: Builder) {
  builder.prismaObjectFields("User", (t) => ({
    /** You blocked this person. */
    viewerHasBlocked: t.boolean({
      select: (_args, ctx) => ({
        blockedBy: {
          where: { blockerId: ctx.userId ?? undefined },
          select: { blockerId: true },
          take: 1,
        },
      }),
      resolve: (user, _args, ctx) =>
        ctx.userId !== null && user.blockedBy.length > 0,
    }),
    /** This person blocked you. */
    blocksViewer: t.boolean({
      select: (_args, ctx) => ({
        blocks: {
          where: { blockedId: ctx.userId ?? undefined },
          select: { blockedId: true },
          take: 1,
        },
      }),
      resolve: (user, _args, ctx) =>
        ctx.userId !== null && user.blocks.length > 0,
    }),
    /** You muted this person (they can't tell). */
    viewerHasMuted: t.boolean({
      select: (_args, ctx) => ({
        mutedBy: {
          where: { muterId: ctx.userId ?? undefined },
          select: { muterId: true },
          take: 1,
        },
      }),
      resolve: (user, _args, ctx) =>
        ctx.userId !== null && user.mutedBy.length > 0,
    }),
  }));

  builder.queryFields((t) => ({
    /** People you blocked, most recent first. Private. */
    blockedAccounts: t.prismaField({
      type: ["User"],
      resolve: async (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        const rows = await prisma.block.findMany({
          where: { blockerId: me },
          orderBy: { createdAt: "desc" },
          select: { blocked: query },
        });
        return rows.map((r) => r.blocked);
      },
    }),
    /** People you muted, most recent first. Private. */
    mutedAccounts: t.prismaField({
      type: ["User"],
      resolve: async (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        const rows = await prisma.mute.findMany({
          where: { muterId: me },
          orderBy: { createdAt: "desc" },
          select: { muted: query },
        });
        return rows.map((r) => r.muted);
      },
    }),
  }));

  /** Checks the target exists and isn't you. */
  async function target(me: string, userId: string, verb: string) {
    if (userId === me) throw badInput(`You can't ${verb} yourself.`);
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw notFound("This account doesn't exist.");
  }

  builder.mutationFields((t) => ({
    /**
     * Blocks someone: removes follows both ways and their notifications to
     * you, and from then on stops every interaction between you.
     */
    block: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const other = String(args.userId);
        await target(me, other, "block");
        await prisma.$transaction([
          prisma.block.upsert({
            where: {
              blockerId_blockedId: { blockerId: me, blockedId: other },
            },
            create: { blockerId: me, blockedId: other },
            update: {},
          }),
          prisma.follow.deleteMany({
            where: {
              OR: [
                { followerId: me, followingId: other },
                { followerId: other, followingId: me },
              ],
            },
          }),
          prisma.notification.deleteMany({
            where: {
              OR: [
                { actorId: other, recipientId: me },
                { actorId: me, recipientId: other },
              ],
            },
          }),
        ]);
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: other },
        });
      },
    }),
    unblock: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const other = String(args.userId);
        await prisma.block.deleteMany({
          where: { blockerId: me, blockedId: other },
        });
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: other },
        });
      },
    }),
    /** Quietly hides someone's chirps and notifications from you. */
    mute: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const other = String(args.userId);
        await target(me, other, "mute");
        await prisma.mute.upsert({
          where: { muterId_mutedId: { muterId: me, mutedId: other } },
          create: { muterId: me, mutedId: other },
          update: {},
        });
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: other },
        });
      },
    }),
    unmute: t.prismaField({
      type: "User",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const other = String(args.userId);
        await prisma.mute.deleteMany({
          where: { muterId: me, mutedId: other },
        });
        return prisma.user.findUniqueOrThrow({
          ...query,
          where: { id: other },
        });
      },
    }),
  }));
}
