"use client";

import Link from "next/link";
import { useViewer } from "@/components/providers/viewer-provider";
import { UserAvatar } from "@/components/user-avatar";
import type { UserListFieldsFragment } from "@/generated/gql/graphql";
import { FollowButton } from "./follow-button";

/** One person in a Followers/Following list. */
export function UserRow({ user }: { user: UserListFieldsFragment }) {
  const viewer = useViewer();
  const isSelf = viewer?.id === user.id;

  return (
    <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <Link href={`/${user.username}`} className="h-fit shrink-0">
        <UserAvatar
          name={user.displayName}
          username={user.username}
          src={user.avatarUrl ?? undefined}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Link
            href={`/${user.username}`}
            className="min-w-0 flex-1 leading-tight"
          >
            <p className="truncate font-bold hover:underline">
              {user.displayName}
            </p>
            <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span className="truncate">@{user.username}</span>
              {user.followsViewer && (
                <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[11px] font-medium">
                  Follows you
                </span>
              )}
            </p>
          </Link>
          {!isSelf && (
            <FollowButton
              userId={user.id}
              displayName={user.displayName}
              following={user.viewerIsFollowing}
              className="h-8 min-w-20"
            />
          )}
        </div>
        {user.bio && (
          <p className="mt-1 line-clamp-2 text-[15px]">{user.bio}</p>
        )}
      </div>
    </div>
  );
}
