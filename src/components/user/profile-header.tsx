"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { CalendarDays } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { ProfileFieldsFragment } from "@/generated/gql/graphql";
import { formatCount, formatJoined } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MessageButton } from "@/components/messages/message-button";
import { EditProfileDialog, type ProfileSave } from "./edit-profile-dialog";
import { FollowButton } from "./follow-button";
import { BlockedButton, ProfileMenu } from "./profile-menu";

export function ProfileHeader({
  user,
  isSelf,
  onSave,
}: {
  user: ProfileFieldsFragment;
  isSelf: boolean;
  onSave: (edits: ProfileSave) => Promise<string | void>;
}) {
  // Banner drifts slower than the page; the avatar shrinks as you scroll past.
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const bannerY = useTransform(scrollY, [0, 300], [0, 90]);
  const avatarScale = useTransform(scrollY, [0, 180], [1, 0.72]);
  // The plumage sheen shifts as you scroll, like feathers catching light.
  const sheen = useTransform(scrollY, [0, 400], ["0% 30%", "100% 70%"]);

  return (
    <section className="border-b">
      {/* Banner: the uploaded image, or Chirp's iridescent plumage. */}
      <div className="aspect-[3/1] overflow-hidden bg-muted">
        <motion.div
          className={cn("size-full", !user.bannerUrl && "plumage")}
          style={
            reduceMotion
              ? undefined
              : {
                  y: bannerY,
                  scale: 1.15,
                  backgroundPosition: user.bannerUrl ? undefined : sheen,
                }
          }
        >
          {user.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.bannerUrl}
              alt=""
              className="size-full object-cover"
            />
          )}
        </motion.div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-start justify-between">
          <motion.div
            className="relative origin-bottom-left"
            style={reduceMotion ? undefined : { scale: avatarScale }}
          >
            <UserAvatar
              name={user.displayName}
              username={user.username}
              src={user.avatarUrl ?? undefined}
              className="-mt-10 size-20 border-4 border-background after:hidden sm:-mt-[67px] sm:size-[134px]"
              fallbackClassName="text-3xl sm:text-4xl"
            />
          </motion.div>
          <div className="pt-3">
            {isSelf ? (
              <EditProfileDialog user={user} onSave={onSave} />
            ) : (
              <div className="flex items-center gap-2">
                <ProfileMenu user={user} />
                {user.viewerHasBlocked ? (
                  <BlockedButton user={user} />
                ) : user.blocksViewer ? null : (
                  <>
                    <MessageButton
                      userId={user.id}
                      displayName={user.displayName}
                    />
                    <FollowButton
                      userId={user.id}
                      displayName={user.displayName}
                      following={user.viewerIsFollowing}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 leading-tight">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">
            {user.displayName}
          </h2>
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
