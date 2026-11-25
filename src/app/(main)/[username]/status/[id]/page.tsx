import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TweetThread } from "@/components/tweet/tweet-thread";
import { prisma } from "@/lib/prisma";

/** Just enough to 404, fix the URL, and title the page. The thread itself loads via GraphQL. */
const findTweet = cache((id: string) =>
  prisma.tweet.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      author: { select: { username: true, displayName: true } },
    },
  }),
);

export async function generateMetadata(
  props: PageProps<"/[username]/status/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const tweet = await findTweet(id);
  if (!tweet) return { title: "Chirp" };
  const snippet =
    tweet.content.length > 60
      ? `${tweet.content.slice(0, 60)}…`
      : tweet.content;
  return { title: `${tweet.author.displayName} on Chirp: "${snippet}"` };
}

export default async function TweetPage(
  props: PageProps<"/[username]/status/[id]">,
) {
  const { username, id } = await props.params;
  const tweet = await findTweet(id);
  if (!tweet) notFound();

  // Wrong username in the URL (e.g. after a rename): send to the canonical one.
  if (
    decodeURIComponent(username).toLowerCase() !==
    tweet.author.username.toLowerCase()
  ) {
    redirect(`/${tweet.author.username}/status/${tweet.id}`);
  }

  return (
    <>
      <PageHeader back title="Chirp" />
      {/* key: start fresh (scroll, "show more") when moving between tweets */}
      <TweetThread key={tweet.id} tweetId={tweet.id} />
    </>
  );
}
