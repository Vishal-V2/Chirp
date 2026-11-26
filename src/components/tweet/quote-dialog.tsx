"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "urql";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViewer } from "@/components/providers/viewer-provider";
import { CreateTweetMutation } from "@/graphql/client/tweets";
import type { TweetData } from "@/lib/types";
import { TweetComposer, type ChirpExtras } from "./tweet-composer";
import { tweetHref } from "@/hooks/use-tweet-actions";

/** Write a quote repost: your comment with the original chirp embedded below. */
export function QuoteDialog({
  tweet,
  open,
  onOpenChange,
}: {
  tweet: TweetData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const viewer = useViewer();
  const router = useRouter();
  const [, createTweet] = useMutation(CreateTweetMutation);
  if (!viewer) return null;

  async function post(content: string, extras: ChirpExtras) {
    const result = await createTweet({
      content,
      ...extras,
      quotedId: tweet.id,
    });
    if (result.error || !result.data) {
      return (
        result.error?.graphQLErrors[0]?.message ?? "Couldn't post your quote."
      );
    }
    onOpenChange(false);
    const created = result.data.createTweet;
    toast.success("Chirped", {
      action: { label: "View", onClick: () => router.push(tweetHref(created)) },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="gap-0 overflow-visible p-0 sm:max-w-[600px] sm:rounded-2xl"
      >
        <DialogTitle className="px-4 pt-4 font-heading text-lg font-bold tracking-tight">
          Quote
        </DialogTitle>
        <DialogDescription className="sr-only">
          Add your comment; the chirp you&apos;re quoting is shown below it.
        </DialogDescription>
        <TweetComposer
          author={viewer}
          placeholder="Add a comment"
          quoted={tweet}
          onPost={post}
        />
      </DialogContent>
    </Dialog>
  );
}
