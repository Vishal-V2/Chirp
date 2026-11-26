"use client";

import { useState } from "react";
import {
  Ban,
  Link2,
  MoreHorizontal,
  Trash2,
  Volume2,
  VolumeX,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "urql";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useViewer } from "@/components/providers/viewer-provider";
import {
  DeleteTweetMutation,
  PinTweetMutation,
  UnpinTweetMutation,
} from "@/graphql/client/tweets";
import type { TweetData } from "@/lib/types";
import { deleteStoredFiles } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { tweetHref } from "@/hooks/use-tweet-actions";
import { useSafetyActions } from "@/hooks/use-safety-actions";
import { BlockDialog } from "@/components/user/block-dialog";

/**
 * The "⋯" menu on a tweet. Authors get Delete (with confirmation); on other
 * people's chirps you get Mute and Block; everyone gets Copy link.
 */
export function TweetMenu({
  tweet,
  onDeleted,
  className,
}: {
  tweet: TweetData;
  onDeleted?: () => void;
  className?: string;
}) {
  const viewer = useViewer();
  const isOwn = viewer?.id === tweet.author.id;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [{ fetching }, deleteTweet] = useMutation(DeleteTweetMutation);
  const [, pinTweet] = useMutation(PinTweetMutation);
  const [, unpinTweet] = useMutation(UnpinTweetMutation);
  // Only your own chirps, and not replies, can be pinned.
  const canPin = isOwn && !tweet.parent;

  async function togglePin() {
    const result = tweet.isPinned
      ? await unpinTweet({ id: tweet.id })
      : await pinTweet({ id: tweet.id });
    if (result.error) {
      toast.error(
        result.error.graphQLErrors[0]?.message ?? "Couldn't update your pin.",
      );
      return;
    }
    toast.success(
      tweet.isPinned ? "Unpinned from your profile" : "Pinned to your profile",
    );
  }
  const { toggleMute, toggleBlock, blockDialog } = useSafetyActions(
    tweet.author,
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + tweetHref(tweet),
      );
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  async function confirmDelete() {
    // The cache's deleteTweet updater drops the tweet and refreshes the feeds.
    const result = await deleteTweet({ id: tweet.id });
    if (result.error || !result.data?.deleteTweet) {
      toast.error(
        result.error?.graphQLErrors[0]?.message ?? "Couldn't delete the chirp.",
      );
      return;
    }
    setConfirmOpen(false);
    toast.success("Chirp deleted");
    void deleteStoredFiles(tweet.mediaUrls ?? []);
    onDeleted?.();
  }

  return (
    // Stop clicks (including ones from the portaled menu/dialog) from opening the tweet.
    <div onClick={(e) => e.stopPropagation()} className="contents">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More"
          className={cn(
            "rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary data-popup-open:bg-primary/10 data-popup-open:text-primary",
            className,
          )}
        >
          <MoreHorizontal className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canPin && (
            <DropdownMenuItem
              onClick={() => void togglePin()}
              className="py-2 text-[15px]"
            >
              {tweet.isPinned ? <PinOff /> : <Pin />}
              {tweet.isPinned ? "Unpin from profile" : "Pin to your profile"}
            </DropdownMenuItem>
          )}
          {isOwn && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              className="py-2 text-[15px] font-semibold"
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          )}
          {!isOwn && viewer && (
            <>
              <DropdownMenuItem
                onClick={() => void toggleMute()}
                className="py-2 text-[15px]"
              >
                {tweet.author.viewerHasMuted ? <Volume2 /> : <VolumeX />}
                {tweet.author.viewerHasMuted ? "Unmute" : "Mute"} @
                {tweet.author.username}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void toggleBlock()}
                className="py-2 text-[15px]"
              >
                <Ban />
                {tweet.author.viewerHasBlocked ? "Unblock" : "Block"} @
                {tweet.author.username}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={copyLink} className="py-2 text-[15px]">
            <Link2 />
            Copy link to chirp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BlockDialog {...blockDialog} />

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !fetching && setConfirmOpen(open)}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 p-8 sm:max-w-80 sm:rounded-2xl"
        >
          <DialogTitle className="font-heading text-xl font-bold tracking-tight">
            Delete chirp?
          </DialogTitle>
          <DialogDescription className="mt-2 text-[15px]">
            This can&apos;t be undone. It will be removed from your profile and
            the timeline
            {tweet.replyCount > 0 ? ", along with its replies" : ""}.
          </DialogDescription>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={fetching}
              className="pressable h-11 rounded-full bg-destructive font-bold text-white hover:bg-destructive/90 disabled:opacity-60"
            >
              {fetching ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={fetching}
              className="pressable h-11 rounded-full border font-bold hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
