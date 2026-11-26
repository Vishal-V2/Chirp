"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "urql";
import { BlockDialog } from "@/components/user/block-dialog";
import {
  AcceptMessageRequestMutation,
  DeleteMessageRequestMutation,
  LeaveGroupMutation,
} from "@/graphql/client/messages";
import { useSafetyActions } from "@/hooks/use-safety-actions";

/**
 * Shown on a message request: someone you don't follow wrote to you.
 * Accept moves the chat to your inbox (replying does too).
 */
export function RequestBar(
  props: { conversationId: string } & (
    | { other: { id: string; username: string; displayName: string } }
    | { group: { title: string; addedBy: string } }
  ),
) {
  if ("group" in props) {
    return (
      <GroupRequestBar conversationId={props.conversationId} {...props.group} />
    );
  }
  return (
    <PersonRequestBar
      conversationId={props.conversationId}
      other={props.other}
    />
  );
}

/** Someone you don't follow added you to a group: accept or leave. */
function GroupRequestBar({
  conversationId,
  title,
  addedBy,
}: {
  conversationId: string;
  title: string;
  addedBy: string;
}) {
  const router = useRouter();
  const [{ fetching: accepting }, accept] = useMutation(
    AcceptMessageRequestMutation,
  );
  const [{ fetching: leaving }, leave] = useMutation(LeaveGroupMutation);
  return (
    <div className="border-t bg-muted/40 px-4 py-4 text-center">
      <p className="font-bold">
        {addedBy} added you to {title}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Accept to move this group to your inbox, or leave it.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          disabled={accepting || leaving}
          onClick={async () => {
            const r = await accept({ conversationId });
            if (r.error) toast.error("Couldn't accept.");
          }}
          className="pressable h-9 rounded-full bg-foreground px-5 text-sm font-bold text-background disabled:opacity-60"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={accepting || leaving}
          onClick={async () => {
            const r = await leave({ conversationId });
            if (r.error) return void toast.error("Couldn't leave the group.");
            toast.success("You left the group");
            router.push("/messages/requests");
          }}
          className="pressable h-9 rounded-full border border-destructive/50 px-5 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          Leave
        </button>
      </div>
    </div>
  );
}

/** Someone you don't follow wrote to you: accept, delete or block. */
function PersonRequestBar({
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
