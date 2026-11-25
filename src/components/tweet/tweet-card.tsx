"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChartNoAxesColumn,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  type LucideIcon,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatCount, formatRelativeTime } from "@/lib/format";
import type { TweetData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TweetMenu } from "./tweet-menu";
import { tweetHref, useTweetActions } from "./use-tweet-actions";

export function ActionButton({
  icon: Icon,
  count,
  label,
  active,
  tone,
  large,
  onClick,
}: {
  icon: LucideIcon;
  count?: number;
  label: string;
  active?: boolean;
  tone: "primary" | "green" | "pink";
  /** Bigger icon, no count: used on the single-tweet page. */
  large?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    primary: "hover:text-primary [&_.bubble]:group-hover:bg-primary/10",
    green: "hover:text-emerald-500 [&_.bubble]:group-hover:bg-emerald-500/10",
    pink: "hover:text-pink-600 [&_.bubble]:group-hover:bg-pink-600/10",
  };
  const activeTones = {
    primary: "text-primary",
    green: "text-emerald-500",
    pink: "text-pink-600",
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "group flex items-center gap-1 text-sm text-muted-foreground transition-colors",
        tones[tone],
        active && activeTones[tone],
      )}
    >
      <span className="bubble -m-2 rounded-full p-2 transition-colors">
        <Icon
          className={cn(
            large ? "size-[22px]" : "size-[18px]",
            active && tone === "pink" && "fill-current",
          )}
        />
      </span>
      {!large && (
        <span className="min-w-6 text-left tabular-nums">
          {count !== undefined ? formatCount(count) : ""}
        </span>
      )}
    </button>
  );
}

export function TweetCard({
  tweet,
  threadLine = false,
  showReplyingTo = true,
}: {
  tweet: TweetData;
  /** Draw a line under the avatar connecting to the next tweet in a thread. */
  threadLine?: boolean;
  showReplyingTo?: boolean;
}) {
  const router = useRouter();
  const { liked, retweeted, likeCount, retweetCount, toggleLike, toggleRetweet } =
    useTweetActions(tweet);
  const { author } = tweet;
  const href = tweetHref(tweet);
  // Hide right away after deleting; the feed refetch then drops it for good.
  const [deleted, setDeleted] = useState(false);
  if (deleted) return null;

  return (
    <article
      onClick={(e) => {
        // Open the tweet, unless the click was on a link or button inside it,
        // or the user was selecting text.
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (window.getSelection()?.toString()) return;
        router.push(href);
      }}
      className={cn(
        "flex cursor-pointer gap-3 px-4 pt-3 transition-colors hover:bg-muted/40",
        threadLine ? "pb-0" : "border-b pb-3",
      )}
    >
      <div className="flex shrink-0 flex-col items-center">
        <Link href={`/${author.username}`}>
          <UserAvatar
            name={author.displayName}
            username={author.username}
            src={author.avatarUrl ?? undefined}
          />
        </Link>
        {threadLine && <div className="mt-1 w-0.5 flex-1 bg-border" aria-hidden />}
      </div>
      <div className={cn("min-w-0 flex-1", threadLine && "pb-3")}>
        <header className="flex items-start gap-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">
            <Link href={`/${author.username}`} className="flex min-w-0 items-baseline gap-1">
              <span className="truncate font-bold hover:underline">{author.displayName}</span>
              <span className="truncate text-muted-foreground">@{author.username}</span>
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={href} className="text-muted-foreground hover:underline">
              <time dateTime={tweet.createdAt} suppressHydrationWarning>
                {formatRelativeTime(tweet.createdAt)}
              </time>
            </Link>
          </div>
          <TweetMenu tweet={tweet} onDeleted={() => setDeleted(true)} className="-m-2" />
        </header>

        {showReplyingTo && tweet.parent && (
          <p className="text-[15px] text-muted-foreground">
            Replying to{" "}
            <Link href={`/${tweet.parent.author.username}`} className="text-primary hover:underline">
              @{tweet.parent.author.username}
            </Link>
          </p>
        )}

        <p className="text-[15px] leading-normal break-words whitespace-pre-wrap">
          {tweet.content}
        </p>

        <div className="mt-3 flex max-w-md justify-between">
          <ActionButton
            icon={MessageCircle}
            label="Reply"
            count={tweet.replyCount}
            tone="primary"
            onClick={() => router.push(href)}
          />
          <ActionButton
            icon={Repeat2}
            label={retweeted ? "Undo repost" : "Repost"}
            count={retweetCount}
            tone="green"
            active={retweeted}
            onClick={toggleRetweet}
          />
          <ActionButton
            icon={Heart}
            label={liked ? "Unlike" : "Like"}
            count={likeCount}
            tone="pink"
            active={liked}
            onClick={toggleLike}
          />
          <ActionButton icon={ChartNoAxesColumn} label="Views" tone="primary" />
          <ActionButton icon={Share} label="Share" tone="primary" />
        </div>
      </div>
    </article>
  );
}
