"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "urql";
import { TabPanel, nextDirection } from "@/components/motion/tab-panel";
import { FeedTabs } from "@/components/layout/feed-tabs";
import {
  TweetComposer,
  type ChirpExtras,
} from "@/components/tweet/tweet-composer";
import {
  CreateTweetMutation,
  ExploreFeedQuery,
  HomeFeedQuery,
} from "@/graphql/client/tweets";
import type { ViewerProfile } from "@/lib/auth";
import { TweetFeed, feedSource } from "./tweet-feed";

const COMPOSER_ID = "compose";

type FeedKind = "explore" | "following";
const TABS: Record<string, FeedKind> = {
  "For you": "explore",
  Following: "following",
};

const SOURCES = {
  explore: feedSource({
    query: ExploreFeedQuery,
    variables: {},
    select: (d) => d.exploreFeed,
    empty: { title: "Nothing here yet", body: "Write the first chirp." },
  }),
  following: feedSource({
    query: HomeFeedQuery,
    variables: {},
    select: (d) => d.homeFeed,
    empty: {
      title: "Welcome to Chirp!",
      body: "Chirps from you and the people you follow land here. Follow a few people from “Who to follow” to fill it up.",
    },
  }),
};

/** Home: tabs, composer and the live feed. */
export function HomeTimeline({
  viewer,
  header,
  focusComposer = false,
}: {
  viewer: ViewerProfile;
  /** Arrived from a "Chirp" button: put the cursor in the composer. */
  focusComposer?: boolean;
  /** Rendered above the tabs inside the sticky header (mobile top bar). */
  header?: React.ReactNode;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<FeedKind>("explore");
  const [direction, setDirection] = useState(0);
  // Bumped after posting so the feed restarts from the newest post.
  const [version, setVersion] = useState(0);
  const [, createTweet] = useMutation(CreateTweetMutation);

  useEffect(() => {
    if (!focusComposer) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById(COMPOSER_ID)?.focus();
    router.replace("/", { scroll: false }); // tidy the URL
  }, [focusComposer, router]);

  async function post(content: string, extras: ChirpExtras) {
    const result = await createTweet({ content, ...extras });
    if (result.error) {
      return (
        result.error.graphQLErrors[0]?.message ??
        "Couldn't send your chirp. Try again."
      );
    }
    setVersion((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const created = result.data?.createTweet;
    toast.success("Chirped", {
      action: created
        ? {
            label: "View",
            onClick: () =>
              router.push(`/${created.author.username}/status/${created.id}`),
          }
        : undefined,
    });
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        {header}
        <FeedTabs
          tabs={Object.keys(TABS)}
          onChange={(tab) => {
            const next = TABS[tab];
            setDirection(nextDirection(Object.values(TABS), kind, next));
            setKind(next);
          }}
        />
      </div>
      <TweetComposer author={viewer} onPost={post} textareaId={COMPOSER_ID} />
      <TabPanel key={kind} direction={direction}>
        {kind === "explore" ? (
          <TweetFeed key={`explore-${version}`} source={SOURCES.explore} />
        ) : (
          <TweetFeed key={`following-${version}`} source={SOURCES.following} />
        )}
      </TabPanel>
    </>
  );
}
