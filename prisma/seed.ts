/**
 * Dev seed: loads the same sample users, tweets and replies the UI was built with.
 * WARNING: wipes all Chirp tables first. Never run against production.
 *
 *   npx prisma db seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { currentUser, tweets, users, type MockUser } from "../src/lib/mock-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const allUsers: MockUser[] = [currentUser, ...Object.values(users)];

// Stable UUIDs so re-seeding gives the same ids (User.id must be a UUID,
// matching Supabase Auth user ids).
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = new Map(allUsers.map((u, i) => [u.id, uuid(i + 1)]));
const idOf = (u: MockUser) => userId.get(u.id)!;

/** Small deterministic "random" so seeded likes/follows are the same every run. */
function pick(seed: string, chance: number) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h % 100) < chance * 100;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed production.");

  console.log("Clearing tables…");
  await prisma.$transaction([
    prisma.like.deleteMany(),
    prisma.retweet.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.tweet.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log(`Creating ${allUsers.length} users…`);
  await prisma.user.createMany({
    data: allUsers.map((u) => ({
      id: idOf(u),
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      bannerUrl: u.bannerUrl,
      createdAt: new Date(u.createdAt),
    })),
  });

  // Parents must exist before replies, so insert oldest first.
  const ordered = [...tweets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  console.log(`Creating ${ordered.length} tweets and replies…`);
  for (const t of ordered) {
    await prisma.tweet.create({
      data: {
        id: t.id,
        content: t.content,
        createdAt: new Date(t.createdAt),
        authorId: idOf(t.author),
        parentId: t.parent?.id,
      },
    });
  }

  // Follows: "you" follows whoever the mock data says; others follow each
  // other with a fixed pattern so follower counts aren't all zero.
  const follows: { followerId: string; followingId: string }[] = [];
  for (const target of allUsers) {
    if (target.viewerIsFollowing) {
      follows.push({ followerId: idOf(currentUser), followingId: idOf(target) });
    }
    for (const follower of allUsers) {
      if (follower === currentUser || follower === target) continue;
      if (pick(follower.id + target.id, 0.6)) {
        follows.push({ followerId: idOf(follower), followingId: idOf(target) });
      }
    }
  }
  await prisma.follow.createMany({ data: follows, skipDuplicates: true });

  // Likes/reposts: "you" per the mock flags, plus some from other users.
  const likes: { userId: string; tweetId: string }[] = [];
  const retweets: { userId: string; tweetId: string }[] = [];
  for (const t of tweets) {
    if (t.viewerHasLiked) likes.push({ userId: idOf(currentUser), tweetId: t.id });
    if (t.viewerHasRetweeted) retweets.push({ userId: idOf(currentUser), tweetId: t.id });
    for (const u of allUsers) {
      if (u === currentUser || u.id === t.author.id) continue;
      if (pick(u.id + t.id, 0.5)) likes.push({ userId: idOf(u), tweetId: t.id });
      if (pick(t.id + u.id, 0.2)) retweets.push({ userId: idOf(u), tweetId: t.id });
    }
  }
  await prisma.like.createMany({ data: likes, skipDuplicates: true });
  await prisma.retweet.createMany({ data: retweets, skipDuplicates: true });

  console.log(
    `Done: ${allUsers.length} users, ${ordered.length} tweets, ${follows.length} follows, ` +
      `${likes.length} likes, ${retweets.length} reposts.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
