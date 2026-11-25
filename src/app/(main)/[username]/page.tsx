import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/user/profile-view";
import { getViewer } from "@/lib/auth";
import {
  getLikedTweets,
  getRepliesByAuthor,
  getTweetsByAuthor,
  getUserByUsername,
  type MockUser,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

/**
 * Sample data first; otherwise a real account from the database.
 * (Temporary until the pages are switched fully to GraphQL.)
 */
async function findUser(username: string): Promise<MockUser | undefined> {
  const mock = getUserByUsername(username);
  if (mock) return mock;

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    include: { _count: { select: { followers: true, following: true } } },
  });
  if (!user) return undefined;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    bannerUrl: user.bannerUrl ?? undefined,
    createdAt: user.createdAt.toISOString(),
    followerCount: user._count.followers,
    followingCount: user._count.following,
    viewerIsFollowing: false,
  };
}

export async function generateMetadata(props: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const user = await findUser(decodeURIComponent(username));
  return { title: user ? `${user.displayName} (@${user.username})` : "Profile" };
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const [user, viewer] = await Promise.all([
    findUser(decodeURIComponent(username)),
    getViewer(),
  ]);
  if (!user) notFound();

  const isSelf = user.id === viewer?.userId;
  const isMock = Boolean(getUserByUsername(user.username));

  return (
    <ProfileView
      initialUser={user}
      isSelf={isSelf}
      posts={getTweetsByAuthor(user.username)}
      replies={getRepliesByAuthor(user.username)}
      likes={isSelf && isMock ? getLikedTweets() : []}
    />
  );
}
