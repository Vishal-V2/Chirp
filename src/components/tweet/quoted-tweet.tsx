"use client";

import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { findEmbed } from "@/lib/embeds";
import { LinkEmbed } from "./link-embed";
import { tweetHref } from "./use-tweet-actions";

/** What the embed needs; fits both a quoted chirp from the API and a full chirp. */
type Quotable = {
  id: string;
  content: string;
  mediaUrls?: string[];
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
};

/**
 * The chirp inside a quote repost: a bordered card that opens the original.
 * Shows "This chirp is unavailable" if the original was deleted.
 */
export function QuotedTweet({
  quoted,
  interactive = true,
  className,
}: {
  quoted: Quotable | null | undefined;
  /** False in the composer preview (nothing to open yet). */
  interactive?: boolean;
  className?: string;
}) {
  const router = useRouter();

  if (!quoted) {
    return (
      <p
        className={cn(
          "mt-3 rounded-2xl border bg-muted/40 px-4 py-3 text-[15px] text-muted-foreground",
          className,
        )}
      >
        This chirp is unavailable.
      </p>
    );
  }

  const { author } = quoted;
  const image = quoted.mediaUrls?.[0];
  // Same as a normal chirp: a YouTube / X link becomes an embed (unless it has images).
  const embed = image ? null : findEmbed(quoted.content);
  const text =
    embed && quoted.content.trimEnd().endsWith(embed.url)
      ? quoted.content.trimEnd().slice(0, -embed.url.length).trimEnd()
      : quoted.content;
  const open = () => router.push(tweetHref(quoted));

  return (
    <div
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        interactive ? `Quoted chirp from ${author.displayName}` : undefined
      }
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation(); // open the quoted chirp, not the quote
        open();
      }}
      onKeyDown={(e) => {
        if (interactive && e.key === "Enter") {
          e.stopPropagation();
          open();
        }
      }}
      className={cn(
        "mt-3 overflow-hidden rounded-2xl border transition-colors",
        interactive &&
          "cursor-pointer hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
    >
      <div className="px-3 pt-2.5 pb-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-[15px]">
          <UserAvatar
            name={author.displayName}
            username={author.username}
            src={author.avatarUrl ?? undefined}
            className="size-5"
            fallbackClassName="text-[9px]"
          />
          <span className="truncate font-bold">{author.displayName}</span>
          <span className="truncate text-muted-foreground">
            @{author.username}
          </span>
          <time
            dateTime={quoted.createdAt}
            suppressHydrationWarning
            className="shrink-0 text-muted-foreground"
          >
            {formatRelativeTime(quoted.createdAt)}
          </time>
        </div>
        {text && (
          <p className="mt-1 line-clamp-6 text-[15px] leading-normal break-words whitespace-pre-wrap">
            {text}
          </p>
        )}
        {embed && <LinkEmbed embed={embed} compact />}
      </div>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading="lazy"
          className="max-h-72 w-full border-t object-cover"
        />
      )}
    </div>
  );
}
