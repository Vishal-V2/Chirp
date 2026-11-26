"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy } from "lucide-react";
import { useQuery } from "urql";
import { EmptyState, LoadMoreTrigger } from "@/components/feed/tweet-feed";
import { UserMediaQuery } from "@/graphql/client/users";

const PAGE_SIZE = 24;

/** The profile Media tab: a grid of chirps with images, newest first. */
export function MediaGrid({
  username,
  isSelf,
}: {
  username: string;
  isSelf: boolean;
}) {
  // Cursor of each loaded page; null = the first page.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {cursors.map((after, i) => (
        <MediaPage
          key={after ?? "first"}
          username={username}
          isSelf={isSelf}
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

function MediaPage({
  username,
  isSelf,
  after,
  isFirst,
  isLast,
  onLoadMore,
}: {
  username: string;
  isSelf: boolean;
  after: string | null;
  isFirst: boolean;
  isLast: boolean;
  onLoadMore: (cursor: string) => void;
}) {
  const [{ data, fetching, error }, reexecute] = useQuery({
    query: UserMediaQuery,
    variables: { username, first: PAGE_SIZE, after },
  });
  const connection = data?.user?.media;

  if (!connection) {
    if (error) {
      return (
        <div className="col-span-3 px-4 py-8 text-center">
          <p className="text-muted-foreground">Couldn&apos;t load media.</p>
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
      <>
        {Array.from({ length: isFirst ? 9 : 3 }, (_, i) => (
          <div key={i} className="skeleton aspect-square" aria-hidden />
        ))}
      </>
    );
  }

  if (isFirst && connection.edges.length === 0) {
    return (
      <div className="col-span-3">
        <EmptyState
          title={isSelf ? "No photos yet" : `@${username} has no media yet`}
          body={
            isSelf
              ? "Chirps you post with images or GIFs show up here."
              : "When they post images or GIFs, they'll show up here."
          }
        />
      </div>
    );
  }

  const { hasNextPage, endCursor } = connection.pageInfo;

  return (
    <>
      {connection.edges.map(({ node }) => (
        <Link
          key={node.id}
          href={`/${node.author.username}/status/${node.id}`}
          className="group relative aspect-square overflow-hidden bg-muted"
          aria-label={node.content ? `Chirp: ${node.content}` : "Open chirp"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={node.mediaUrls[0]}
            alt={node.content || ""}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {node.mediaUrls.length > 1 && (
            <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
              <Copy className="size-3" aria-hidden />+
              {node.mediaUrls.length - 1}
            </span>
          )}
        </Link>
      ))}
      {isLast && hasNextPage && endCursor && !fetching && (
        <div className="col-span-3">
          <LoadMoreTrigger onVisible={() => onLoadMore(endCursor)} />
        </div>
      )}
    </>
  );
}
