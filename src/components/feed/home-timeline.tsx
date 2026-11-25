"use client";

import { useState } from "react";
import { useMutation } from "urql";
import { FeedTabs } from "@/components/layout/feed-tabs";
import { TweetComposer } from "@/components/tweet/tweet-composer";
import { CreateTweetMutation } from "@/graphql/client/tweets";
import type { ViewerProfile } from "@/lib/auth";
import { TweetFeed, type FeedKind } from "./tweet-feed";

const TABS: Record<string, FeedKind> = { "For you": "explore", Following: "following" };

/** Home: tabs, composer and the live feed. */
export function HomeTimeline({
  viewer,
  header,
}: {
  viewer: ViewerProfile;
  /** Rendered above the tabs inside the sticky header (mobile top bar). */
  header?: React.ReactNode;
}) {
  const [kind, setKind] = useState<FeedKind>("explore");
  // Bumped after posting so the feed restarts from the newest post.
  const [version, setVersion] = useState(0);
  const [, createTweet] = useMutation(CreateTweetMutation);

  async function post(content: string) {
    const result = await createTweet({ content });
    if (result.error) {
      return result.error.graphQLErrors[0]?.message ?? "Couldn't post. Please try again.";
    }
    setVersion((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        {header}
        <FeedTabs tabs={Object.keys(TABS)} onChange={(tab) => setKind(TABS[tab])} />
      </div>
      <TweetComposer author={viewer} onPost={post} />
      <TweetFeed key={`${kind}-${version}`} kind={kind} />
    </>
  );
}
