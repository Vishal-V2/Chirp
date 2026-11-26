"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/** "Block @name?" confirmation (state comes from useSafetyActions). */
export function BlockDialog({
  open,
  username,
  pending,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  username: string;
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-8 sm:max-w-80 sm:rounded-2xl"
        // Clicks inside the dialog must not open the chirp underneath.
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle className="font-heading text-xl font-bold tracking-tight">
          Block @{username}?
        </DialogTitle>
        <DialogDescription className="mt-2 text-[15px]">
          They won&apos;t be able to follow you, reply to, quote or like your
          chirps, or message you, and you won&apos;t see their chirps. You can
          unblock them any time.
        </DialogDescription>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="pressable h-11 rounded-full bg-destructive font-bold text-white hover:bg-destructive/90 disabled:opacity-60"
          >
            {pending ? "Blocking…" : "Block"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="pressable h-11 rounded-full border font-bold hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
