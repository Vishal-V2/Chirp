import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CHIRP_MEDIA_BUCKET,
  MESSAGE_MEDIA_BUCKET,
  PROFILE_IMAGES_BUCKET,
} from "@/lib/storage";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";

/** Deletes every file directly inside `folder` of `bucket`. */
async function removeFolder(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  folder: string,
) {
  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(folder, { limit: 100 });
    if (error) throw error;
    if (!data?.length) return;
    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(data.map((f) => `${folder}/${f.name}`));
    if (removeError) throw removeError;
    if (data.length < 100) return;
  }
}

/**
 * Daily job (Vercel Cron, see vercel.json): permanently deletes accounts that
 * were deactivated more than 5 days ago, with their photos, chats and login.
 * Vercel calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - DELETE_AFTER_DAYS * 86_400_000);
  const due = await prisma.user.findMany({
    where: { deactivatedAt: { lt: cutoff } },
    select: { id: true },
    take: 50, // plenty per day; the rest go tomorrow
  });

  const admin = createAdminClient();
  const deleted: string[] = [];
  const failed: string[] = [];

  for (const { id } of due) {
    try {
      // 1. Their photos (each person's files live in their own folder).
      for (const bucket of [PROFILE_IMAGES_BUCKET, CHIRP_MEDIA_BUCKET]) {
        await removeFolder(admin, bucket, id);
      }
      // 2. 1-on-1 chats with them are deleted whole (the other person's side
      //    too, so nobody is left talking to no one), with every photo in them.
      //    In groups only their own photos go; the group carries on.
      const chats = await prisma.conversation.findMany({
        where: { participants: { some: { userId: id } } },
        select: { id: true, isGroup: true },
      });
      for (const chat of chats) {
        if (chat.isGroup) {
          await removeFolder(admin, MESSAGE_MEDIA_BUCKET, `${chat.id}/${id}`);
          continue;
        }
        const { data: senders, error } = await admin.storage
          .from(MESSAGE_MEDIA_BUCKET)
          .list(chat.id, { limit: 100 });
        if (error) throw error;
        for (const sender of senders ?? []) {
          await removeFolder(
            admin,
            MESSAGE_MEDIA_BUCKET,
            `${chat.id}/${sender.name}`,
          );
        }
      }
      await prisma.conversation.deleteMany({
        where: { id: { in: chats.filter((c) => !c.isGroup).map((c) => c.id) } },
      });
      // 3. Their login. A database trigger then deletes their profile, which
      //    removes their chirps, likes, follows, notifications and the rest.
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      deleted.push(id);
    } catch (e) {
      console.error("purge failed for", id, e);
      failed.push(id);
    }
  }

  return NextResponse.json({ deleted: deleted.length, failed: failed.length });
}
