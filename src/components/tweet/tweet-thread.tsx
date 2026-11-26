"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "urql";
import { useViewer } from "@/components/providers/viewer-provider";
import { CreateTweetMutation, TweetPageQuery } from "@/graphql/client/tweets";
import { TweetCard } from "./tweet-card";
import { TweetComposer, type ChirpExtras } from "./tweet-composer";
import { TweetDetail } from "./tweet-detail";

const REPLY_INPUT_ID = "reply-composer";
const REPLIES_PAGE = 50;

function ThreadSkeleton() {
  return (
    <div
      className="space-y-3 px-4 py-4"
      role="status"
      aria-label="Loading chirp"
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full skeleton" />
        <div className="h-4 w-40 rounded skeleton" />
      </div>
      <div className="h-5 w-full rounded skeleton" />
      <div className="h-5 w-3/4 rounded skeleton" />
    </div>
  );
}

/**
 * Single-tweet page body: parent tweets above, the focused tweet,
 * a reply box, then replies — all from the GraphQL API.
 */
export function TweetThread({ tweetId }: { tweetId: string }) {
  const router = useRouter();
  const viewer = useViewer();
  const [repliesFirst, setRepliesFirst] = useState(REPLIES_PAGE);
  const [{ data, error, fetching }, reexecute] = useQuery({
    query: TweetPageQuery,
    variables: { id: tweetId, repliesFirst },
  });
  const [, createTweet] = useMutation(CreateTweetMutation);
  const focused = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  const tweet = data?.tweet;
  const ancestorCount = tweet?.ancestors.length ?? 0;

  // With parent tweets above, start scrolled to the focused tweet (once).
  useEffect(() => {
    if (ancestorCount > 0 && !scrolled.current) {
      scrolled.current = true;
      focused.current?.scrollIntoView({ block: "start" });
    }
  }, [ancestorCount]);

  if (!tweet) {
    if (fetching) return <ThreadSkeleton />;
    if (error) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">
            Couldn&apos;t load this chirp.
          </p>
          <button
            type="button"
            onClick={() => reexecute({ requestPolicy: "network-only" })}
            className="mt-3 h-9 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      );
    }
    // Deleted while you were looking at it.
    return (
      <div className="fade-up mx-auto max-w-sm px-8 py-12">
        <p className="font-heading text-3xl font-extrabold tracking-tight">
          This chirp doesn&apos;t exist
        </p>
        <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        <Link
          href="/"
          className="mt-4 inline-block font-medium text-primary hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  async function reply(content: string, extras: ChirpExtras) {
    const result = await createTweet({ content, ...extras, parentId: tweetId });
    if (result.error) {
      return (
        result.error.graphQLErrors[0]?.message ?? "Couldn't send your reply."
      );
    }
  }

  // The rest of the author's thread shows right under this chirp, so it's
  // left out of the replies below.
  const continuation = tweet.threadContinuation;
  const inThread = new Set(continuation.map((t) => t.id));
  const replies = tweet.replies.edges
    .map((e) => e.node)
    .filter((r) => !inThread.has(r.id));

  return (
    <>
      {tweet.ancestors.map((t) => (
        <TweetCard key={t.id} tweet={t} threadLine showReplyingTo={false} />
      ))}

      {/* min-h keeps room to scroll the focused tweet to the top. */}
      <div ref={focused} className="min-h-[calc(100dvh-53px)] scroll-mt-[53px]">
        <TweetDetail
          tweet={tweet}
          onReply={() => document.getElementById(REPLY_INPUT_ID)?.focus()}
          onDeleted={() => router.push("/")}
        />
        {continuation.map((t, i) => (
          <TweetCard
            key={t.id}
            tweet={t}
            threadLine={i < continuation.length - 1}
            showReplyingTo={false}
          />
        ))}
        {viewer && (
          <TweetComposer
            placeholder="Write your reply"
            submitLabel="Reply"
            replyingTo={tweet.author.username}
            textareaId={REPLY_INPUT_ID}
            author={viewer}
            onPost={reply}
          />
        )}
        {replies.map((r) => (
          <TweetCard key={r.id} tweet={r} showReplyingTo={false} />
        ))}
        {tweet.replies.pageInfo.hasNextPage && (
          <button
            type="button"
            onClick={() => setRepliesFirst((n) => n + REPLIES_PAGE)}
            className="w-full px-4 py-4 text-left text-primary transition-colors hover:bg-muted/40"
          >
            Show more replies
          </button>
        )}
      </div>
    </>
  );
}
