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
export function XPostEmbed({ tweetId }: { tweetId: string }) {
  const { data, error, isLoading } = useTweet(
    undefined,
    `/api/tweet/${tweetId}`,
  );
  const tweet = useMemo(() => (data ? enrichTweet(data) : null), [data]);

  if (isLoading) return <TweetSkeleton />;
  if (error || !tweet) return <TweetNotFound error={error} />;

  const media = tweet.mediaDetails ?? [];
  const gifs = media.filter((m): m is GifMedia => m.type === "animated_gif");

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
