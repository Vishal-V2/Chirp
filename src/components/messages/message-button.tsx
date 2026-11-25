"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "urql";
import { StartConversationMutation } from "@/graphql/client/messages";

/** Envelope button on profiles: opens (or creates) your conversation with them. */
export function MessageButton({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [{ fetching }, start] = useMutation(StartConversationMutation);

  return (
    <button
      type="button"
      aria-label={`Message ${displayName}`}
      title={`Message ${displayName}`}
      disabled={fetching}
      onClick={async () => {
        const result = await start({ userId });
        if (result.error || !result.data) {
          toast.error(
            result.error?.graphQLErrors[0]?.message ??
              "Couldn't open the conversation.",
          );
          return;
        }
        router.push(`/messages/${result.data.startConversation.id}`);
      }}
      className="pressable flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted disabled:opacity-60"
    >
      <Mail className="size-[18px]" />
    </button>
  );
}
