"use client";

import { TweetFeed, feedSource } from "@/components/feed/tweet-feed";
import { PageHeader } from "@/components/layout/page-header";
import { HashtagTweetsQuery } from "@/graphql/client/tweets";

/** Every chirp with a #tag, newest first. */
export function HashtagView({ tag }: { tag: string }) {
  return (
    <>
      <PageHeader back title={`#${tag}`} />
      <TweetFeed
        key={tag}
        source={feedSource({
          query: HashtagTweetsQuery,
          variables: { tag },
          select: (d) => d.hashtagTweets,
          empty: {
            title: `No chirps with #${tag} yet`,
            body: "Use it in a chirp and it'll show up here.",
          },
        })}
      />
    </>
  );
}
