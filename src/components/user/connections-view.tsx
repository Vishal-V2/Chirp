"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useQuery } from "urql";
import { EmptyState, LoadMoreTrigger } from "@/components/feed/tweet-feed";
import { PageHeader } from "@/components/layout/page-header";
import { UserFollowersQuery, UserFollowingQuery } from "@/graphql/client/users";
import type { UserListFieldsFragment } from "@/generated/gql/graphql";
import { cn } from "@/lib/utils";
import { UserRow } from "./user-row";

export type ConnectionKind = "followers" | "following";
const PAGE_SIZE = 30;

function RowSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3" aria-hidden>
      <div className="skeleton size-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton h-3.5 w-1/3 rounded" />
        <div className="skeleton h-3.5 w-1/4 rounded" />
      </div>
    </div>
  );
}

function emptyText(kind: ConnectionKind, username: string, isSelf: boolean) {
  if (kind === "followers") {
    return isSelf
      ? {
          title: "Looking for followers?",
          body: "When someone follows you, you'll see them here.",
        }
      : {
          title: `@${username} doesn't have any followers`,
          body: "When someone follows them, they'll show up here.",
        };
  }
  return isSelf
    ? {
        title: "Be in the know",
        body: "Following accounts is an easy way to fill your timeline. Find some in “Who to follow”.",
      }
    : {
        title: `@${username} isn't following anyone`,
        body: "Once they follow accounts, they'll show up here.",
      };
}

/** One page of people; the next page renders after it as you scroll. */
function ConnectionsPage({
  kind,
  username,
  isSelf,
  after,
  isFirst,
  isLast,
  onLoadMore,
}: {
  kind: ConnectionKind;
  username: string;
  isSelf: boolean;
  after: string | null;
  isFirst: boolean;
  isLast: boolean;
  onLoadMore: (cursor: string) => void;
}) {
  const variables = { username, first: PAGE_SIZE, after };
  const [followers] = useQuery({
    query: UserFollowersQuery,
    variables,
    pause: kind !== "followers",
  });
  const [following] = useQuery({
    query: UserFollowingQuery,
    variables,
    pause: kind !== "following",
  });
  const { fetching, error } = kind === "followers" ? followers : following;

  let users: UserListFieldsFragment[] | undefined;
  let pageInfo: { hasNextPage: boolean; endCursor: string | null } | undefined;
  if (kind === "followers" && followers.data?.user) {
    users = followers.data.user.followers.edges.map((e) => e.node.follower);
    pageInfo = followers.data.user.followers.pageInfo;
  } else if (kind === "following" && following.data?.user) {
    users = following.data.user.following.edges.map((e) => e.node.following);
    pageInfo = following.data.user.following.pageInfo;
  }

  if (!users || !pageInfo) {
    if (error)
      return (
        <p className="px-4 py-8 text-center text-muted-foreground">
          Couldn&apos;t load this list.
        </p>
      );
    return (
      <div role="status" aria-label="Loading">
        {Array.from({ length: isFirst ? 6 : 2 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isFirst && users.length === 0) {
    const { title, body } = emptyText(kind, username, isSelf);
    return <EmptyState title={title} body={body} />;
  }

  const { hasNextPage, endCursor } = pageInfo;
  return (
    <>
      {users.map((u) => (
        <UserRow key={u.id} user={u} />
      ))}
      {isLast && hasNextPage && endCursor && !fetching && (
        <LoadMoreTrigger onVisible={() => onLoadMore(endCursor)} />
      )}
    </>
  );
}

function ConnectionsList(props: {
  kind: ConnectionKind;
  username: string;
  isSelf: boolean;
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  return (
    <div>
      {cursors.map((after, i) => (
        <ConnectionsPage
          key={after ?? "first"}
          {...props}
          after={after}
          isFirst={i === 0}
          isLast={i === cursors.length - 1}
          onLoadMore={(c) =>
            setCursors((list) => (list.includes(c) ? list : [...list, c]))
          }
        />
      ))}
    </div>
  );
}

/** Followers / Following page with link tabs between the two. */
export function ConnectionsView({
  kind,
  username,
  displayName,
  isSelf,
}: {
  kind: ConnectionKind;
  username: string;
  displayName: string;
  isSelf: boolean;
}) {
  const tabs: { kind: ConnectionKind; label: string }[] = [
    { kind: "followers", label: "Followers" },
    { kind: "following", label: "Following" },
  ];

  return (
    <>
      <PageHeader back title={displayName} subtitle={`@${username}`}>
        <nav className="flex" aria-label="Followers and following">
          {tabs.map((tab) => {
            const active = tab.kind === kind;
            return (
              <Link
                key={tab.kind}
                href={`/${username}/${tab.kind}`}
                replace
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 justify-center transition-colors hover:bg-muted/60",
                  active ? "font-bold" : "text-muted-foreground",
                )}
              >
                <span className="relative py-4">
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="connections-tab"
                      className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-primary"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </PageHeader>
      <ConnectionsList kind={kind} username={username} isSelf={isSelf} />
    </>
  );
}
