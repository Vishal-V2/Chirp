"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "urql";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreateGroupMutation,
  StartConversationMutation,
} from "@/graphql/client/messages";
import { PeoplePicker, type PickedPerson } from "./people-picker";

/** Groups hold up to 20 people, you included (matches the server). */
const MAX_OTHERS = 19;

/**
 * New message: pick one person for a 1-on-1 chat, or several (up to 19) for
 * a group, with an optional group name.
 */
export function NewMessageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<PickedPerson[]>([]);
  const [name, setName] = useState("");
  const [{ fetching: starting }, start] = useMutation(
    StartConversationMutation,
  );
  const [{ fetching: creating }, createGroup] =
    useMutation(CreateGroupMutation);
  const busy = starting || creating;
  const isGroup = picked.length >= 2;

  function close() {
    setPicked([]);
    setName("");
    onOpenChange(false);
  }

  async function go() {
    const result = isGroup
      ? await createGroup({
          userIds: picked.map((p) => p.id),
          name: name.trim() || null,
        })
      : await start({ userId: picked[0].id });
    const id =
      result.data &&
      ("createGroup" in result.data
        ? result.data.createGroup.id
        : result.data.startConversation.id);
    if (result.error || !id) {
      toast.error(
        result.error?.graphQLErrors[0]?.message ?? "Couldn't start the chat.",
      );
      return;
    }
    close();
    router.push(`/messages/${id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <DialogTitle className="font-heading text-xl font-bold tracking-tight">
              New message
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Pick one person, or several to start a group (up to 20 people).
            </DialogDescription>
          </div>
          <button
            type="button"
            disabled={picked.length === 0 || busy}
            onClick={() => void go()}
            className="pressable h-9 shrink-0 rounded-full bg-foreground px-4 text-sm font-bold text-background disabled:opacity-40"
          >
            {busy ? "Starting…" : isGroup ? "Create group" : "Chat"}
          </button>
        </div>
        {isGroup && (
          <div className="px-4 pb-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Group name (optional)"
              aria-label="Group name"
              className="h-10 w-full rounded-md border bg-transparent px-3 text-[15px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
        <PeoplePicker picked={picked} onChange={setPicked} max={MAX_OTHERS} />
      </DialogContent>
    </Dialog>
  );
}
