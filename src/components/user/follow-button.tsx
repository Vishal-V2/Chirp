"use client";

import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useMutation } from "urql";
import { FollowMutation, UnfollowMutation } from "@/graphql/client/users";
import { cn } from "@/lib/utils";

/**
 * Follow / Following button. Saves through the API; the cache updates it
 * (and the follower count) instantly, and rolls back if saving fails.
 */
export function FollowButton({
  userId,
  displayName,
  following,
  className,
}: {
  userId: string;
  displayName: string;
  following: boolean;
  className?: string;
}) {
  const [{ fetching: following_ }, follow] = useMutation(FollowMutation);
  const [{ fetching: unfollowing }, unfollow] = useMutation(UnfollowMutation);
  const busy = following_ || unfollowing;

  async function toggle() {
    if (busy) return;
    const result = following
      ? await unfollow({ userId })
      : await follow({ userId });
    if (result.error) {
      toast.error(
        result.error.graphQLErrors[0]?.message ??
          `Couldn't ${following ? "unfollow" : "follow"} ${displayName}.`,
      );
    }
  }

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={
        following ? `Unfollow ${displayName}` : `Follow ${displayName}`
      }
      onClick={(e) => {
        e.preventDefault();
        void toggle();
      }}
      className={cn(
        "pressable group h-9 min-w-24 overflow-hidden rounded-full px-4 text-sm font-bold",
        following
          ? "border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          : "bg-foreground text-background hover:bg-foreground/85",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={following ? "following" : "follow"}
          className="inline-block"
          initial={{ y: following ? 14 : -14, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: following ? -14 : 14, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {following ? (
            <>
              <span className="group-hover:hidden">Following</span>
              <span className="hidden group-hover:inline">Unfollow</span>
            </>
          ) : (
            "Follow"
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
