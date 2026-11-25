"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Repeat2, UserPlus } from "lucide-react";
import { useMutation, useQuery } from "urql";
import { EmptyState } from "@/components/feed/tweet-feed";
import { PageHeader } from "@/components/layout/page-header";
import { useLiveNotifications } from "@/components/messages/realtime-provider";
import { TweetCard } from "@/components/tweet/tweet-card";
import { tweetHref } from "@/components/tweet/use-tweet-actions";
import { UserAvatar } from "@/components/user-avatar";
import type { NotificationsQuery as NotificationsData } from "@/generated/gql/graphql";
import {
  MarkNotificationsReadMutation,
  NotificationsQuery,
} from "@/graphql/client/notifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = NotificationsData["notifications"]["edges"][number]["node"];
type Group = {
  key: string;
  type: Item["type"];
  actors: Item["actor"][];
  tweet: Item["tweet"];
  createdAt: string;
  ids: string[];
};

const PAGE = 40;

/**
 * Likes and reposts of the same chirp, and follows, are grouped
 * ("Sam and 2 others liked your chirp"); each reply or mention stays on its own.
 */
function group(items: Item[]): Group[] {
  const groups = new Map<string, Group>();
  for (const n of items) {
    const key =
      n.type === "REPLY" || n.type === "MENTION"
        ? `${n.type}:${n.id}`
        : n.type === "FOLLOW"
          ? "FOLLOW"
          : `${n.type}:${n.tweet?.id}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        key,
        type: n.type,
        actors: [n.actor],
        tweet: n.tweet,
        createdAt: n.createdAt,
        ids: [n.id],
      });
    } else {
      if (!g.actors.some((a) => a.id === n.actor.id)) g.actors.push(n.actor);
      g.ids.push(n.id);
    }
  }
  return [...groups.values()];
}

function sentence(g: Group) {
  const [first] = g.actors;
  const others = g.actors.length - 1;
  const who = (
    <>
      <span className="font-bold">{first.displayName}</span>
      {others > 0 && (
        <>
          {" "}
          and{" "}
          <span className="font-bold">
            {others === 1 ? g.actors[1].displayName : `${others} others`}
          </span>
        </>
      )}
    </>
  );
  if (g.type === "LIKE") return <>{who} liked your chirp</>;
  if (g.type === "REPOST") return <>{who} reposted your chirp</>;
  return <>{who} followed you</>;
}

const ICONS = {
  LIKE: { icon: Heart, className: "fill-pink-600 text-pink-600" },
  REPOST: { icon: Repeat2, className: "text-emerald-500" },
  FOLLOW: { icon: UserPlus, className: "text-primary" },
} as const;

/** Likes, reposts and follows: icon, faces, one line, and the chirp it's about. */
function GroupRow({ g, unread }: { g: Group; unread: boolean }) {
  if (g.type === "REPLY" || g.type === "MENTION") return null;
  const { icon: Icon, className } = ICONS[g.type];
  const href =
    g.type === "FOLLOW"
      ? `/${g.actors[0].username}`
      : g.tweet
        ? tweetHref(g.tweet)
        : "#";
  return (
    <Link
      href={href}
      className={cn(
        "flex gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/40",
        unread && "bg-primary/[0.06]",
      )}
    >
      <div className="flex w-10 shrink-0 justify-end pt-1">
        <Icon className={cn("size-7", className)} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex -space-x-2">
          {g.actors.slice(0, 6).map((a) => (
            <UserAvatar
              key={a.id}
              name={a.displayName}
              username={a.username}
              src={a.avatarUrl ?? undefined}
              className="size-8 ring-2 ring-background"
            />
          ))}
        </div>
        <p className="mt-2 text-[15px]">
          {sentence(g)}{" "}
          <time
            dateTime={g.createdAt}
            suppressHydrationWarning
            className="text-muted-foreground"
          >
            · {formatRelativeTime(g.createdAt)}
          </time>
        </p>
        {g.tweet && (
          <p className="mt-1 line-clamp-2 text-[15px] text-muted-foreground">
            {g.tweet.content || (g.tweet.mediaUrls?.length ? "Photo" : "")}
          </p>
        )}
      </div>
    </Link>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading notifications">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3 border-b px-4 py-3" aria-hidden>
          <div className="skeleton size-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton size-8 rounded-full" />
            <div className="skeleton h-3.5 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Your notifications, updated live; opening the page marks them read. */
export function NotificationsView() {
  const [first, setFirst] = useState(PAGE);
  const [{ data, error }, refetch] = useQuery({
    query: NotificationsQuery,
    variables: { first },
  });
  const [, markRead] = useMutation(MarkNotificationsReadMutation);

  // Keep the "new" highlight for this visit, even after everything is marked read.
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set());
  const seen = useRef<Set<string> | null>(null);
  const items = data?.notifications.edges.map((e) => e.node);

  useEffect(() => {
    if (!items) return;
    const firstLoad = seen.current === null;
    const fresh = items.filter((n) =>
      firstLoad ? n.isUnread : !seen.current!.has(n.id),
    );
    seen.current = new Set(items.map((n) => n.id));
    if (fresh.length) {
      setUnreadIds((prev) => new Set([...prev, ...fresh.map((n) => n.id)]));
    }
    if (firstLoad || fresh.length) void markRead({});
  }, [items, markRead]);

  // New notification over the WebSocket: show it straight away.
  useLiveNotifications(() => refetch({ requestPolicy: "network-only" }));

  return (
    <>
      <PageHeader title="Notifications" />
      {!items ? (
        error ? (
          <p className="px-4 py-8 text-center text-muted-foreground">
            Couldn&apos;t load notifications.
          </p>
        ) : (
          <Skeleton />
        )
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing to see here yet"
          body="Likes, reposts, replies, mentions and new followers show up here the moment they happen."
        />
      ) : (
        <>
          {group(items).map((g) =>
            (g.type === "REPLY" || g.type === "MENTION") && g.tweet ? (
              <div
                key={g.key}
                className={cn(unreadIds.has(g.ids[0]) && "bg-primary/[0.06]")}
              >
                <TweetCard tweet={g.tweet} />
              </div>
            ) : (
              <GroupRow
                key={g.key}
                g={g}
                unread={g.ids.some((id) => unreadIds.has(id))}
              />
            ),
          )}
          {data?.notifications.pageInfo.hasNextPage && (
            <button
              type="button"
              onClick={() => setFirst((n) => n + PAGE)}
              className="w-full px-4 py-4 text-primary transition-colors hover:bg-muted/40"
            >
              Show older notifications
            </button>
          )}
        </>
      )}
    </>
  );
}
