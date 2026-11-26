"use client";

import { UserAvatar } from "@/components/user-avatar";
import { useSignedImageUrls } from "@/lib/message-media";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

/** What a chat needs to show its name and picture. */
export type ChatLike = {
  isGroup: boolean;
  name?: string | null;
  photoPath?: string | null;
  participants: { user: Person }[];
  otherParticipant?: Person | null;
};

/** The other people in a chat (everyone but you). */
export const othersIn = (chat: ChatLike, viewerId?: string) =>
  chat.participants.map((p) => p.user).filter((u) => u.id !== viewerId);

/** A chat's title: the group name, or its members' first names. */
export function chatTitle(chat: ChatLike, viewerId?: string) {
  if (!chat.isGroup) return chat.otherParticipant?.displayName ?? "Chat";
  if (chat.name) return chat.name;
  const names = othersIn(chat, viewerId).map(
    (u) => u.displayName.split(" ")[0],
  );
  if (names.length <= 3) return names.join(", ") || "Group";
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`;
}

/** A chat's picture: the person, the group photo, or two stacked avatars. */
export function ChatAvatar({
  chat,
  viewerId,
  className = "size-12",
}: {
  chat: ChatLike;
  viewerId?: string;
  className?: string;
}) {
  const photo = useSignedImageUrls(chat.photoPath ? [chat.photoPath] : []);
  if (!chat.isGroup && chat.otherParticipant) {
    const u = chat.otherParticipant;
    return (
      <UserAvatar
        name={u.displayName}
        username={u.username}
        src={u.avatarUrl ?? undefined}
        className={className}
      />
    );
  }
  const url = chat.photoPath ? photo[chat.photoPath] : undefined;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  const [a, b] = othersIn(chat, viewerId);
  return (
    <span className={cn("relative block shrink-0", className)} aria-hidden>
      {a && (
        <UserAvatar
          name={a.displayName}
          username={a.username}
          src={a.avatarUrl ?? undefined}
          className="absolute top-0 left-0 size-[68%] ring-2 ring-background"
          fallbackClassName="text-[0.55em]"
        />
      )}
      {b && (
        <UserAvatar
          name={b.displayName}
          username={b.username}
          src={b.avatarUrl ?? undefined}
          className="absolute right-0 bottom-0 size-[68%] ring-2 ring-background"
          fallbackClassName="text-[0.55em]"
        />
      )}
    </span>
  );
}
