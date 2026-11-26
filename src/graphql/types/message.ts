import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badInput, notFound, requireUser } from "../auth";
import type { Builder } from "../builder";
import { assertNotWalled, isWalled } from "../safety";
import { MESSAGE_MEDIA_BUCKET } from "@/lib/storage";

/** Each pair of users shares one conversation, keyed by their sorted ids. */
const pairKeyFor = (a: string, b: string) => [a, b].sort().join(":");

const messageText = z
  .string()
  .trim()
  .max(1000, "Messages can be up to 1000 characters.");

/** Up to 4 images per message, like chirps. */
const MAX_MESSAGE_IMAGES = 4;

/** Chats that are message requests for `me` (not accepted, not deleted). */
const requestsWhere = (me: string) => ({
  participants: {
    some: { userId: me, acceptedAt: null, requestHiddenAt: null },
  },
  // 1-on-1s with a deactivated account are hidden until they return.
  NOT: {
    isGroup: false,
    participants: { some: { user: { deactivatedAt: { not: null } } } },
  },
  messages: { some: { deletedAt: null } },
});

/** Does `a` follow `b`? */
export async function follows(a: string, b: string) {
  return (
    (await prisma.follow.count({ where: { followerId: a, followingId: b } })) >
    0
  );
}

/**
 * Who can message you:
 *   EVERYONE  - anyone; their messages go straight to your inbox.
 *   FOLLOWING - people you follow go to your inbox; anyone else lands in
 *               Message requests.
 *   NOBODY    - only people you follow; anyone else is refused.
 * A chat you've already accepted keeps working whatever the setting.
 */

/** Does `recipient` take messages from `sender` straight into their inbox? */
export async function goesToInbox(sender: string, recipient: string) {
  const { dmPolicy } = await prisma.user.findUniqueOrThrow({
    where: { id: recipient },
    select: { dmPolicy: true },
  });
  return dmPolicy === "EVERYONE" || (await follows(recipient, sender));
}

/** Throws unless `other`'s setting lets `me` write to them at all. */
export async function assertCanMessage(
  me: string,
  other: string,
  conversationId?: string,
) {
  if (conversationId) {
    const theirs = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: other } },
      select: { acceptedAt: true },
    });
    if (theirs?.acceptedAt) return;
  }
  const target = await prisma.user.findUniqueOrThrow({
    where: { id: other },
    select: { username: true, dmPolicy: true },
  });
  // "No one": only people they follow may start a chat.
  if (target.dmPolicy === "NOBODY" && !(await follows(other, me))) {
    throw badInput(
      `@${target.username} only accepts messages from people they follow.`,
    );
  }
}

/** Throws unless the signed-in user is in this conversation. */
export async function requireParticipant(
  conversationId: string,
  userId: string,
) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { lastReadAt: true, acceptedAt: true, role: true },
  });
  if (!p) throw notFound("This conversation doesn't exist.");
  return p;
}

export function addMessageTypes(builder: Builder) {
  const ParticipantRole = builder.enumType("ParticipantRole", {
    values: ["MEMBER", "ADMIN"] as const,
  });

  /** Someone in a chat. */
  builder.prismaObject("ConversationParticipant", {
    fields: (t) => ({
      user: t.relation("user"),
      role: t.expose("role", { type: ParticipantRole }),
      /**
       * When they last read the chat ("Seen"). Only shared when both you and
       * they have read receipts on; null otherwise.
       */
      seenAt: t.field({
        type: "DateTime",
        nullable: true,
        select: { lastReadAt: true, user: { select: { readReceipts: true } } },
        resolve: async (p, _args, ctx) => {
          if (!ctx.userId || !p.user.readReceipts || !p.lastReadAt) return null;
          const me = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { readReceipts: true },
          });
          return me?.readReceipts ? p.lastReadAt : null;
        },
      }),
    }),
  });

  const DmPolicy = builder.enumType("DmPolicy", {
    values: ["EVERYONE", "FOLLOWING", "NOBODY"] as const,
  });

  builder.prismaObjectFields("User", (t) => ({
    /** Your own "Allow messages from" setting (null on other people). */
    dmPolicy: t.field({
      type: DmPolicy,
      nullable: true,
      resolve: (user, _args, ctx) =>
        user.id === ctx.userId ? user.dmPolicy : null,
    }),
    /** Your own read-receipts setting (null on other people). */
    readReceipts: t.boolean({
      nullable: true,
      resolve: (user, _args, ctx) =>
        user.id === ctx.userId ? user.readReceipts : null,
    }),
    /** Can you message this person (their setting, blocks, existing chat)? */
    canMessage: t.boolean({
      resolve: async (user, _args, ctx) => {
        const me = ctx.userId;
        if (!me || me === user.id) return false;
        if (await isWalled(me, user.id)) return false;
        const chat = await prisma.conversation.findUnique({
          where: { pairKey: pairKeyFor(me, user.id) },
          select: { id: true },
        });
        try {
          await assertCanMessage(me, user.id, chat?.id);
          return true;
        } catch {
          return false;
        }
      },
    }),
  }));

  builder.prismaObject("Message", {
    fields: (t) => ({
      id: t.exposeID("id"),
      content: t.exposeString("content"),
      /** Private image paths; the app opens them with short-lived signed links. */
      mediaPaths: t.exposeStringList("mediaPaths"),
      /** Set when the sender unsent it ("This message was deleted"). */
      deletedAt: t.expose("deletedAt", { type: "DateTime", nullable: true }),
      /** A group event ("Ada added Sam") shown as a note, not a bubble. */
      systemText: t.exposeString("systemText", { nullable: true }),
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
      /** For you, this is a message request you haven't accepted yet. */
      isRequest: t.boolean({
        resolve: async (conversation, _args, ctx) =>
          !(await requireParticipant(conversation.id, requireUser(ctx)))
            .acceptedAt,
      }),
      isGroup: t.exposeBoolean("isGroup"),
      /** Group name (null = show the members' names). */
      name: t.exposeString("name", { nullable: true }),
      /** Group photo path in the private message-media bucket. */
      photoPath: t.exposeString("photoPath", { nullable: true }),
      createdById: t.exposeID("createdById", { nullable: true }),
      /** Everyone in the chat, you included (admins first). */
      participants: t.relation("participants", {
        query: { orderBy: [{ role: "desc" }, { userId: "asc" }] },
      }),
      /** Your role in a group (MEMBER for 1-on-1s). */
      myRole: t.field({
        type: ParticipantRole,
        resolve: async (conversation, _args, ctx) =>
          (await requireParticipant(conversation.id, requireUser(ctx))).role,
      }),
      /** The person you're talking to (null in groups). */
      otherParticipant: t.prismaField({
        type: "User",
        nullable: true,
        resolve: async (query, conversation, _args, ctx) => {
          const me = requireUser(ctx);
          if (conversation.isGroup) return null;
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
              systemText: null,
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
            // Requests you haven't accepted live in messageRequests instead.
            participants: { some: { userId: me, acceptedAt: { not: null } } },
            // Chats with a deactivated account are hidden until they return.
            NOT: {
              isGroup: false,
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
    /** Chats from people you don't follow, waiting for you to accept. */
    messageRequests: t.prismaField({
      type: ["Conversation"],
      resolve: (query, _root, _args, ctx) =>
        prisma.conversation.findMany({
          ...query,
          where: requestsWhere(requireUser(ctx)),
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
    }),
    messageRequestCount: t.int({
      resolve: (_root, _args, ctx) =>
        ctx.userId
          ? prisma.conversation.count({ where: requestsWhere(ctx.userId) })
          : 0,
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
        // Message requests don't count until you accept them.
        const mine = await prisma.conversationParticipant.findMany({
          where: { userId: ctx.userId, acceptedAt: { not: null } },
          select: { conversationId: true, lastReadAt: true },
        });
        if (mine.length === 0) return 0;
        return prisma.message.count({
          where: {
            senderId: { not: ctx.userId },
            deletedAt: null,
            systemText: null,
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
        // An existing chat always opens.
        const existing = await prisma.conversation.findUnique({
          ...query,
          where: { pairKey: pairKeyFor(me, other) },
        });
        if (existing) return existing;
        await assertCanMessage(me, other);
        const now = new Date();
        // Straight to their inbox, or a message request (see goesToInbox).
        const toInbox = await goesToInbox(me, other);
        return prisma.conversation.create({
          ...query,
          data: {
            pairKey: pairKeyFor(me, other),
            participants: {
              create: [
                { userId: me, lastReadAt: now, acceptedAt: now },
                { userId: other, acceptedAt: toInbox ? now : null },
              ],
            },
          },
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
        const mine = await requireParticipant(conversationId, me);
        const { isGroup } = await prisma.conversation.findUniqueOrThrow({
          where: { id: conversationId },
          select: { isGroup: true },
        });
        // 1-on-1s: no messages across a block (the chat stays readable), and
        // message-request rules apply. Groups: just be a member.
        const other = isGroup
          ? null
          : await prisma.conversationParticipant.findFirst({
              where: { conversationId, userId: { not: me } },
              select: { userId: true, acceptedAt: true },
            });
        if (other) {
          await assertNotWalled(
            me,
            other.userId,
            "You can't message this account.",
          );
        }
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

        // They haven't accepted this chat yet: it's a request for them.
        let acceptForThem = false;
        if (other && !other.acceptedAt) {
          if (await goesToInbox(me, other.userId)) {
            acceptForThem = true; // they follow you now, or take everyone
          } else {
            await assertCanMessage(me, other.userId, conversationId);
            const sent = await prisma.message.count({
              where: { conversationId, senderId: me },
            });
            if (sent > 0) {
              const { username } = await prisma.user.findUniqueOrThrow({
                where: { id: other.userId },
                select: { username: true },
              });
              throw badInput(
                `You can send more once @${username} accepts your message request.`,
              );
            }
          }
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
          // Replying to a request accepts it.
          prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId: me } },
            data: {
              lastReadAt: now,
              ...(!mine.acceptedAt && {
                acceptedAt: now,
                requestHiddenAt: null,
              }),
            },
          }),
          ...(acceptForThem && other
            ? [
                prisma.conversationParticipant.update({
                  where: {
                    conversationId_userId: {
                      conversationId,
                      userId: other.userId,
                    },
                  },
                  data: { acceptedAt: now },
                }),
              ]
            : []),
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
    /** Accept a message request: the chat moves to your inbox. */
    acceptMessageRequest: t.prismaField({
      type: "Conversation",
      args: { conversationId: t.arg.id({ required: true }) },
      resolve: async (query, _root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        await requireParticipant(conversationId, me);
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId: me } },
          data: { acceptedAt: new Date(), requestHiddenAt: null },
        });
        return prisma.conversation.findUniqueOrThrow({
          ...query,
          where: { id: conversationId },
        });
      },
    }),
    /** Delete a message request: it's hidden from your requests. */
    deleteMessageRequest: t.id({
      args: { conversationId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const me = requireUser(ctx);
        const conversationId = String(args.conversationId);
        const mine = await requireParticipant(conversationId, me);
        if (mine.acceptedAt) throw badInput("This isn't a message request.");
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId: me } },
          data: { requestHiddenAt: new Date() },
        });
        return conversationId;
      },
    }),
    /** Settings → Who can message you → Read receipts. */
    setReadReceipts: t.prismaField({
      type: "User",
      args: { on: t.arg.boolean({ required: true }) },
      resolve: (query, _root, args, ctx) =>
        prisma.user.update({
          ...query,
          where: { id: requireUser(ctx) },
          data: { readReceipts: args.on },
        }),
    }),
    /** Settings → Privacy and safety → "Allow messages from". */
    setDmPolicy: t.prismaField({
      type: "User",
      args: { policy: t.arg({ type: DmPolicy, required: true }) },
      resolve: (query, _root, args, ctx) =>
        prisma.user.update({
          ...query,
          where: { id: requireUser(ctx) },
          data: { dmPolicy: args.policy },
        }),
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
