"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "urql";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileQuery, UpdateProfileMutation } from "@/graphql/client/users";
import { deleteProfileImage, uploadProfileImage } from "@/lib/upload";
import type { ProfileSave } from "./edit-profile-dialog";
import { ProfileHeader } from "./profile-header";
import { ProfileTabs } from "./profile-tabs";

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile">
      <div className="aspect-[3/1] skeleton" />
      <div className="space-y-3 px-4 py-4">
        <div className="-mt-14 size-20 rounded-full border-4 border-background skeleton sm:size-[134px]" />
        <div className="h-5 w-40 rounded skeleton" />
        <div className="h-4 w-24 rounded skeleton" />
      </div>
    </div>
  );
}

/** A user's profile page, from the GraphQL API. */
export function ProfileView({
  username,
  isSelf,
}: {
  username: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [{ data, error }, reexecute] = useQuery({
    query: ProfileQuery,
    variables: { username },
  });
  const [, updateProfile] = useMutation(UpdateProfileMutation);
  const user = data?.user;

  async function save(edits: ProfileSave): Promise<string | void> {
    if (!user) return "Profile not loaded yet.";
    try {
      // Upload any new images first, then save everything in one go.
      const [avatarUrl, bannerUrl] = await Promise.all([
        edits.avatarFile
          ? uploadProfileImage(user.id, "avatar", edits.avatarFile)
          : edits.avatarUrl,
        edits.bannerFile
          ? uploadProfileImage(user.id, "banner", edits.bannerFile)
          : edits.bannerUrl,
      ]);
      const result = await updateProfile({
        input: {
          displayName: edits.displayName,
          username: edits.username,
          bio: edits.bio,
          avatarUrl,
          bannerUrl,
        },
      });
      if (result.error) {
        return (
          result.error.graphQLErrors[0]?.message ??
          "Couldn't save your profile."
        );
      }
      // Remove images that were replaced or removed (best effort).
      if (user.avatarUrl !== avatarUrl) void deleteProfileImage(user.avatarUrl);
      if (user.bannerUrl !== bannerUrl) void deleteProfileImage(user.bannerUrl);
      // New username: the profile now lives at a new address.
      if (edits.username && edits.username !== user.username) {
        router.replace(`/${edits.username}`);
      }
      // Refresh server-rendered parts (sidebar account button) with the new name/photo.
      router.refresh();
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn't save your profile.";
    }
  }

  return (
    <>
      <PageHeader
        back
        title={user?.displayName ?? "Profile"}
        subtitle={
          user
            ? `${user.tweetCount} ${user.tweetCount === 1 ? "chirp" : "chirps"}`
            : undefined
        }
      />
      {user ? (
        <>
          <ProfileHeader user={user} isSelf={isSelf} onSave={save} />
          {user.blocksViewer ? (
            <BlockNotice title="You're blocked">
              You can&apos;t follow or see @{user.username}&apos;s chirps.
            </BlockNotice>
          ) : user.viewerHasBlocked ? (
            <BlockNotice title={`@${user.username} is blocked`}>
              You won&apos;t see their chirps, and they can&apos;t follow you,
              reply to you or message you. Unblock them to see their profile.
            </BlockNotice>
          ) : (
            <ProfileTabs
              username={user.username}
              displayName={user.displayName}
              isSelf={isSelf}
            />
          )}
        </>
      ) : error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">
            Couldn&apos;t load this profile.
          </p>
          <button
            type="button"
            onClick={() => reexecute({ requestPolicy: "network-only" })}
            className="mt-3 h-9 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : (
        <ProfileSkeleton />
      )}
    </>
  );
}

/** Shown instead of the tabs when there's a block between you. */
function BlockNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm px-8 py-12">
      <h3 className="font-heading text-[31px] leading-tight font-extrabold tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-[15px] text-muted-foreground">{children}</p>
    </div>
  );
}
