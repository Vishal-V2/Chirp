import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { ProfileFieldsFragment } from "@/generated/gql/graphql";
import { formatCount, formatJoined } from "@/lib/format";
import { EditProfileDialog, type ProfileSave } from "./edit-profile-dialog";
import { FollowButton } from "./follow-button";

export function ProfileHeader({
  user,
  isSelf,
  onSave,
}: {
  user: ProfileFieldsFragment;
  isSelf: boolean;
  onSave: (edits: ProfileSave) => Promise<string | void>;
}) {
  return (
    <section className="border-b">
      {/* Banner: image if set, otherwise a soft gradient. */}
      <div className="aspect-[3/1] bg-gradient-to-br from-primary/60 via-primary/30 to-muted">
        {user.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.bannerUrl} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-start justify-between">
          <UserAvatar
            name={user.displayName}
            username={user.username}
            src={user.avatarUrl ?? undefined}
            className="-mt-10 size-20 border-4 border-background after:hidden sm:-mt-[67px] sm:size-[134px]"
            fallbackClassName="text-3xl sm:text-4xl"
          />
          <div className="pt-3">
            {isSelf ? (
              <EditProfileDialog user={user} onSave={onSave} />
            ) : (
              <FollowButton
                userId={user.id}
                displayName={user.displayName}
                following={user.viewerIsFollowing}
              />
            )}
          </div>
        </div>

        <div className="mt-3 leading-tight">
          <h2 className="text-xl font-extrabold">{user.displayName}</h2>
          <p className="text-muted-foreground">@{user.username}</p>
        </div>

        {user.bio && <p className="mt-3 whitespace-pre-wrap">{user.bio}</p>}

        <p className="mt-3 flex items-center gap-1 text-muted-foreground">
          <CalendarDays className="size-[18px]" />
          {formatJoined(user.createdAt)}
        </p>

        <div className="mt-3 flex gap-5 text-sm">
          <Link
            href={`/${user.username}/following`}
            className="hover:underline"
          >
            <span className="font-bold text-foreground">
              {formatCount(user.followingCount) || 0}
            </span>{" "}
            <span className="text-muted-foreground">Following</span>
          </Link>
          <Link
            href={`/${user.username}/followers`}
            className="hover:underline"
          >
            <span className="font-bold text-foreground">
              {formatCount(user.followerCount) || 0}
            </span>{" "}
            <span className="text-muted-foreground">
              {user.followerCount === 1 ? "Follower" : "Followers"}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
