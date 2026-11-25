"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useMutation } from "urql";
import { useViewer } from "@/components/viewer-provider";
import type { PollFieldsFragment } from "@/generated/gql/graphql";
import { VotePollMutation } from "@/graphql/client/tweets";
import { cn } from "@/lib/utils";

function timeLeft(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60)
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} left`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

/** A chirp's poll: choices to tap, or results once you've voted / it ended. */
export function TweetPoll({ poll }: { poll: PollFieldsFragment }) {
  const viewer = useViewer();
  const [, vote] = useMutation(VotePollMutation);
  // Your pick, shown straight away while the vote is being saved.
  const [pending, setPending] = useState<string | null>(null);

  const myVote = poll.viewerVoteOptionId ?? pending;
  const showResults =
    Boolean(myVote) || poll.isClosed || poll.viewerIsAuthor || !viewer;
  const counted = pending && !poll.viewerVoteOptionId; // add our vote until the server answers
  const total = poll.totalVotes + (counted ? 1 : 0);
  const countFor = (id: string, base: number) =>
    base + (counted && pending === id ? 1 : 0);
  const top = Math.max(...poll.options.map((o) => countFor(o.id, o.voteCount)));

  async function choose(optionId: string) {
    setPending(optionId);
    const result = await vote({ optionId });
    if (result.error) {
      toast.error(
        result.error.graphQLErrors[0]?.message ?? "Couldn't save your vote.",
      );
    }
    setPending(null);
  }

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {poll.options.map((o, i) => {
        if (!showResults) {
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => void choose(o.id)}
              className="pressable block w-full rounded-full border border-primary/60 px-4 py-2 text-center text-[15px] font-bold text-primary transition-colors hover:bg-primary/10"
            >
              {o.text}
            </button>
          );
        }
        const votes = countFor(o.id, o.voteCount);
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const leading = votes > 0 && votes === top;
        return (
          <div
            key={o.id}
            className="relative flex h-9 items-center overflow-hidden rounded-lg"
          >
            <motion.span
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 rounded-lg",
                leading ? "bg-primary/30" : "bg-muted",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pct, 1)}%` }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 20,
                delay: i * 0.05,
              }}
            />
            <span
              className={cn(
                "relative flex min-w-0 flex-1 items-center gap-1.5 px-3",
                leading && "font-bold",
              )}
            >
              <span className="truncate">{o.text}</span>
              {myVote === o.id && (
                <Check
                  className="size-4 shrink-0 text-primary"
                  aria-label="Your vote"
                />
              )}
            </span>
            <span
              className={cn(
                "relative px-3 tabular-nums",
                leading && "font-bold",
              )}
            >
              {pct}%
            </span>
          </div>
        );
      })}
      <p className="text-[13px] text-muted-foreground" suppressHydrationWarning>
        {total} {total === 1 ? "vote" : "votes"} ·{" "}
        {poll.isClosed ? "Final results" : timeLeft(poll.endsAt)}
      </p>
    </div>
  );
}
