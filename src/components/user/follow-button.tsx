"use client";

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
        "group h-9 min-w-24 rounded-full px-4 text-sm font-bold transition-colors",
        following
          ? "border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          : "bg-foreground text-background hover:bg-foreground/85",
        className,
      )}
    >
      {following ? (
        <>
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        "Follow"
      )}
    </button>
  );
}
