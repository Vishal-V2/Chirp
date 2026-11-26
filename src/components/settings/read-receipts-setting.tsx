"use client";

import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import {
  DmPolicyQuery,
  SetReadReceiptsMutation,
} from "@/graphql/client/messages";
import { cn } from "@/lib/utils";

/** Settings → Who can message you → Read receipts. */
export function ReadReceiptsSetting() {
  const [{ data }] = useQuery({ query: DmPolicyQuery });
  const [{ fetching }, save] = useMutation(SetReadReceiptsMutation);
  const on = data?.me?.readReceipts;

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">Read receipts</span>
        <span className="block text-[13px] text-muted-foreground">
          Let people see when you&apos;ve read their messages
          (&ldquo;Seen&rdquo;). If you turn this off, you won&apos;t see theirs
          either.
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(on)}
        aria-label="Read receipts"
        disabled={on === undefined || on === null || fetching}
        onClick={async () => {
          const r = await save({ on: !on });
          if (r.error) toast.error("Couldn't save that setting.");
        }}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
          on ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
            on && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
