"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MailPlus, MailQuestion } from "lucide-react";
import { useQuery } from "urql";
import { EmptyState } from "@/components/feed/tweet-feed";
import { useViewer } from "@/components/providers/viewer-provider";
import {
  ConversationsQuery,
  MessageRequestCountQuery,
  MessageRequestsQuery,
} from "@/graphql/client/messages";
import { BackButton } from "@/components/layout/back-button";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewMessageDialog } from "./new-message-dialog";
import { ChatAvatar, chatTitle } from "./chat-identity";
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

/**
 * Your conversations, kept current over the WebSocket. With `requests`, the
 * same list shows your message requests instead.
 */
export function InboxView({ requests = false }: { requests?: boolean }) {
  const viewer = useViewer();
  const [composing, setComposing] = useState(false);
  const [{ data, error }, refetch] = useQuery({
    query: requests ? MessageRequestsQuery : ConversationsQuery,
  });
  const [{ data: requestData }, refetchRequests] = useQuery({
    query: MessageRequestCountQuery,
    pause: requests,
  });

  // A message arrived in any of your conversations: re-sort and update counts.
  useLiveMessages(() => {
    refetch({ requestPolicy: "network-only" });
    if (!requests) refetchRequests({ requestPolicy: "network-only" });
  });
  const requestCount = requestData?.messageRequestCount ?? 0;

  const conversations = data?.conversations;

  return (
    <>
      <div className="autohide-top sticky top-0 z-10 flex h-[53px] items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {requests && <BackButton />}
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {requests ? "Message requests" : "Messages"}
          </h1>
        </div>
        {!requests && (
          <button
            type="button"
            aria-label="New message"
            title="New message"
            onClick={() => setComposing(true)}
            className="pressable -mr-2 rounded-full p-2 transition-colors hover:bg-muted"
          >
            <MailPlus className="size-5" />
          </button>
        )}
      </div>
      {requests && (
        <p className="border-b px-4 py-3 text-[13px] text-muted-foreground">
          Messages from people you don&apos;t follow. They won&apos;t know you
          saw their message until you accept it.
        </p>
      )}
      {!requests && requestCount > 0 && (
        <Link
          href="/messages/requests"
          className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailQuestion className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Message requests</span>
            <span className="block text-[13px] text-muted-foreground">
              {requestCount}{" "}
              {requestCount === 1 ? "person wants" : "people want"} to message
              you
            </span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      )}

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
      ) : conversations.length === 0 && requests ? (
        <EmptyState
          title="No message requests"
          body="When someone you don't follow messages you, it shows up here first."
        />
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
            // Who sent the last message: "You", or a first name in groups.
            const lastSender =
              last && last.senderId === viewer?.id
                ? "You: "
                : last && c.isGroup
                  ? `${c.participants.find((p) => p.user.id === last.senderId)?.user.displayName.split(" ")[0] ?? "Someone"}: `
                  : "";
            const preview = !last
              ? ""
              : last.systemText
                ? last.systemText
                : last.deletedAt
                  ? `${lastSender}This message was deleted`
                  : `${lastSender}${last.content || (last.mediaPaths.length > 1 ? "📷 Photos" : "📷 Photo")}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <ChatAvatar chat={c} viewerId={viewer?.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "truncate",
                          unread ? "font-extrabold" : "font-bold",
                        )}
                      >
                        {chatTitle(c, viewer?.id)}
                      </span>
                      {other && (
                        <span className="truncate text-muted-foreground">
                          @{other.username}
                        </span>
                      )}
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
                        {preview}
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
