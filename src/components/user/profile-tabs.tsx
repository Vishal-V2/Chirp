"use client";

import { useState } from "react";
import { TweetFeed, feedSource } from "@/components/feed/tweet-feed";
import { FeedTabs } from "@/components/layout/feed-tabs";
import { TabPanel, nextDirection } from "@/components/motion/tab-panel";
import {
  LikedTweetsQuery,
  UserPostsQuery,
  UserRepliesQuery,
} from "@/graphql/client/users";

type Tab = "Chirps" | "Replies" | "Likes";

/** Posts / Replies / Likes (Likes are private, so only on your own profile). */
export function ProfileTabs({
  username,
  isSelf,
}: {
  username: string;
  isSelf: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Chirps");
  const [direction, setDirection] = useState(0);
  const tabs: Tab[] = isSelf
    ? ["Chirps", "Replies", "Likes"]
    : ["Chirps", "Replies"];

  return (
    <>
      <div className="border-b">
        <FeedTabs
          tabs={tabs}
          onChange={(t) => {
            setDirection(nextDirection(tabs, tab, t as Tab));
            setTab(t as Tab);
          }}
        />
      </div>
      <TabPanel key={tab} direction={direction}>
        {tab === "Chirps" && (
          <TweetFeed
            key={`posts-${username}`}
            source={feedSource({
              query: UserPostsQuery,
              variables: { username },
              select: (d) => d.user?.tweets,
              empty: isSelf
                ? {
                    title: "No chirps yet",
                    body: "Your chirps will show up here.",
                  }
                : {
                    title: `@${username} hasn't chirped yet`,
                    body: "When they do, their chirps show up here.",
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
                body: "Tap the heart on any chirp to save it here. Only you can see your likes.",
              },
            })}
          />
        )}
      </TabPanel>
    </>
  );
}
