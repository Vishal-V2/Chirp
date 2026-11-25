"use client";

import Link from "next/link";
import { useQuery } from "urql";
import { EmptyState } from "@/components/feed/tweet-feed";
import { TrendingHashtagsQuery } from "@/graphql/client/tweets";
import { cn } from "@/lib/utils";

/** The most-used #tags of the last 7 days. `compact` is the sidebar version. */
export function TrendsList({
  first = 10,
  compact = false,
}: {
  first?: number;
  compact?: boolean;
}) {
  const [{ data, error }] = useQuery({
    query: TrendingHashtagsQuery,
    variables: { first },
  });
  const trends = data?.trendingHashtags;

  if (!trends) {
    if (error || compact) return null;
    return (
      <div role="status" aria-label="Loading trends">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2 border-b px-4 py-3" aria-hidden>
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/5 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (trends.length === 0) {
    return compact ? null : (
      <EmptyState
        title="No trends yet"
        body="Add a #hashtag to a chirp. The most-used ones this week show up here."
      />
    );
  }

  return (
    <ol>
      {trends.map((t, i) => (
        <li key={t.tag}>
          <Link
            href={`/hashtag/${encodeURIComponent(t.tag)}`}
            className={cn(
              "flex items-baseline gap-3 transition-colors hover:bg-muted/60",
              compact ? "rounded-2xl px-4 py-2" : "border-b px-4 py-3",
            )}
          >
            {!compact && (
              <span className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                {i + 1}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">#{t.tag}</span>
              <span className="block text-[13px] text-muted-foreground">
                {t.chirpCount} {t.chirpCount === 1 ? "chirp" : "chirps"} this
                week
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Sidebar box: top 5 trends, hidden entirely until there are any. */
export function SidebarTrends() {
  const [{ data }] = useQuery({ query: TrendingHashtagsQuery, variables: { first: 5 } });
  if (!data?.trendingHashtags.length) return null;
  return (
    <section>
      <h2 className="px-4 pb-1 font-heading text-xl font-bold tracking-tight">Trending</h2>
      <TrendsList first={5} compact />
      <Link href="/explore" className="block px-4 pt-1 text-sm text-primary hover:underline">
        See more on Explore
      </Link>
    </section>
  );
}
