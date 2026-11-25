"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  type LucideIcon,
  MapPin,
} from "lucide-react";
import { AnimatedCount } from "@/components/motion/animated-count";
import { UserAvatar } from "@/components/user-avatar";
import { useViewer } from "@/components/viewer-provider";
import { formatRelativeTime } from "@/lib/format";
import type { TweetData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";
import { TweetMedia } from "./tweet-media";
import { TweetPoll } from "./tweet-poll";
import { TweetMenu } from "./tweet-menu";
import { shareLink } from "@/lib/share";
import { tweetHref, useTweetActions } from "./use-tweet-actions";

const PARTICLES = 10;

/**
 * Twitter-style celebration when you like something: an expanding ring
 * plus two-colour confetti flying out at slightly different distances.
 */
function LikeBurst() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <motion.span
        className="absolute top-1/2 left-1/2 size-5 rounded-full border-pink-500"
        style={{ x: "-50%", y: "-50%" }}
        initial={{ scale: 0.2, opacity: 1, borderWidth: 10 }}
        animate={{ scale: 2.1, opacity: 0, borderWidth: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
      {Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2 + (i % 2 ? 0.25 : 0);
        const distance = i % 2 ? 22 : 17;
        return (
          <motion.span
            key={i}
            className={cn(
              "absolute top-1/2 left-1/2 rounded-full",
              i % 2 ? "size-1 bg-primary" : "size-1.5 bg-pink-500",
            )}
            initial={{ x: "-50%", y: "-50%", scale: 0, opacity: 1 }}
            animate={{
              x: `calc(-50% + ${Math.cos(angle) * distance}px)`,
              y: `calc(-50% + ${Math.sin(angle) * distance}px)`,
              scale: [0, 1.3, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

export function ActionButton({
  icon: Icon,
  count,
  label,
  active,
  tone,
  large,
  effect,
  onClick,
}: {
  icon: LucideIcon;
  count?: number;
  label: string;
  active?: boolean;
  tone: "primary" | "green" | "pink";
  /** Bigger icon, no count: used on the single-tweet page. */
  large?: boolean;
  /** Celebration when switched on: a heart pop with a burst, or a repost spin. */
  effect?: "pop" | "spin" | "bounce";
  onClick?: () => void;
}) {
  // Bumped each time the action is switched on, to replay the celebration.
  const [celebrations, setCelebrations] = useState(0);
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
  const celebrate = celebrations > 0 && active;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        if (effect && !active) setCelebrations((n) => n + 1);
        onClick?.();
      }}
      className={cn(
        "group flex items-center gap-1 text-sm text-muted-foreground transition-colors",
        tones[tone],
        active && activeTones[tone],
      )}
    >
      <span className="bubble relative -m-2 rounded-full p-2 transition-colors">
        <motion.span
          key={celebrate ? `celebrate-${celebrations}` : "idle"}
          className="block"
          // Animate on mount only when celebrating (that's what re-mounts it).
          initial={celebrate ? undefined : false}
          animate={
            celebrate && effect === "pop"
              ? { scale: [0.2, 1.3, 0.92, 1.05, 1] }
              : celebrate && effect === "spin"
                ? { rotate: [0, 360], scale: [1, 1.25, 1] }
                : celebrate && effect === "bounce"
                  ? { y: [0, -5, 0, -2, 0], scale: [1, 1.15, 1] }
                  : { scale: 1, rotate: 0 }
          }
          transition={{
            duration: effect === "spin" ? 0.55 : 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Icon
            className={cn(
              large ? "size-[22px]" : "size-[18px]",
              // Filled icon when on (heart, bookmark).
              active &&
                (tone === "pink" || effect === "bounce") &&
                "fill-current",
            )}
          />
        </motion.span>
        {celebrate && effect === "pop" && (
          <LikeBurst key={`burst-${celebrations}`} />
        )}
      </span>
      {!large && (
        <span className="min-w-6 text-left">
          {count !== undefined ? <AnimatedCount value={count} /> : null}
        </span>
      )}
    </button>
  );
}

/** "↻ Sam Rivera reposted" above a reposted chirp ("You reposted" for yourself). */
function RepostedLabel({
  by,
}: {
  by: { username: string; displayName: string };
}) {
  const viewer = useViewer();
  const isViewer = viewer?.username === by.username;
  return (
    <p className="-mt-1 mb-1 flex basis-full items-center gap-3 text-[13px] font-semibold text-muted-foreground">
      <span className="flex w-10 justify-end">
        <Repeat2 className="size-4" aria-hidden />
      </span>
      <Link href={`/${by.username}`} className="hover:underline">
        {isViewer ? "You reposted" : `${by.displayName} reposted`}
      </Link>
    </p>
  );
}

export function TweetCard({
  tweet,
  threadLine = false,
  showReplyingTo = true,
  repostedBy,
}: {
  tweet: TweetData;
  /** Shown because this person reposted it (profile "Chirps" tab). */
  repostedBy?: { username: string; displayName: string };
  /** Draw a line under the avatar connecting to the next tweet in a thread. */
  threadLine?: boolean;
  showReplyingTo?: boolean;
}) {
  const router = useRouter();
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
  const href = tweetHref(tweet);
  // Collapse away right after deleting; the feed refetch then drops it for good.
  const [deleted, setDeleted] = useState(false);

  return (
    <AnimatePresence>
      {!deleted && (
        <motion.article
          initial={false}
          exit={{
            opacity: 0,
            height: 0,
            paddingTop: 0,
            paddingBottom: 0,
            borderBottomWidth: 0,
          }}
          transition={{
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          onClick={(e) => {
            // Open the tweet, unless the click was on a link or button inside it,
            // or the user was selecting text.
            if ((e.target as HTMLElement).closest("a, button")) return;
            if (window.getSelection()?.toString()) return;
            router.push(href);
          }}
          className={cn(
            "flex cursor-pointer flex-wrap gap-x-3 overflow-hidden px-4 pt-3 transition-colors hover:bg-muted/40",
            threadLine ? "pb-0" : "border-b pb-3",
          )}
        >
          {repostedBy && <RepostedLabel by={repostedBy} />}
          <div className="flex shrink-0 flex-col items-center">
            <Link href={`/${author.username}`}>
              <UserAvatar
                name={author.displayName}
                username={author.username}
                src={author.avatarUrl ?? undefined}
              />
            </Link>
            {threadLine && (
              <div className="mt-1 w-0.5 flex-1 bg-border" aria-hidden />
            )}
          </div>
          <div className={cn("min-w-0 flex-1", threadLine && "pb-3")}>
            <header className="flex items-start gap-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">
                <Link
                  href={`/${author.username}`}
                  className="flex min-w-0 items-baseline gap-1"
                >
                  <span className="truncate font-bold hover:underline">
                    {author.displayName}
                  </span>
                  <span className="truncate text-muted-foreground">
                    @{author.username}
                  </span>
                </Link>
                <Link
                  href={href}
                  className="text-muted-foreground hover:underline"
                >
                  <time dateTime={tweet.createdAt} suppressHydrationWarning>
                    {formatRelativeTime(tweet.createdAt)}
                  </time>
                </Link>
              </div>
              <TweetMenu
                tweet={tweet}
                onDeleted={() => setDeleted(true)}
                className="-m-2"
              />
            </header>

            {showReplyingTo && tweet.parent && (
              <p className="text-[15px] text-muted-foreground">
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
              <p className="text-[15px] leading-normal break-words whitespace-pre-wrap">
                <RichText text={tweet.content} />
              </p>
            )}

            <TweetMedia
              urls={tweet.mediaUrls ?? []}
              author={author.displayName}
            />

            {tweet.poll && <TweetPoll poll={tweet.poll} />}

            {tweet.location && (
              <p className="mt-2 flex items-center gap-1 text-[13px] text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />

                <span className="truncate">{tweet.location}</span>
              </p>
            )}

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
                effect="spin"
                active={retweeted}
                onClick={toggleRetweet}
              />
              <ActionButton
                icon={Heart}
                label={liked ? "Unlike" : "Like"}
                count={likeCount}
                tone="pink"
                effect="pop"
                active={liked}
                onClick={toggleLike}
              />
              <ActionButton
                icon={Bookmark}
                label={bookmarked ? "Remove bookmark" : "Bookmark"}
                tone="primary"
                effect="bounce"
                active={bookmarked}
                onClick={toggleBookmark}
              />
              <ActionButton
                icon={Share}
                label="Share"
                tone="primary"
                onClick={() =>
                  void shareLink(href, `${author.displayName} on Chirp`)
                }
              />
            </div>
          </div>
        </motion.article>
      )}
    </AnimatePresence>
  );
}
