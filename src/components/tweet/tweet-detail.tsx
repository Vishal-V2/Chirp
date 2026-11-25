"use client";

import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatCount } from "@/lib/format";
import type { TweetData } from "@/lib/types";
import { ActionButton } from "./tweet-card";
import { TweetMenu } from "./tweet-menu";
import { useTweetActions } from "./use-tweet-actions";

function formatFullDate(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  const date = d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  return `${time} · ${date}`;
}

function Stat({ count, one, many }: { count: number; one: string; many: string }) {
  if (count === 0) return null;
  return (
    <span>
      <span className="font-bold text-foreground">{formatCount(count)}</span>{" "}
      <span className="text-muted-foreground">
        {count === 1 ? one : many}
      </span>
    </span>
  );
}

/** The large, focused tweet at the center of a thread page. */
export function TweetDetail({
  tweet,
  onReply,
  onDeleted,
}: {
  tweet: TweetData;
  onReply: () => void;
  onDeleted?: () => void;
}) {
  const { liked, retweeted, likeCount, retweetCount, toggleLike, toggleRetweet } =
    useTweetActions(tweet);
  const { author } = tweet;
  const { replyCount } = tweet;
  const hasStats = replyCount + retweetCount + likeCount > 0;

  return (
    <article className="px-4 pt-3">
      <header className="flex items-center gap-3">
        <Link href={`/${author.username}`}>
          <UserAvatar
            name={author.displayName}
            username={author.username}
            src={author.avatarUrl ?? undefined}
          />
        </Link>
        <Link href={`/${author.username}`} className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-bold hover:underline">{author.displayName}</p>
          <p className="truncate text-muted-foreground">@{author.username}</p>
        </Link>
        <TweetMenu tweet={tweet} onDeleted={onDeleted} />
      </header>

      {tweet.parent && (
        <p className="mt-2 text-[15px] text-muted-foreground">
          Replying to{" "}
          <Link href={`/${tweet.parent.author.username}`} className="text-primary hover:underline">
            @{tweet.parent.author.username}
          </Link>
        </p>
      )}

      <p className="mt-3 text-[17px] leading-normal break-words whitespace-pre-wrap">
        {tweet.content}
      </p>

      <time
        dateTime={tweet.createdAt}
        suppressHydrationWarning
        className="block py-4 text-[15px] text-muted-foreground"
      >
        {formatFullDate(tweet.createdAt)}
      </time>

      {hasStats && (
        <div className="flex gap-5 border-t py-4 text-[15px]">
          <Stat count={replyCount} one="Reply" many="Replies" />
          <Stat count={retweetCount} one="Repost" many="Reposts" />
          <Stat count={likeCount} one="Like" many="Likes" />
        </div>
      )}

      <div className="flex justify-around border-y py-3">
        <ActionButton icon={MessageCircle} label="Reply" tone="primary" large onClick={onReply} />
        <ActionButton
          icon={Repeat2}
          label={retweeted ? "Undo repost" : "Repost"}
          tone="green"
          large
          active={retweeted}
          onClick={toggleRetweet}
        />
        <ActionButton
          icon={Heart}
          label={liked ? "Unlike" : "Like"}
          tone="pink"
          large
          active={liked}
          onClick={toggleLike}
        />
        <ActionButton icon={Bookmark} label="Bookmark" tone="primary" large />
        <ActionButton icon={Share} label="Share" tone="primary" large />
      </div>
    </article>
  );
}
