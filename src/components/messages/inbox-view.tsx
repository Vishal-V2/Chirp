"use client";

import { useState } from "react";
import Link from "next/link";
import { MailPlus } from "lucide-react";
import { useQuery } from "urql";
import { EmptyState } from "@/components/feed/tweet-feed";
import { UserAvatar } from "@/components/user-avatar";
import { useViewer } from "@/components/viewer-provider";
import { ConversationsQuery } from "@/graphql/client/messages";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewMessageDialog } from "./new-message-dialog";
import { useLiveMessages } from "./realtime-provider";

function RowSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3" aria-hidden>
      <div className="skeleton size-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 py-1.5">
        <div className="skeleton h-3.5 w-1/3 rounded" />
        <div className="skeleton h-3.5 w-2/3 rounded" />
      </div>
    </div>
  );
}

/** Your conversations, kept current over the WebSocket. */
export function InboxView() {
  const viewer = useViewer();
  const [composing, setComposing] = useState(false);
  const [{ data, error }, refetch] = useQuery({ query: ConversationsQuery });

  // A message arrived in any of your conversations: re-sort and update counts.
  useLiveMessages(() => refetch({ requestPolicy: "network-only" }));

  const conversations = data?.conversations;

  return (
    <>
      <div className="autohide-top sticky top-0 z-10 flex h-[53px] items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md">
        <h1 className="font-heading text-xl font-bold tracking-tight">
          Messages
        </h1>
        <button
          type="button"
          aria-label="New message"
          title="New message"
          onClick={() => setComposing(true)}
          className="pressable -mr-2 rounded-full p-2 transition-colors hover:bg-muted"
        >
          <MailPlus className="size-5" />
        </button>
      </div>

      {!conversations ? (
        error ? (
          <p className="px-4 py-8 text-center text-muted-foreground">
            Couldn&apos;t load your messages.
          </p>
        ) : (
          <div role="status" aria-label="Loading conversations">
            {Array.from({ length: 5 }, (_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )
      ) : conversations.length === 0 ? (
        <div>
          <EmptyState
            title="Welcome to your inbox"
            body="Send a private message to anyone on Chirp. Messages arrive the moment they're sent."
          />
          <div className="-mt-6 px-8 pb-12">
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="pressable mx-auto block h-11 rounded-full bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
            >
              Write a message
            </button>
          </div>
        </div>
      ) : (
        <ul>
          {conversations.map((c) => {
            const other = c.otherParticipant;
            const unread = c.unreadCount > 0;
            const last = c.lastMessage;
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <UserAvatar
                    name={other.displayName}
                    username={other.username}
                    src={other.avatarUrl ?? undefined}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "truncate",
                          unread ? "font-extrabold" : "font-bold",
                        )}
                      >
                        {other.displayName}
                      </span>
                      <span className="truncate text-muted-foreground">
                        @{other.username}
                      </span>
                      {last && (
                        <time
                          dateTime={last.createdAt}
                          suppressHydrationWarning
                          className="ml-auto shrink-0 text-sm text-muted-foreground"
                        >
                          {formatRelativeTime(last.createdAt)}
                        </time>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "min-w-0 flex-1 truncate text-[15px]",
                          unread
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {last
                          ? `${last.senderId === viewer?.id ? "You: " : ""}${last.content}`
                          : ""}
                      </p>
                      {unread && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <NewMessageDialog open={composing} onOpenChange={setComposing} />
    </>
  );
}
