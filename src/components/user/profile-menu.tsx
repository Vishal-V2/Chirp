"use client";

import { Ban, Link2, MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProfileFieldsFragment } from "@/generated/gql/graphql";
import { useSafetyActions } from "@/hooks/use-safety-actions";
import { BlockDialog } from "./block-dialog";

/** The "⋯" menu on someone else's profile: mute, block, copy link. */
export function ProfileMenu({ user }: { user: ProfileFieldsFragment }) {
  const { toggleMute, toggleBlock, blockDialog } = useSafetyActions(user);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${user.username}`,
      );
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More"
          className="pressable flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted data-popup-open:bg-muted"
        >
          <MoreHorizontal className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem
            onClick={() => void toggleMute()}
            className="py-2 text-[15px]"
          >
            {user.viewerHasMuted ? <Volume2 /> : <VolumeX />}
            {user.viewerHasMuted ? "Unmute" : "Mute"} @{user.username}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void toggleBlock()}
            className="py-2 text-[15px]"
          >
            <Ban />
            {user.viewerHasBlocked ? "Unblock" : "Block"} @{user.username}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyLink} className="py-2 text-[15px]">
            <Link2 />
            Copy link to profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BlockDialog {...blockDialog} />
    </>
  );
}

/** Red "Blocked" button on a profile you blocked; turns into "Unblock" on hover. */
export function BlockedButton({ user }: { user: ProfileFieldsFragment }) {
  const { toggleBlock } = useSafetyActions(user);
  return (
    <button
      type="button"
      onClick={() => void toggleBlock()}
      className="group pressable h-9 min-w-24 rounded-full bg-destructive px-4 text-[15px] font-bold text-white hover:bg-destructive/90"
    >
      <span className="group-hover:hidden">Blocked</span>
      <span className="hidden group-hover:inline">Unblock</span>
    </button>
  );
}
