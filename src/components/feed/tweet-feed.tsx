"use client";

import { useEffect, useRef, useState } from "react";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useQuery, type AnyVariables } from "urql";
import { TweetCard } from "@/components/tweet/tweet-card";
import type { TweetFieldsFragment } from "@/generated/gql/graphql";

const PAGE_SIZE = 20;

type Connection = {
  edges: { node: TweetFieldsFragment }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type PageVariables = { first: number; after?: string | null };

/**
 * Where a feed's tweets come from: any paginated query whose variables include
 * `first`/`after`, plus how to find the tweet list in its result.
 */
export type FeedSource<Data, Vars extends PageVariables> = {
  query: TypedDocumentNode<Data, Vars>;
  /** Variables other than first/after. */
  variables: Omit<Vars, "first" | "after">;
  select: (data: Data) => Connection | null | undefined;
  empty: { title: string; body: string };
};

/** Helper so TypeScript infers the source's types from its query. */
export function feedSource<Data, Vars extends PageVariables>(
  source: FeedSource<Data, Vars>,
) {
  return source;
}

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
function FeedPage<Data, Vars extends PageVariables>({
  source,
  after,
  isFirst,
  isLast,
  onLoadMore,
}: {
  source: FeedSource<Data, Vars>;
  after: string | null;
  isFirst: boolean;
  isLast: boolean;
  onLoadMore: (cursor: string) => void;
}) {
  const [{ data, fetching, error }, reexecute] = useQuery<Data, AnyVariables>({
    query: source.query,
    variables: { ...source.variables, first: PAGE_SIZE, after },
  });
  const connection = data ? source.select(data) : undefined;

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
    if (data && !fetching) {
      return <EmptyState title={source.empty.title} body={source.empty.body} />;
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
    return <EmptyState title={source.empty.title} body={source.empty.body} />;
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

/** Infinite-scrolling list of tweets from any paginated tweet query. */
export function TweetFeed<Data, Vars extends PageVariables>({
  source,
}: {
  source: FeedSource<Data, Vars>;
}) {
  // Cursor of each loaded page; null = the first page.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);

  return (
    <div>
      {cursors.map((after, i) => (
        <FeedPage
          key={after ?? "first"}
          source={source}
          after={after}
          isFirst={i === 0}
          isLast={i === cursors.length - 1}
          onLoadMore={(cursor) =>
            setCursors((list) =>
              list.includes(cursor) ? list : [...list, cursor],
            )
          }
        />
      ))}
    </div>
  );
}
