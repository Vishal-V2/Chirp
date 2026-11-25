import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badInput, notFound, requireUser } from "../auth";
import type { Builder } from "../builder";

/** Each pair of users shares one conversation, keyed by their sorted ids. */
const pairKeyFor = (a: string, b: string) => [a, b].sort().join(":");

const messageText = z
  .string()
  .trim()
  .min(1, "A message can't be empty.")
  .max(1000, "Messages can be up to 1000 characters.");

/** Throws unless the signed-in user is in this conversation. */
async function requireParticipant(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { lastReadAt: true },
  });
  if (!p) throw notFound("This conversation doesn't exist.");
  return p;
}

export function addMessageTypes(builder: Builder) {
  builder.prismaObject("Message", {
    fields: (t) => ({
      id: t.exposeID("id"),
      content: t.exposeString("content"),
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      conversationId: t.exposeID("conversationId"),
      senderId: t.exposeID("senderId"),
      sender: t.relation("sender"),
    }),
  });

  builder.prismaObject("Conversation", {
    fields: (t) => ({
      id: t.exposeID("id"),
      updatedAt: t.expose("updatedAt", { type: "DateTime" }),
      /** The person you're talking to. */
      otherParticipant: t.prismaField({
        type: "User",
        resolve: async (query, conversation, _args, ctx) => {
          const me = requireUser(ctx);
          const other = await prisma.conversationParticipant.findFirst({
            where: { conversationId: conversation.id, userId: { not: me } },
            select: { userId: true },
          });
          if (!other) throw notFound("This conversation doesn't exist.");
          return prisma.user.findUniqueOrThrow({
            ...query,
            where: { id: other.userId },
          });
        },
      }),
      lastMessage: t.prismaField({
        type: "Message",
        nullable: true,
        resolve: (query, conversation) =>
          prisma.message.findFirst({
            ...query,
            where: { conversationId: conversation.id },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          }),
      }),
      /** Messages from the other person you haven't seen yet. */
      unreadCount: t.int({
        resolve: async (conversation, _args, ctx) => {
          const me = requireUser(ctx);
          const { lastReadAt } = await requireParticipant(conversation.id, me);
          return prisma.message.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: me },
              ...(lastReadAt && { createdAt: { gt: lastReadAt } }),
            },
          });
        },
      }),
      /** Newest first; the chat view shows them oldest-to-newest. */
      messages: t.relatedConnection("messages", {
        cursor: "id",
        query: () => ({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      }),
    }),
  });

  builder.queryFields((t) => ({
    /** Your conversations that have at least one message, most recent first. */
    conversations: t.prismaField({
      type: ["Conversation"],
      resolve: (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        return prisma.conversation.findMany({
          ...query,
          where: {
            participants: { some: { userId: me } },
            messages: { some: {} },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        });
      },
    }),
    conversation: t.prismaField({
      type: "Conversation",
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        return prisma.conversation.findFirst({
          ...query,
          where: {
            id: String(args.id),
            participants: { some: { userId: me } },
          },
        });
      },
    }),
    /** Total unread messages across your conversations (for the nav badge). */
    unreadMessageCount: t.int({
      resolve: async (_root, _args, ctx) => {
        if (!ctx.userId) return 0;
        const mine = await prisma.conversationParticipant.findMany({
          where: { userId: ctx.userId },
          select: { conversationId: true, lastReadAt: true },
        });
        if (mine.length === 0) return 0;
        return prisma.message.count({
          where: {
            senderId: { not: ctx.userId },
            OR: mine.map((p) => ({
              conversationId: p.conversationId,
              ...(p.lastReadAt && { createdAt: { gt: p.lastReadAt } }),
            })),
          },
        });
      },
    }),
  }));

  builder.mutationFields((t) => ({
    /** Opens (or creates) your conversation with someone. */
    startConversation: t.prismaField({
      type: "Conversation",
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const other = String(args.userId);
        if (other === me) throw badInput("You can't message yourself.");
        const exists = await prisma.user.findUnique({
          where: { id: other },
          select: { id: true },
        });
        if (!exists) throw notFound("This account doesn't exist.");
        return prisma.conversation.upsert({
          ...query,
          where: { pairKey: pairKeyFor(me, other) },
          create: {
            pairKey: pairKeyFor(me, other),
            participants: {
              create: [
                { userId: me, lastReadAt: new Date() },
                { userId: other },
              ],
            },
          },
          update: {},
        });
      },
    }),
    sendMessage: t.prismaField({
      type: "Message",
      args: {
        conversationId: t.arg.id({ required: true }),
        content: t.arg.string({ required: true }),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        await requireParticipant(conversationId, me);
        const parsed = messageText.safeParse(args.content);
        if (!parsed.success) throw badInput(parsed.error.issues[0].message);

        const now = new Date();
        // The insert is what Supabase Realtime streams to both participants.
        const [message] = await prisma.$transaction([
          prisma.message.create({
            ...query,
            data: {
              conversationId,
              senderId: me,
              content: parsed.data,
              createdAt: now,
            },
          }),
          prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: now },
          }),
          prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId: me } },
            data: { lastReadAt: now },
          }),
        ]);
        return message;
      },
    }),
    markConversationRead: t.prismaField({
      type: "Conversation",
      args: { conversationId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        await requireParticipant(conversationId, me);
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId: me } },
          data: { lastReadAt: new Date() },
        });
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: conversationId },
        });
      },
    }),
  }));
}
