"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, SendHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery } from "urql";
import { BackButton } from "@/components/layout/back-button";
import { UserAvatar } from "@/components/user-avatar";
import { useViewer } from "@/components/viewer-provider";
import type { MessageFieldsFragment } from "@/generated/gql/graphql";
import {
  ConversationQuery,
  MarkConversationReadMutation,
  SendMessageMutation,
} from "@/graphql/client/messages";
import { cn } from "@/lib/utils";
import { useLiveMessages } from "./realtime-provider";
import { useTyping } from "./use-typing";

const PAGE = 50;
const MAX = 1000;
const GROUP_GAP_MS = 5 * 60 * 1000;

type ChatMessage = MessageFieldsFragment & { status?: "sending" | "failed" };

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Three bouncing dots, the universal "someone is typing" signal. */
function TypingBubble({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className="flex items-center gap-2 px-4 pt-1 pb-2"
    >
      <span
        className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-muted px-4 py-3"
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
      <span className="text-[13px] text-muted-foreground">
        {name} is typing…
      </span>
    </motion.div>
  );
}

/** A one-to-one conversation, live over Supabase Realtime (WebSockets). */
export function ChatView({ conversationId }: { conversationId: string }) {
  const viewer = useViewer()!;
  const [first, setFirst] = useState(PAGE);
  const [{ data, error }] = useQuery({
    query: ConversationQuery,
    variables: { id: conversationId, first },
  });
  const [, send] = useMutation(SendMessageMutation);
  const [, markRead] = useMutation(MarkConversationReadMutation);
  const { otherTyping, notifyTyping, notifyStopped, clearOtherTyping } =
    useTyping(conversationId, viewer.id);

  // Messages that arrived live or that you sent, until the next refetch includes them.
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const conversation = data?.conversation;
  const other = conversation?.otherParticipant;

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const e of conversation?.messages.edges ?? [])
      byId.set(e.node.id, e.node);
    for (const m of extra)
      if (!byId.has(m.id) || m.status)
        byId.set(m.id, { ...byId.get(m.id), ...m });
    return [...byId.values()].sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  }, [conversation, extra]);

  // Mark as read when opened (and again when their messages arrive).
  useEffect(() => {
    if (conversation) void markRead({ conversationId });
  }, [conversation?.id, conversationId, markRead]); // eslint-disable-line react-hooks/exhaustive-deps

  useLiveMessages((m) => {
    if (m.conversationId !== conversationId) return;
    setExtra((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    if (m.senderId !== viewer.id) {
      clearOtherTyping();
      if (document.visibilityState === "visible")
        void markRead({ conversationId });
    }
  });

  // Keep the newest message in view (unless you've scrolled up to read history).
  const bottom = useRef<HTMLDivElement>(null);
  const stuckToBottom = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      stuckToBottom.current =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const firstScroll = useRef(true);
  useLayoutEffect(() => {
    if (messages.length === 0 && !otherTyping) return;
    if (firstScroll.current || stuckToBottom.current) {
      bottom.current?.scrollIntoView({
        block: "end",
        behavior: firstScroll.current ? "instant" : "smooth",
      });
      firstScroll.current = false;
    }
  }, [messages.length, otherTyping]);

  async function deliver(content: string, tempId: string) {
    const result = await send({ conversationId, content });
    const saved = result.data?.sendMessage;
    setExtra((list) =>
      saved
        ? [...list.filter((m) => m.id !== tempId && m.id !== saved.id), saved]
        : list.map((m) =>
            m.id === tempId ? { ...m, status: "failed" as const } : m,
          ),
    );
  }

  function submit() {
    const content = text.trim();
    if (!content || content.length > MAX) return;
    const tempId = `temp-${crypto.randomUUID()}`;
    // Show it immediately; it's swapped for the saved message when the server answers.
    setExtra((list) => [
      ...list,
      {
        __typename: "Message",
        id: tempId,
        content,
        createdAt: new Date().toISOString(),
        conversationId,
        senderId: viewer.id,
        status: "sending",
      },
    ]);
    setText("");
    stuckToBottom.current = true;
    notifyStopped();
    void deliver(content, tempId);
  }

  function retry(m: ChatMessage) {
    setExtra((list) =>
      list.map((x) => (x.id === m.id ? { ...x, status: "sending" } : x)),
    );
    void deliver(m.content, m.id);
  }

  if (!conversation) {
    return (
      <div className="px-4 py-10 text-center text-muted-foreground">
        {error ? (
          "Couldn't load this conversation."
        ) : (
          <span className="sr-only">Loading…</span>
        )}
        {!error && (
          <div className="mx-auto max-w-sm space-y-3" aria-hidden>
            <div className="skeleton ml-auto h-9 w-2/3 rounded-3xl" />
            <div className="skeleton h-9 w-1/2 rounded-3xl" />
            <div className="skeleton ml-auto h-9 w-1/3 rounded-3xl" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col sm:min-h-dvh">
      <header className="sticky top-0 z-10 flex h-[53px] items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md">
        <BackButton />
        {other && (
          <Link
            href={`/${other.username}`}
            className="flex min-w-0 items-center gap-3"
          >
            <UserAvatar
              name={other.displayName}
              username={other.username}
              src={other.avatarUrl ?? undefined}
              className="size-8"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-heading font-bold">
                {other.displayName}
              </span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {otherTyping ? "typing…" : `@${other.username}`}
              </span>
            </span>
          </Link>
        )}
      </header>

      <div
        className="flex-1 pt-3"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${other?.displayName}`}
      >
        {conversation.messages.pageInfo.hasNextPage && (
          <button
            type="button"
            onClick={() => setFirst((n) => n + PAGE)}
            className="mx-auto mb-3 block rounded-full px-3 py-1 text-sm text-primary hover:bg-primary/10"
          >
            Load earlier messages
          </button>
        )}
        {messages.length === 0 && !otherTyping && (
          <p className="fade-up px-8 py-16 text-center text-muted-foreground">
            Say hi to {other?.displayName}. They&apos;ll see it the moment you
            send it.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = m.senderId === viewer.id;
            const newDay =
              !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const sameAsPrev =
              prev &&
              !newDay &&
              prev.senderId === m.senderId &&
              new Date(m.createdAt).getTime() -
                new Date(prev.createdAt).getTime() <
                GROUP_GAP_MS;
            const lastInGroup =
              !next ||
              next.senderId !== m.senderId ||
              new Date(next.createdAt).getTime() -
                new Date(m.createdAt).getTime() >=
                GROUP_GAP_MS ||
              dayLabel(next.createdAt) !== dayLabel(m.createdAt);
            return (
              <motion.div
                key={m.id}
                layout="position"
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              >
                {newDay && (
                  <p className="py-3 text-center text-xs font-medium text-muted-foreground">
                    {dayLabel(m.createdAt)}
                  </p>
                )}
                <div
                  className={cn(
                    "flex px-4",
                    mine ? "justify-end" : "justify-start",
                    sameAsPrev ? "pt-0.5" : "pt-2",
                  )}
                >
                  <p
                    className={cn(
                      "max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      lastInGroup && (mine ? "rounded-br-md" : "rounded-bl-md"),
                      m.status === "sending" && "opacity-70",
                      m.status === "failed" &&
                        "bg-destructive/15 text-destructive",
                    )}
                  >
                    {m.content}
                  </p>
                </div>
                {m.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => retry(m)}
                    className="ml-auto flex items-center gap-1 px-4 pt-1 text-xs font-medium text-destructive hover:underline"
                  >
                    <RotateCcw className="size-3" /> Not sent. Tap to retry.
                  </button>
                ) : (
                  lastInGroup && (
                    <p
                      className={cn(
                        "px-5 pt-1 text-xs text-muted-foreground",
                        mine ? "text-right" : "text-left",
                      )}
                      suppressHydrationWarning
                    >
                      {m.status === "sending" ? "Sending…" : time(m.createdAt)}
                    </p>
                  )
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <AnimatePresence>
          {otherTyping && other && (
            <TypingBubble key="typing" name={other.displayName} />
          )}
        </AnimatePresence>
        <div ref={bottom} className="h-2" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="sticky bottom-14 z-10 flex items-end gap-2 border-t bg-background/95 px-3 py-2.5 backdrop-blur-md sm:bottom-0"
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) notifyTyping();
            else notifyStopped();
          }}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter adds a new line.
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Write a message"
          aria-label="Write a message"
          rows={1}
          maxLength={MAX}
          className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none rounded-3xl bg-muted px-4 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <motion.button
          type="submit"
          aria-label="Send"
          disabled={!text.trim()}
          whileTap={{ scale: 0.88 }}
          className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </motion.button>
      </form>
    </div>
  );
}
