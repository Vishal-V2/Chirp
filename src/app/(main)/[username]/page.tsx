import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProfileView } from "@/components/user/profile-view";
import { getViewer } from "@/lib/auth";
import { findUserByUsername } from "@/lib/users";

export async function generateMetadata(
  props: PageProps<"/[username]">,
): Promise<Metadata> {
  const { username } = await props.params;
  const user = await findUserByUsername(decodeURIComponent(username));
  return {
    title: user ? `${user.displayName} (@${user.username})` : "Profile",
  };
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const [user, viewer] = await Promise.all([
    findUserByUsername(decodeURIComponent(username)),
    getViewer(),
  ]);
  if (!user) notFound();
  if (user.username !== decodeURIComponent(username))
    redirect(`/${user.username}`);

  return (
    <ProfileView
      key={user.id}
      username={user.username}
      isSelf={user.id === viewer?.userId}
    />
  );
}
