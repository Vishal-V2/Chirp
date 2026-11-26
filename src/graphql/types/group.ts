import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badInput, notFound, requireUser } from "../auth";
import type { Builder } from "../builder";
import { isWalled } from "../safety";
import { assertCanMessage, goesToInbox, requireParticipant } from "./message";

/** The most people in one group chat, you included. */
export const MAX_GROUP_SIZE = 20;

const groupName = z
  .string()
  .trim()
  .max(50, "Group names can be up to 50 characters.");

/** Display name for system notes ("Ada added Sam"). */
async function nameOf(userId: string) {
  return (
    await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { displayName: true },
    })
  ).displayName;
}

/** Writes a group event note into the chat (streamed live like messages). */
async function systemNote(
  conversationId: string,
  actorId: string,
  text: string,
) {
  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: actorId,
        content: "",
        systemText: text.slice(0, 200),
        createdAt: now,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: now },
    }),
  ]);
}

/** Throws unless this is a group and you're one of its admins. */
async function requireGroupAdmin(conversationId: string, me: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { isGroup: true, createdById: true },
  });
  if (!conversation?.isGroup) throw notFound("This group doesn't exist.");
  const mine = await requireParticipant(conversationId, me);
  if (mine.role !== "ADMIN") {
    throw badInput("Only group admins can do that.");
  }
  return conversation;
}

/**
 * Can `adder` add `userId` to a group? Same rules as messaging them: not
 * across a block, and their "Who can message you" setting applies. Returns
 * whether it goes straight to their inbox (otherwise it's a message request).
 */
async function checkCanAdd(adder: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, deactivatedAt: true },
  });
  if (!user || user.deactivatedAt) {
    throw notFound("One of those accounts doesn't exist.");
  }
  if (await isWalled(adder, userId)) {
    throw badInput(`You can't add @${user.username}.`);
  }
  await assertCanMessage(adder, userId);
  return goesToInbox(adder, userId);
}

const uniqueIds = (ids: (string | number)[], me: string) => [
  ...new Set(ids.map(String).filter((id) => id !== me)),
];

const listNames = (names: string[]) =>
  names.length <= 2
    ? names.join(" and ")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

export function addGroupTypes(builder: Builder) {
  builder.mutationFields((t) => ({
    /** Starts a group chat with 2 to 19 other people. You're its admin. */
    createGroup: t.prismaField({
      type: "Conversation",
      args: {
        userIds: t.arg.idList({ required: true }),
        name: t.arg.string(),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const others = uniqueIds(args.userIds, me);
        if (others.length < 2) {
          throw badInput("Pick at least 2 people for a group.");
        }
        if (others.length + 1 > MAX_GROUP_SIZE) {
          throw badInput(`Groups can have up to ${MAX_GROUP_SIZE} people.`);
        }
        const name = groupName.safeParse(args.name ?? "");
        if (!name.success) throw badInput(name.error.issues[0].message);

        const now = new Date();
        const toInbox = await Promise.all(
          others.map((id) => checkCanAdd(me, id)),
        );
        const group = await prisma.conversation.create({
          data: {
            isGroup: true,
            name: name.data || null,
            createdById: me,
            participants: {
              create: [
                { userId: me, role: "ADMIN", acceptedAt: now, lastReadAt: now },
                ...others.map((userId, i) => ({
                  userId,
                  acceptedAt: toInbox[i] ? now : null,
                })),
              ],
            },
          },
          select: { id: true },
        });
        await systemNote(group.id, me, `${await nameOf(me)} created the group`);
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: group.id },
        });
      },
    }),

    /** Admins: add people (up to 20 in total). */
    addGroupMembers: t.prismaField({
      type: "Conversation",
      args: {
        conversationId: t.arg.id({ required: true }),
        userIds: t.arg.idList({ required: true }),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        await requireGroupAdmin(conversationId, me);
        const existing = new Set(
          (
            await prisma.conversationParticipant.findMany({
              where: { conversationId },
              select: { userId: true },
            })
          ).map((p) => p.userId),
        );
        const adding = uniqueIds(args.userIds, me).filter(
          (id) => !existing.has(id),
        );
        if (adding.length === 0)
          throw badInput("They're already in the group.");
        if (existing.size + adding.length > MAX_GROUP_SIZE) {
          throw badInput(`Groups can have up to ${MAX_GROUP_SIZE} people.`);
        }
        const now = new Date();
        const toInbox = await Promise.all(
          adding.map((id) => checkCanAdd(me, id)),
        );
        await prisma.conversationParticipant.createMany({
          data: adding.map((userId, i) => ({
            conversationId,
            userId,
            acceptedAt: toInbox[i] ? now : null,
          })),
        });
        const names = await Promise.all(adding.map(nameOf));
        await systemNote(
          conversationId,
          me,
          `${await nameOf(me)} added ${listNames(names)}`,
        );
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: conversationId },
        });
      },
    }),

    /** Admins: remove someone. Only the creator can remove other admins. */
    removeGroupMember: t.prismaField({
      type: "Conversation",
      args: {
        conversationId: t.arg.id({ required: true }),
        userId: t.arg.id({ required: true }),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        const userId = String(args.userId);
        const group = await requireGroupAdmin(conversationId, me);
        if (userId === me) throw badInput("Use Leave group instead.");
        if (userId === group.createdById) {
          throw badInput("The group's creator can't be removed.");
        }
        const target = await requireParticipant(conversationId, userId);
        if (target.role === "ADMIN" && me !== group.createdById) {
          throw badInput("Only the group's creator can remove admins.");
        }
        await prisma.conversationParticipant.delete({
          where: { conversationId_userId: { conversationId, userId } },
        });
        await systemNote(
          conversationId,
          me,
          `${await nameOf(me)} removed ${await nameOf(userId)}`,
        );
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: conversationId },
        });
      },
    }),

    /** Admins: make someone an admin; the creator can also take it away. */
    setGroupAdmin: t.prismaField({
      type: "Conversation",
      args: {
        conversationId: t.arg.id({ required: true }),
        userId: t.arg.id({ required: true }),
        admin: t.arg.boolean({ required: true }),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        const userId = String(args.userId);
        const group = await requireGroupAdmin(conversationId, me);
        await requireParticipant(conversationId, userId);
        if (!args.admin && me !== group.createdById) {
          throw badInput("Only the group's creator can remove admins.");
        }
        if (!args.admin && userId === group.createdById) {
          throw badInput("The group's creator is always an admin.");
        }
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { role: args.admin ? "ADMIN" : "MEMBER" },
        });
        await systemNote(
          conversationId,
          me,
          args.admin
            ? `${await nameOf(me)} made ${await nameOf(userId)} an admin`
            : `${await nameOf(userId)} is no longer an admin`,
        );
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: conversationId },
        });
      },
    }),

    /** Admins: rename the group and/or change its photo. */
    updateGroup: t.prismaField({
      type: "Conversation",
      args: {
        conversationId: t.arg.id({ required: true }),
        /** Empty clears it (members' names show instead). */
        name: t.arg.string(),
        /** A photo you uploaded to message-media/<conversationId>/<you>/; "" removes it. */
        photoPath: t.arg.string(),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        await requireGroupAdmin(conversationId, me);
        const data: { name?: string | null; photoPath?: string | null } = {};
        const notes: string[] = [];
        const who = await nameOf(me);
        if (args.name != null) {
          const name = groupName.safeParse(args.name);
          if (!name.success) throw badInput(name.error.issues[0].message);
          data.name = name.data || null;
          notes.push(
            name.data
              ? `${who} renamed the group to “${name.data}”`
              : `${who} removed the group name`,
          );
        }
        if (args.photoPath != null) {
          const own = `${conversationId}/${me}/`;
          if (
            args.photoPath &&
            (!args.photoPath.startsWith(own) ||
              !/^[A-Za-z0-9._-]+$/.test(args.photoPath.slice(own.length)))
          ) {
            throw badInput("Images must be uploaded through Chirp.");
          }
          data.photoPath = args.photoPath || null;
          notes.push(
            args.photoPath
              ? `${who} changed the group photo`
              : `${who} removed the group photo`,
          );
        }
        if (notes.length === 0) throw badInput("Nothing to change.");
        await prisma.conversation.update({
          where: { id: conversationId },
          data,
        });
        for (const note of notes) await systemNote(conversationId, me, note);
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: conversationId },
        });
      },
    }),

    /**
     * Leave a group. If no admin is left, the longest-standing member becomes
     * one; when the last person leaves, the group is deleted.
     */
    leaveGroup: t.id({
      args: { conversationId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { isGroup: true },
        });
        if (!conversation?.isGroup) throw notFound("This group doesn't exist.");
        await requireParticipant(conversationId, me);
        const name = await nameOf(me);
        await prisma.conversationParticipant.delete({
          where: { conversationId_userId: { conversationId, userId: me } },
        });
        const left = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          select: { userId: true, role: true, acceptedAt: true },
          orderBy: { acceptedAt: { sort: "asc", nulls: "last" } },
        });
        if (left.length === 0) {
          await prisma.conversation.delete({ where: { id: conversationId } });
          return conversationId;
        }
        await systemNote(conversationId, me, `${name} left`);
        if (!left.some((p) => p.role === "ADMIN")) {
          await prisma.conversationParticipant.update({
            where: {
              conversationId_userId: { conversationId, userId: left[0].userId },
            },
            data: { role: "ADMIN" },
          });
        }
        return conversationId;
      },
    }),
  }));
}
