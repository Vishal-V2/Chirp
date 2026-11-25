"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileHeader } from "./profile-header";
import { ProfileTabs } from "./profile-tabs";
import type { MockTweet, MockUser } from "@/lib/mock-data";

/**
 * Holds the profile in client state so edits show up immediately.
 * With the real API this becomes the upsertProfile mutation + cache update.
 */
export function ProfileView({
  initialUser,
  isSelf,
  posts,
  replies,
  likes,
}: {
  initialUser: MockUser;
  isSelf: boolean;
  posts: MockTweet[];
  replies: MockTweet[];
  likes: MockTweet[];
}) {
  const [user, setUser] = useState(initialUser);
  // Show the edited name/avatar on the user's own tweets too.
  const withAuthor = (t: MockTweet) =>
    t.author.id === user.id ? { ...t, author: user } : t;

  return (
    <>
      <PageHeader
        back
        title={user.displayName}
        subtitle={`${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
      />
      <ProfileHeader
        user={user}
        isSelf={isSelf}
        onProfileChange={(edits) => setUser((u) => ({ ...u, ...edits }))}
      />
      <ProfileTabs
        username={user.username}
        isSelf={isSelf}
        posts={posts.map(withAuthor)}
        replies={replies.map(withAuthor)}
        likes={likes.map(withAuthor)}
      />
    </>
  );
}
