"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "urql";
import {
  LikeTweetMutation,
  RetweetMutation,
  UnlikeTweetMutation,
  UnretweetMutation,
} from "@/graphql/client/tweets";
import type { TweetData } from "@/lib/types";

/**
 * Like/repost state for one tweet, saved through the GraphQL API.
 *
 * The click shows instantly. `override` holds what the user last chose until
 * the cache catches up, so this also works for tweets passed in as plain
 * props (the profile tabs still use sample data); on failure it's reverted.
 */
export function useTweetActions(tweet: TweetData) {
  const [likeOverride, setLikeOverride] = useState<boolean>();
  const [retweetOverride, setRetweetOverride] = useState<boolean>();
  const busy = useRef({ like: false, retweet: false });

  const [, like] = useMutation(LikeTweetMutation);
  const [, unlike] = useMutation(UnlikeTweetMutation);
  const [, retweet] = useMutation(RetweetMutation);
  const [, unretweet] = useMutation(UnretweetMutation);

  const liked = likeOverride ?? tweet.viewerHasLiked;
  const retweeted = retweetOverride ?? tweet.viewerHasRetweeted;

  async function toggle(kind: "like" | "retweet") {
    if (busy.current[kind]) return; // ignore double-clicks while saving
    busy.current[kind] = true;

    const current = kind === "like" ? liked : retweeted;
    const setOverride = kind === "like" ? setLikeOverride : setRetweetOverride;
    const previous = kind === "like" ? likeOverride : retweetOverride;
    setOverride(!current);

    const mutate =
      kind === "like" ? (current ? unlike : like) : current ? unretweet : retweet;
    const result = await mutate({ id: tweet.id });
    busy.current[kind] = false;

    if (result.error) {
      setOverride(previous);
      toast.error(
        result.error.graphQLErrors[0]?.message ??
          `Couldn't ${current ? "undo" : "save"} that ${kind === "like" ? "like" : "repost"}.`,
      );
    }
  }

  return {
    liked,
    retweeted,
    // Counts follow the shown state even before the server answers.
    likeCount: tweet.likeCount + Number(liked) - Number(tweet.viewerHasLiked),
    retweetCount:
      tweet.retweetCount + Number(retweeted) - Number(tweet.viewerHasRetweeted),
    toggleLike: () => void toggle("like"),
    toggleRetweet: () => void toggle("retweet"),
  };
}

export const tweetHref = (tweet: Pick<TweetData, "id" | "author">) =>
  `/${tweet.author.username}/status/${tweet.id}`;
