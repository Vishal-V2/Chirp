"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function FollowButton({
  initialFollowing,
  displayName,
  className,
}: {
  initialFollowing: boolean;
  displayName: string;
  className?: string;
}) {
  // Local state for now; becomes the follow/unfollow mutations later.
  const [following, setFollowing] = useState(initialFollowing);

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow ${displayName}` : `Follow ${displayName}`}
      onClick={() => setFollowing((v) => !v)}
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
