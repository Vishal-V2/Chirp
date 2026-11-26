"use client";

import { useRef, useState } from "react";
import { MoreHorizontal, Trash2, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 450;

/**
 * Wraps a chat message with its menu: a "⋯" that appears on hover (computers)
 * or a long-press on the message (phones). Your own messages can be unsent
 * (with confirmation); any message can be deleted for you.
 */
export function MessageActions({
  mine,
  canUnsend,
  onUnsend,
  onDeleteForMe,
  children,
}: {
  mine: boolean;
  /** Your own message that hasn't been unsent yet. */
  canUnsend: boolean;
  onUnsend: () => void;
  onDeleteForMe: () => void;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelPress = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = undefined;
  };

  const menu = (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        aria-label="Message options"
        className={cn(
          "mb-1 shrink-0 self-center rounded-full p-1.5 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
          // Shown on hover / keyboard focus on computers; on touch screens a
          // long-press opens the menu instead.
          "opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:pointer-events-none",
        )}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mine ? "end" : "start"} className="w-52">
        {canUnsend && (
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="py-2 text-[15px]"
          >
            <Undo2 />
            Unsend
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onClick={onDeleteForMe}
          className="py-2 text-[15px]"
        >
          <Trash2 />
          Delete for you
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className={cn(
        "group/msg flex max-w-[85%] items-end gap-1",
        mine ? "flex-row" : "flex-row-reverse",
      )}
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        pressTimer.current = setTimeout(() => {
          navigator.vibrate?.(10);
          setMenuOpen(true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancelPress}
      onPointerMove={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      // A long-press would otherwise open the phone's own menu.
      onContextMenu={(e) => {
        if (menuOpen || pressTimer.current) e.preventDefault();
      }}
    >
      {menu}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          mine ? "items-end" : "items-start",
        )}
      >
        {children}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 p-8 sm:max-w-80 sm:rounded-2xl"
        >
          <DialogTitle className="font-heading text-xl font-bold tracking-tight">
            Unsend message?
          </DialogTitle>
          <DialogDescription className="mt-2 text-[15px]">
            It&apos;ll be removed for both of you, and they&apos;ll see
            &ldquo;This message was deleted&rdquo; in its place.
          </DialogDescription>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                onUnsend();
              }}
              className="pressable h-11 rounded-full bg-destructive font-bold text-white hover:bg-destructive/90"
            >
              Unsend
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="pressable h-11 rounded-full border font-bold hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
