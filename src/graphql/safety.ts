import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { badInput } from "./auth";

/*
 * Block and mute, in one place.
 *
 * - A block is a wall between two people, whichever of them created it:
 *   neither sees the other's chirps, and they can't reply, quote, like,
 *   repost, follow, notify or message each other.
 * - A mute is one-sided and silent: the muter stops seeing the muted
 *   person's chirps and notifications. Nothing else changes.
 */

/**
 * Deactivated accounts are hidden from everyone (and deleted for good after
 * 5 days unless reactivated); see src/app/actions/account.ts.
 */
export const activeUser: Prisma.UserWhereInput = { deactivatedAt: null };

/** Active users not walled off from `me` by a block in either direction. */
export function notWalledFrom(me: string): Prisma.UserWhereInput {
  return {
    ...activeUser,
    blockedBy: { none: { blockerId: me } }, // I didn't block them
    blocks: { none: { blockedId: me } }, // they didn't block me
  };
}

/** Users whose chirps `me` should see in lists: not blocked either way, not muted. */
export function visibleTo(me: string): Prisma.UserWhereInput {
  return { ...notWalledFrom(me), mutedBy: { none: { muterId: me } } };
}

/** Prisma filter for a chirp's author (signed out: just not deactivated). */
export function visibleAuthor(me: string | null): Prisma.TweetWhereInput {
  return { author: me ? visibleTo(me) : activeUser };
}

/**
 * Raw-SQL version of `visibleTo`, for the hand-written feed queries:
 * true when the user in `column` is visible to `me`.
 */
export function visibleSql(me: string, column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`(
    NOT EXISTS (SELECT 1 FROM "User" du
      WHERE du.id = ${column} AND du."deactivatedAt" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "Block" b
      WHERE (b."blockerId" = ${me}::uuid AND b."blockedId" = ${column})
         OR (b."blockerId" = ${column} AND b."blockedId" = ${me}::uuid))
    AND NOT EXISTS (SELECT 1 FROM "Mute" m
      WHERE m."muterId" = ${me}::uuid AND m."mutedId" = ${column})
  )`;
}

/** Has either person blocked the other? */
export async function isWalled(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const count = await prisma.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
}

/** Refuses the action when there's a block between the two people. */
export async function assertNotWalled(
  me: string,
  other: string | null | undefined,
  message: string,
) {
  if (other && (await isWalled(me, other))) throw badInput(message);
}

/**
 * Should `actorId`'s action notify `recipientId`? Not across a block,
 * and not from someone the recipient muted.
 */
export async function canNotify(actorId: string, recipientId: string) {
  const [walled, muted] = await Promise.all([
    isWalled(actorId, recipientId),
    prisma.mute.count({
      where: { muterId: recipientId, mutedId: actorId },
    }),
  ]);
  return !walled && muted === 0;
}
