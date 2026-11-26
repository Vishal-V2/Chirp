/**
 * One-off: fills Tweet.hashtags for chirps created before hashtags existed,
 * using the same parser the app uses. Safe to run again.
 *
 *   npx tsx scripts/backfill-hashtags.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { extractHashtags } from "../src/lib/rich-text";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

async function main() {
  const tweets = await prisma.tweet.findMany({
    select: { id: true, content: true, hashtags: true },
  });
  let updated = 0;
  for (const t of tweets) {
    const tags = extractHashtags(t.content);
    if (tags.join() !== t.hashtags.join()) {
      await prisma.tweet.update({
        where: { id: t.id },
        data: { hashtags: tags },
      });
      updated++;
    }
  }
  console.log(`Checked ${tweets.length} chirps, updated ${updated}.`);
}

main().finally(() => prisma.$disconnect());
