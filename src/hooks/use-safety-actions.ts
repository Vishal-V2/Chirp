"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "urql";
import {
  BlockMutation,
  MuteMutation,
  UnblockMutation,
  UnmuteMutation,
} from "@/graphql/client/users";

export type SafetyTarget = {
  id: string;
  username: string;
  viewerHasMuted?: boolean;
  viewerHasBlocked?: boolean;
};

/**
 * Mute / unmute and block / unblock someone, with toasts. Blocking asks for
 * confirmation first: render <BlockDialog {...blockDialog} /> next to the menu.
 */
export function useSafetyActions(user: SafetyTarget) {
  const [, mute] = useMutation(MuteMutation);
  const [, unmute] = useMutation(UnmuteMutation);
  const [{ fetching: blocking }, block] = useMutation(BlockMutation);
  const [, unblock] = useMutation(UnblockMutation);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const vars = { userId: user.id };

  async function run(
    action: Promise<{ error?: { graphQLErrors: { message: string }[] } }>,
    done: string,
    undo?: () => void,
  ) {
    const { error } = await action;
    if (error) {
      toast.error(error.graphQLErrors[0]?.message ?? "Something went wrong.");
      return false;
    }
    toast.success(
      done,
      undo ? { action: { label: "Undo", onClick: undo } } : undefined,
    );
    return true;
  }

  const toggleMute = () =>
    user.viewerHasMuted
      ? run(unmute(vars), `Unmuted @${user.username}`)
      : run(mute(vars), `Muted @${user.username}`, () => void unmute(vars));

  const toggleBlock = () =>
    user.viewerHasBlocked
      ? run(unblock(vars), `Unblocked @${user.username}`)
      : setConfirmOpen(true);

  async function confirmBlock() {
    if (await run(block(vars), `Blocked @${user.username}`)) {
      setConfirmOpen(false);
    }
  }

  return {
    toggleMute,
    toggleBlock,
    blockDialog: {
      open: confirmOpen,
      username: user.username,
      pending: blocking,
      onConfirm: confirmBlock,
      onOpenChange: (open: boolean) => !blocking && setConfirmOpen(open),
    },
  };
}
