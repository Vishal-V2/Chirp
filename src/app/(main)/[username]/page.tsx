import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ProfileView } from "@/components/user/profile-view";
import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Just enough to 404, fix the URL's capitalization, and title the page. */
const findUser = cache((username: string) =>
  prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true, displayName: true },
  }),
);

export async function generateMetadata(
  props: PageProps<"/[username]">,
): Promise<Metadata> {
  const { username } = await props.params;
  const user = await findUser(decodeURIComponent(username));
  return {
    title: user ? `${user.displayName} (@${user.username})` : "Profile",
  };
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const [user, viewer] = await Promise.all([
    findUser(decodeURIComponent(username)),
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
