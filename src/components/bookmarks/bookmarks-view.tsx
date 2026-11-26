"use client";

import { TweetFeed, feedSource } from "@/components/feed/tweet-feed";
import { PageHeader } from "@/components/layout/page-header";
import { useViewer } from "@/components/providers/viewer-provider";
import { BookmarksQuery } from "@/graphql/client/tweets";

const source = feedSource({
  query: BookmarksQuery,
  variables: {},
  select: (d) => ({
    ...d.bookmarks,
    edges: d.bookmarks.edges.map((e) => ({ node: e.node.tweet })),
  }),
  empty: {
    title: "Save chirps for later",
    body: "Tap the bookmark on any chirp to keep it here. Only you can see your bookmarks.",
  },
});

/** Your saved chirps, most recently saved first. */
export function BookmarksView() {
  const viewer = useViewer();
  return (
    <>
      <PageHeader
        title="Bookmarks"
        subtitle={viewer ? `@${viewer.username}` : undefined}
      />
      <TweetFeed source={source} />
    </>
  );
}
