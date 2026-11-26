import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHIRP_MEDIA_BUCKET, PROFILE_IMAGES_BUCKET } from "@/lib/storage";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";

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
        for (;;) {
          const { data, error } = await admin.storage
            .from(bucket)
            .list(id, { limit: 100 });
          if (error) throw error;
          if (!data?.length) break;
          const { error: removeError } = await admin.storage
            .from(bucket)
            .remove(data.map((f) => `${id}/${f.name}`));
          if (removeError) throw removeError;
          if (data.length < 100) break;
        }
      }
      // 2. Whole conversations with them (the other person's side too, so
      //    nobody is left with a chat that has no one on the other end).
      await prisma.conversation.deleteMany({
        where: { participants: { some: { userId: id } } },
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
