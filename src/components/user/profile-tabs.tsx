"use client";

import { useState } from "react";
import { TweetFeed, feedSource } from "@/components/feed/tweet-feed";
import { FeedTabs } from "@/components/layout/feed-tabs";
import {
  LikedTweetsQuery,
  UserPostsQuery,
  UserRepliesQuery,
} from "@/graphql/client/users";

type Tab = "Posts" | "Replies" | "Likes";

/** Posts / Replies / Likes (Likes are private, so only on your own profile). */
export function ProfileTabs({
  username,
  isSelf,
}: {
  username: string;
  isSelf: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Posts");
  const tabs: Tab[] = isSelf
    ? ["Posts", "Replies", "Likes"]
    : ["Posts", "Replies"];

  return (
    <>
      <div className="border-b">
        <FeedTabs tabs={tabs} onChange={(t) => setTab(t as Tab)} />
      </div>
      {tab === "Posts" && (
        <TweetFeed
          key={`posts-${username}`}
          source={feedSource({
            query: UserPostsQuery,
            variables: { username },
            select: (d) => d.user?.tweets,
            empty: isSelf
              ? {
                  title: "You haven't posted yet",
                  body: "When you post, it'll show up here.",
                }
              : {
                  title: `@${username} hasn't posted`,
                  body: "When they do, their posts will show up here.",
                },
          })}
        />
      )}
      {tab === "Replies" && (
        <TweetFeed
          key={`replies-${username}`}
          source={feedSource({
            query: UserRepliesQuery,
            variables: { username },
            select: (d) => d.user?.replies,
            empty: {
              title: "No replies yet",
              body: "Replies will show up here.",
            },
          })}
        />
      )}
      {tab === "Likes" && isSelf && (
        <TweetFeed
          key="likes"
          source={feedSource({
            query: LikedTweetsQuery,
            variables: {},
            select: (d) => d.likedTweets,
            empty: {
              title: "You don't have any likes yet",
              body: "Tap the heart on any post to show it some love. Only you can see your likes.",
            },
          })}
        />
      )}
    </>
  );
}
