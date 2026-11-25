import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConnectionsView } from "@/components/user/connections-view";
import { getViewer } from "@/lib/auth";
import { findUserByUsername } from "@/lib/users";

export async function generateMetadata(
  props: PageProps<"/[username]/followers">,
): Promise<Metadata> {
  const { username } = await props.params;
  const user = await findUserByUsername(decodeURIComponent(username));
  return { title: user ? `People following ${user.displayName}` : "Profile" };
}

export default async function FollowersPage(
  props: PageProps<"/[username]/followers">,
) {
  const { username } = await props.params;
  const [user, viewer] = await Promise.all([
    findUserByUsername(decodeURIComponent(username)),
    getViewer(),
  ]);
  if (!user) notFound();
  if (user.username !== decodeURIComponent(username))
    redirect(`/${user.username}/followers`);

  return (
    <ConnectionsView
      kind="followers"
      username={user.username}
      displayName={user.displayName}
      isSelf={user.id === viewer?.userId}
    />
  );
}
