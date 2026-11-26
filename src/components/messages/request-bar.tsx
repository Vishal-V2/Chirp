"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "urql";
import { BlockDialog } from "@/components/user/block-dialog";
import {
  AcceptMessageRequestMutation,
  DeleteMessageRequestMutation,
} from "@/graphql/client/messages";
import { useSafetyActions } from "@/hooks/use-safety-actions";

/**
 * Shown on a message request: someone you don't follow wrote to you.
 * Accept moves the chat to your inbox (replying does too).
 */
export function RequestBar({
  conversationId,
  other,
}: {
  conversationId: string;
  other: { id: string; username: string; displayName: string };
}) {
  const router = useRouter();
  const [{ fetching: accepting }, accept] = useMutation(
    AcceptMessageRequestMutation,
  );
  const [{ fetching: deleting }, remove] = useMutation(
    DeleteMessageRequestMutation,
  );
  const { toggleBlock, blockDialog } = useSafetyActions(other);
  const busy = accepting || deleting;

  return (
    <div className="border-t bg-muted/40 px-4 py-4 text-center">
      <p className="font-bold">{other.displayName} wants to message you</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        You don&apos;t follow @{other.username}. Accept to move this chat to
        your inbox; they won&apos;t know you saw it until you do.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const r = await accept({ conversationId });
            if (r.error) toast.error("Couldn't accept the request.");
          }}
          className="pressable h-9 rounded-full bg-foreground px-5 text-sm font-bold text-background disabled:opacity-60"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const r = await remove({ conversationId });
            if (r.error)
              return void toast.error("Couldn't delete the request.");
            toast.success("Request deleted");
            router.push("/messages/requests");
          }}
          className="pressable h-9 rounded-full border px-5 text-sm font-bold hover:bg-muted disabled:opacity-60"
        >
          Delete
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleBlock()}
          className="pressable h-9 rounded-full border border-destructive/50 px-5 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          Block
        </button>
      </div>
      <BlockDialog {...blockDialog} />
    </div>
  );
}
