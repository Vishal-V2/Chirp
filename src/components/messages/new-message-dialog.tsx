"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { useViewer } from "@/components/providers/viewer-provider";
import { StartConversationMutation } from "@/graphql/client/messages";
import { SearchUsersQuery } from "@/graphql/client/users";

/** Pick someone to message: search by name or @username. */
export function NewMessageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const viewer = useViewer();
  const [text, setText] = useState("");
  const query = text.trim();
  const [{ data, fetching }] = useQuery({
    query: SearchUsersQuery,
    variables: { query },
    pause: !query,
  });
  const [{ fetching: starting }, start] = useMutation(
    StartConversationMutation,
  );
  const people = (data?.searchUsers ?? []).filter((u) => u.id !== viewer?.id);

  async function open1to1(userId: string) {
    const result = await start({ userId });
    if (result.error || !result.data) {
      toast.error(
        result.error?.graphQLErrors[0]?.message ??
          "Couldn't open the conversation.",
      );
      return;
    }
    onOpenChange(false);
    router.push(`/messages/${result.data.startConversation.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setText("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[80dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:rounded-2xl">
        <div className="border-b px-4 pt-4 pb-3">
          <DialogTitle className="font-heading text-xl font-bold tracking-tight">
            New message
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search for a person to message.
          </DialogDescription>
          <label className="mt-3 flex h-10 items-center gap-2 rounded-full bg-muted px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
            <Search className="size-4" aria-hidden />
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        <div className="min-h-40 overflow-y-auto py-1">
          {!query ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Type a name or @username.
            </p>
          ) : fetching && people.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          ) : people.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No one matches “{query}”.
            </p>
          ) : (
            people.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={starting}
                onClick={() => void open1to1(u.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
              >
                <UserAvatar
                  name={u.displayName}
                  username={u.username}
                  src={u.avatarUrl ?? undefined}
                />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-bold">
                    {u.displayName}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    @{u.username}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
