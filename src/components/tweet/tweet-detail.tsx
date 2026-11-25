"use client";

import Link from "next/link";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MapPin,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatCount } from "@/lib/format";
import type { TweetData } from "@/lib/types";
import { ActionButton } from "./tweet-card";
import { RichText } from "./rich-text";
import { TweetMedia } from "./tweet-media";
import { TweetPoll } from "./tweet-poll";
import { TweetMenu } from "./tweet-menu";
import { shareLink } from "@/lib/share";
import { tweetHref, useTweetActions } from "./use-tweet-actions";

function formatFullDate(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  });
  const date = d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${time} · ${date}`;
}

function Stat({
  count,
  one,
  many,
}: {
  count: number;
  one: string;
  many: string;
}) {
  if (count === 0) return null;
  return (
    <span>
      <span className="font-bold text-foreground">{formatCount(count)}</span>{" "}
      <span className="text-muted-foreground">{count === 1 ? one : many}</span>
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
  const {
    liked,
    retweeted,
    likeCount,
    retweetCount,
    toggleLike,
    toggleRetweet,
    bookmarked,
    toggleBookmark,
  } = useTweetActions(tweet);
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
        <Link
          href={`/${author.username}`}
          className="min-w-0 flex-1 leading-tight"
        >
          <p className="truncate font-bold hover:underline">
            {author.displayName}
          </p>
          <p className="truncate text-muted-foreground">@{author.username}</p>
        </Link>
        <TweetMenu tweet={tweet} onDeleted={onDeleted} />
      </header>

      {tweet.parent && (
        <p className="mt-2 text-[15px] text-muted-foreground">
          Replying to{" "}
          <Link
            href={`/${tweet.parent.author.username}`}
            className="text-primary hover:underline"
          >
            @{tweet.parent.author.username}
          </Link>
        </p>
      )}

      {tweet.content && (
        <p className="mt-3 text-[17px] leading-normal break-words whitespace-pre-wrap">
          <RichText text={tweet.content} />
        </p>
      )}

      <TweetMedia urls={tweet.mediaUrls ?? []} author={author.displayName} />

      {tweet.poll && <TweetPoll poll={tweet.poll} />}

      {tweet.location && (
        <p className="mt-2 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />

          <span className="truncate">{tweet.location}</span>
        </p>
      )}

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
        <ActionButton
          icon={MessageCircle}
          label="Reply"
          tone="primary"
          large
          onClick={onReply}
        />
        <ActionButton
          icon={Repeat2}
          label={retweeted ? "Undo repost" : "Repost"}
          tone="green"
          effect="spin"
          large
          active={retweeted}
          onClick={toggleRetweet}
        />
        <ActionButton
          icon={Heart}
          label={liked ? "Unlike" : "Like"}
          tone="pink"
          effect="pop"
          large
          active={liked}
          onClick={toggleLike}
        />
        <ActionButton
          icon={Bookmark}
          label={bookmarked ? "Remove bookmark" : "Bookmark"}
          tone="primary"
          effect="bounce"
          large
          active={bookmarked}
          onClick={toggleBookmark}
        />
        <ActionButton
          icon={Share}
          label="Share"
          tone="primary"
          large
          onClick={() =>
            void shareLink(tweetHref(tweet), `${author.displayName} on Chirp`)
          }
        />
      </div>
    </article>
  );
}
