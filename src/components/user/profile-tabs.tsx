"use client";

import { useState } from "react";
import { FeedTabs } from "@/components/layout/feed-tabs";
import { TweetCard } from "@/components/tweet/tweet-card";
import type { MockTweet } from "@/lib/mock-data";

type Tab = "Posts" | "Replies" | "Likes";

export function ProfileTabs({
  username,
  isSelf,
  posts,
  replies,
  likes,
}: {
  username: string;
  isSelf: boolean;
  posts: MockTweet[];
  replies: MockTweet[];
  likes: MockTweet[];
}) {
  const [tab, setTab] = useState<Tab>("Posts");
  const tabs: Tab[] = isSelf ? ["Posts", "Replies", "Likes"] : ["Posts", "Replies"];

  const content: Record<Tab, { items: MockTweet[]; empty: [string, string] }> = {
    Posts: {
      items: posts,
      empty: isSelf
        ? ["You haven't posted yet", "When you post, it'll show up here."]
        : [`@${username} hasn't posted`, "When they do, their posts will show up here."],
    },
    Replies: {
      items: replies,
      empty: ["No replies yet", "Replies will show up here."],
    },
    Likes: {
      items: likes,
      empty: ["You don't have any likes yet", "Tap the heart on any post to show it some love."],
    },
  };
  const { items, empty } = content[tab];

  return (
    <>
      <div className="border-b">
        <FeedTabs tabs={tabs} onChange={(t) => setTab(t as Tab)} />
      </div>
      {items.length > 0 ? (
        items.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
      ) : (
        <div className="mx-auto max-w-sm px-8 py-12">
          <p className="text-3xl font-extrabold">{empty[0]}</p>
          <p className="mt-2 text-muted-foreground">{empty[1]}</p>
        </div>
      )}
    </>
  );
}
