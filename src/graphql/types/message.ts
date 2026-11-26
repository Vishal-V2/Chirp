import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badInput, notFound, requireUser } from "../auth";
import type { Builder } from "../builder";
import { assertNotWalled } from "../safety";
import { MESSAGE_MEDIA_BUCKET } from "@/lib/storage";

/** Each pair of users shares one conversation, keyed by their sorted ids. */
const pairKeyFor = (a: string, b: string) => [a, b].sort().join(":");

const messageText = z
  .string()
  .trim()
  .max(1000, "Messages can be up to 1000 characters.");

/** Up to 4 images per message, like chirps. */
const MAX_MESSAGE_IMAGES = 4;

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
      /** Private image paths; the app opens them with short-lived signed links. */
      mediaPaths: t.exposeStringList("mediaPaths"),
      /** Set when the sender unsent it ("This message was deleted"). */
      deletedAt: t.expose("deletedAt", { type: "DateTime", nullable: true }),
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
        resolve: (query, conversation, _args, ctx) =>
          prisma.message.findFirst({
            ...query,
            where: {
              conversationId: conversation.id,
              hiddenFor: { none: { userId: requireUser(ctx) } },
            },
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
              deletedAt: null,
              hiddenFor: { none: { userId: me } },
              ...(lastReadAt && { createdAt: { gt: lastReadAt } }),
            },
          });
        },
      }),
      /** Newest first; the chat view shows them oldest-to-newest. */
      messages: t.relatedConnection("messages", {
        cursor: "id",
        // Leaves out messages you chose "Delete for you" on.
        query: (_args, ctx) => ({
          where: { hiddenFor: { none: { userId: requireUser(ctx) } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
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
            // Chats with a deactivated account are hidden until they return.
            NOT: {
              participants: {
                some: { user: { deactivatedAt: { not: null } } },
              },
            },
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
            deletedAt: null,
            hiddenFor: { none: { userId: ctx.userId } },
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
        await assertNotWalled(me, other, "You can't message this account.");
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
        /** Images already uploaded to message-media/<conversationId>/<you>/. */
        mediaPaths: t.arg.stringList(),
      },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        await requireParticipant(conversationId, me);
        // No messages across a block (the conversation stays readable).
        const other = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: { not: me } },
          select: { userId: true },
        });
        await assertNotWalled(
          me,
          other?.userId,
          "You can't message this account.",
        );
        const parsed = messageText.safeParse(args.content);
        if (!parsed.success) throw badInput(parsed.error.issues[0].message);
        const mediaPaths = args.mediaPaths ?? [];
        if (mediaPaths.length > MAX_MESSAGE_IMAGES) {
          throw badInput(
            `A message can have up to ${MAX_MESSAGE_IMAGES} images.`,
          );
        }
        // Only your own uploads, in this chat's folder (no "..", nothing else).
        const ownFolder = `${conversationId}/${me}/`;
        if (
          mediaPaths.some(
            (p) =>
              !p.startsWith(ownFolder) ||
              !/^[A-Za-z0-9._-]+$/.test(p.slice(ownFolder.length)),
          )
        ) {
          throw badInput("Images must be uploaded through Chirp.");
        }
        if (!parsed.data && mediaPaths.length === 0) {
          throw badInput("A message can't be empty.");
        }

        const now = new Date();
        // The insert is what Supabase Realtime streams to both participants.
        const [message] = await prisma.$transaction([
          prisma.message.create({
            ...query,
            data: {
              conversationId,
              senderId: me,
              content: parsed.data,
              mediaPaths,
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
    /**
     * Unsend one of your messages: its text and images are removed for good
     * and both people see "This message was deleted" (live, via Realtime).
     */
    unsendMessage: t.prismaField({
      type: "Message",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const message = await prisma.message.findUnique({
          where: { id: String(args.id) },
          select: { senderId: true, mediaPaths: true },
        });
        if (!message) throw notFound("This message doesn't exist.");
        if (message.senderId !== me) {
          throw badInput("You can only unsend your own messages.");
        }
        const updated = await prisma.message.update({
          ...query,
          where: { id: String(args.id) },
          data: { deletedAt: new Date(), content: "", mediaPaths: [] },
        });
        // Remove its photos from storage too (best effort).
        if (message.mediaPaths.length > 0 && process.env.SUPABASE_SECRET_KEY) {
          try {
            // Loaded only when needed (it's server-only and full-access).
            const { createAdminClient } = await import("@/lib/supabase/admin");
            await createAdminClient()
              .storage.from(MESSAGE_MEDIA_BUCKET)
              .remove(message.mediaPaths);
          } catch (e) {
            console.error("couldn't remove unsent message images", e);
          }
        }
        return updated;
      },
    }),
    /** "Delete for you": hides a message on your side only. */
    deleteMessageForMe: t.id({
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const me = requireUser(ctx);
        const messageId = String(args.id);
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { conversationId: true },
        });
        if (!message) throw notFound("This message doesn't exist.");
        await requireParticipant(message.conversationId, me);
        await prisma.hiddenMessage.upsert({
          where: { userId_messageId: { userId: me, messageId } },
          create: { userId: me, messageId },
          update: {},
        });
        return messageId;
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
