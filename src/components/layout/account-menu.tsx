"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bookmark, LogOut, MoreHorizontal, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import type { ViewerProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** The signed-in user's avatar button, with profile link and log out. */
export function AccountMenu({
  viewer,
  variant = "sidebar",
}: {
  viewer: ViewerProfile;
  variant?: "sidebar" | "compact";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-3 rounded-full transition-colors hover:bg-muted data-popup-open:bg-muted",
          variant === "sidebar" ? "p-2 xl:w-full" : "p-0.5",
        )}
      >
        <UserAvatar
          name={viewer.displayName}
          username={viewer.username}
          src={viewer.avatarUrl ?? undefined}
          className={variant === "compact" ? "size-8" : undefined}
        />
        {variant === "sidebar" && (
          <>
            <div className="hidden min-w-0 flex-1 text-left leading-tight xl:block">
              <p className="truncate font-bold">{viewer.displayName}</p>
              <p className="truncate text-sm text-muted-foreground">
                @{viewer.username}
              </p>
            </div>
            <MoreHorizontal className="hidden size-5 xl:block" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={variant === "sidebar" ? "top" : "bottom"}
        align="start"
        className="w-60"
      >
        <DropdownMenuItem
          render={<Link href={`/${viewer.username}`} />}
          className="py-2 text-[15px]"
        >
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/bookmarks" />}
          className="py-2 text-[15px]"
        >
          <Bookmark />
          Bookmarks
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
          className="py-2 text-[15px]"
        >
          <LogOut />
          {pending ? "Logging out…" : `Log out @${viewer.username}`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
