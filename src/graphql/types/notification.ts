import { prisma } from "@/lib/prisma";
import { requireUser } from "../auth";
import type { Builder } from "../builder";

export function addNotificationTypes(builder: Builder) {
  const NotificationTypeEnum = builder.enumType("NotificationType", {
    values: ["LIKE", "REPOST", "REPLY", "FOLLOW", "MENTION", "QUOTE"] as const,
  });

  builder.prismaObject("Notification", {
    fields: (t) => ({
      id: t.exposeID("id"),
      type: t.field({ type: NotificationTypeEnum, resolve: (n) => n.type }),
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      actor: t.relation("actor"),
      tweet: t.relation("tweet", { nullable: true }),
      /** Newer than the last time you opened Notifications. */
      isUnread: t.boolean({
        select: { recipient: { select: { notificationsReadAt: true } } },
        resolve: (n) =>
          !n.recipient.notificationsReadAt ||
          n.createdAt > n.recipient.notificationsReadAt,
      }),
    }),
  });

  builder.queryFields((t) => ({
    /** Your notifications, newest first. */
    notifications: t.prismaConnection({
      type: "Notification",
      cursor: "id",
      resolve: (query, _root, _args, ctx) => {
        const me = requireUser(ctx);
        return prisma.notification.findMany({
          ...query,
          where: { recipientId: me },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
      },
    }),
    unreadNotificationCount: t.int({
      resolve: async (_root, _args, ctx) => {
        if (!ctx.userId) return 0;
        const me = await prisma.user.findUnique({
          where: { id: ctx.userId },
          select: { notificationsReadAt: true },
        });
        return prisma.notification.count({
          where: {
            recipientId: ctx.userId,
            ...(me?.notificationsReadAt && {
              createdAt: { gt: me.notificationsReadAt },
            }),
          },
        });
      },
    }),
  }));

  builder.mutationFields((t) => ({
    /** Marks everything as read (when you open Notifications). Returns the new unread count. */
    markNotificationsRead: t.int({
      resolve: async (_root, _args, ctx) => {
        const me = requireUser(ctx);
        await prisma.user.update({
          where: { id: me },
          data: { notificationsReadAt: new Date() },
        });
        return 0;
      },
    }),
  }));
}
