"use client";

import Link from "next/link";
import { useQuery } from "urql";
import { FollowButton } from "@/components/user/follow-button";
import { UserAvatar } from "@/components/user-avatar";
import { WhoToFollowQuery } from "@/graphql/client/users";

/** Real suggestions: accounts you don't follow yet, most-followed first. */
export function WhoToFollow() {
  // Keep the list stable while you follow people from it (no refetch on change).
  const [{ data }] = useQuery({
    query: WhoToFollowQuery,
    requestPolicy: "cache-first",
  });
  const users = data?.whoToFollow;
  if (!users || users.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border">
      <h2 className="px-4 pt-3 pb-1 text-xl font-extrabold">Who to follow</h2>
      <ul>
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
          >
            <Link
              href={`/${user.username}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <UserAvatar
                name={user.displayName}
                username={user.username}
                src={user.avatarUrl ?? undefined}
              />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-bold hover:underline">
                  {user.displayName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </Link>
            <FollowButton
              userId={user.id}
              displayName={user.displayName}
              following={user.viewerIsFollowing}
              className="h-8 min-w-20"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
