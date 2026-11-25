"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import {
  QuotedTweet,
  TweetActions,
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetInfo,
  TweetMedia,
  TweetNotFound,
  TweetReplies,
  TweetSkeleton,
  enrichTweet,
  getMediaUrl,
  getMp4Video,
  useTweet,
} from "react-tweet";
import type { MediaAnimatedGif } from "react-tweet/api";

type GifMedia = MediaAnimatedGif;

/**
 * X serves GIFs as short silent MP4s. Play them like GIFs: autoplay, loop,
 * muted, no controls (unless the viewer asked their device to reduce motion).
 */
function XGif({ media }: { media: GifMedia }) {
  const reduceMotion = useReducedMotion();
  const { width, height } = media.original_info;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--tweet-border)]">
      <video
        src={getMp4Video(media).url}
        poster={getMediaUrl(media, "small")}
        autoPlay={!reduceMotion}
        loop
        muted
        playsInline
        controls={Boolean(reduceMotion)}
        aria-label="GIF"
        style={{ aspectRatio: `${width} / ${height}` }}
        className="block w-full bg-black object-contain"
      />
    </div>
  );
}

/** An X post, fetched through our /api/tweet route; GIFs loop like GIFs. */
export function XPostEmbed({
  tweetId,
  compact = false,
}: {
  tweetId: string;
  /** Inside a quote box: just the media and a small "@user on X" caption. */
  compact?: boolean;
}) {
  const { data, error, isLoading } = useTweet(
    undefined,
    `/api/tweet/${tweetId}`,
  );
  const tweet = useMemo(() => (data ? enrichTweet(data) : null), [data]);

  if (isLoading) return <TweetSkeleton />;
  if (error || !tweet) return <TweetNotFound error={error} />;

  const media = tweet.mediaDetails ?? [];
  const gifs = media.filter((m): m is GifMedia => m.type === "animated_gif");

  if (compact && media.length) {
    const photo = media.find((m) => m.type === "photo");
    return (
      <div className="react-tweet-theme mt-3" style={{ margin: 0 }}>
        {gifs.length ? (
          <XGif media={gifs[0]} />
        ) : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getMediaUrl(photo, "medium")}
            alt=""
            loading="lazy"
            className="mt-3 max-h-80 w-full rounded-xl border border-[var(--tweet-border)] object-cover"
          />
        ) : (
          <TweetMedia tweet={tweet} />
        )}
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block text-[13px] text-muted-foreground hover:underline"
        >
          @{tweet.user.screen_name} on X
        </a>
      </div>
    );
  }

  return (
    <TweetContainer>
      <TweetHeader tweet={tweet} />
      {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
      <TweetBody tweet={tweet} />
      {gifs.length && gifs.length === media.length ? (
        gifs.map((m) => <XGif key={m.media_url_https} media={m} />)
      ) : media.length ? (
        <TweetMedia tweet={tweet} />
      ) : null}
      {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
      <TweetInfo tweet={tweet} />
      <TweetActions tweet={tweet} />
      <TweetReplies tweet={tweet} />
    </TweetContainer>
  );
}
