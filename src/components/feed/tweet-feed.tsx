"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "urql";
import { TweetCard } from "@/components/tweet/tweet-card";
import { ExploreFeedQuery, HomeFeedQuery } from "@/graphql/client/tweets";

const PAGE_SIZE = 20;

export type FeedKind = "explore" | "following";

function TweetSkeleton() {
  return (
    <div className="flex gap-3 border-b px-4 py-3" aria-hidden>
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-sm px-8 py-12">
      <p className="text-3xl font-extrabold">{title}</p>
      <p className="mt-2 text-muted-foreground">{body}</p>
    </div>
  );
}

/** Calls `onVisible` when scrolled near (600px before it enters the screen). */
function LoadMoreTrigger({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);
  useEffect(() => {
    callback.current = onVisible;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && callback.current(),
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="h-px" />;
}

/** One page of the feed. The next page renders after it when you scroll down. */
function FeedPage({
  kind,
  after,
  isFirst,
  isLast,
  onLoadMore,
}: {
  kind: FeedKind;
  after: string | null;
  isFirst: boolean;
  isLast: boolean;
  onLoadMore: (cursor: string) => void;
}) {
  // One typed query per feed; the one not in use is paused.
  const variables = { first: PAGE_SIZE, after };
  const [home, reexecuteHome] = useQuery({
    query: HomeFeedQuery,
    variables,
    pause: kind !== "following",
  });
  const [explore, reexecuteExplore] = useQuery({
    query: ExploreFeedQuery,
    variables,
    pause: kind !== "explore",
  });
  const { fetching, error } = kind === "following" ? home : explore;
  const reexecute = kind === "following" ? reexecuteHome : reexecuteExplore;
  const connection =
    kind === "following" ? home.data?.homeFeed : explore.data?.exploreFeed;

  if (!connection) {
    if (error) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">Couldn&apos;t load posts.</p>
          <button
            type="button"
            onClick={() => reexecute({ requestPolicy: "network-only" })}
            className="mt-3 h-9 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      );
    }
    return (
      <div role="status" aria-label="Loading posts">
        {Array.from({ length: isFirst ? 5 : 2 }, (_, i) => (
          <TweetSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isFirst && connection.edges.length === 0) {
    return kind === "following" ? (
      <EmptyState
        title="Welcome to Chirp!"
        body="Posts from you and the people you follow show up here. Post something, or follow a few people from “Who to follow”."
      />
    ) : (
      <EmptyState title="No posts yet" body="Be the first to post something." />
    );
  }

  const { hasNextPage, endCursor } = connection.pageInfo;

  return (
    <>
      {connection.edges.map(({ node }) => (
        <TweetCard key={node.id} tweet={node} />
      ))}
      {isLast && hasNextPage && endCursor && !fetching && (
        <LoadMoreTrigger onVisible={() => onLoadMore(endCursor)} />
      )}
    </>
  );
}

/** Infinite-scrolling list of tweets from the GraphQL API. */
export function TweetFeed({ kind }: { kind: FeedKind }) {
  // Cursor of each loaded page; null = the first page.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);

  return (
    <div>
      {cursors.map((after, i) => (
        <FeedPage
          key={after ?? "first"}
          kind={kind}
          after={after}
          isFirst={i === 0}
          isLast={i === cursors.length - 1}
          onLoadMore={(cursor) =>
            setCursors((list) => (list.includes(cursor) ? list : [...list, cursor]))
          }
        />
      ))}
    </div>
  );
}
