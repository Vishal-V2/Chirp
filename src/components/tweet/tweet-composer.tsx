"use client";

import { useState } from "react";
import { Image as ImageIcon, MapPin, Smile } from "lucide-react";
import { motion } from "motion/react";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

const MAX = 280;

/** Circular progress showing how much of the 280-char limit is used. */
function CharCounter({ count }: { count: number }) {
  const remaining = MAX - count;
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(count / MAX, 1);
  const color =
    remaining < 0
      ? "text-destructive"
      : remaining <= 20
        ? "text-amber-500"
        : "text-primary";

  return (
    <div className="flex items-center gap-2">
      {remaining <= 20 && (
        <span className={cn("text-sm tabular-nums", color)}>{remaining}</span>
      )}
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          strokeWidth="2"
          className="stroke-muted"
        />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          className={cn(
            color,
            "transition-[stroke-dashoffset,color] duration-300 ease-out",
          )}
        />
      </svg>
    </div>
  );
}

export function TweetComposer({
  placeholder = "What's the chirp?",
  submitLabel = "Chirp",
  replyingTo,
  textareaId,
  author,
  onPost,
}: {
  placeholder?: string;
  submitLabel?: string;
  /** Username being replied to; shows a "Replying to @x" line. */
  replyingTo?: string;
  textareaId?: string;
  /** Whose avatar to show next to the box. */
  author: { displayName: string; username: string; avatarUrl?: string | null };
  /**
   * Called with the trimmed text. Return (or resolve) an error message to keep
   * the text and show the error; return nothing on success to clear the box.
   */
  onPost?: (content: string) => string | void | Promise<string | void>;
}) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const count = content.length;
  const canPost = content.trim().length > 0 && count <= MAX && !pending;

  async function submit() {
    if (!canPost) return;
    setPending(true);
    setError(undefined);
    try {
      const failure = await onPost?.(content.trim());
      if (failure) setError(failure);
      else setContent("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="group/composer flex gap-3 border-b px-4 pt-3 pb-2">
      {/* The avatar glows while you're writing. */}
      <UserAvatar
        name={author.displayName}
        username={author.username}
        src={author.avatarUrl ?? undefined}
        className="ring-0 ring-primary/40 ring-offset-2 ring-offset-background transition-[box-shadow] duration-300 group-focus-within/composer:ring-2"
      />
      <form
        className="flex min-w-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {replyingTo && (
          <p className="pt-1 text-[15px] text-muted-foreground">
            Replying to <span className="text-primary">@{replyingTo}</span>
          </p>
        )}
        <textarea
          id={textareaId}
          aria-label={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter posts.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="field-sizing-content min-h-14 w-full resize-none bg-transparent py-2 text-xl outline-none placeholder:text-muted-foreground"
        />
        {error && (
          <p role="alert" className="pb-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between border-t pt-2">
          <div className="-ml-2 flex text-primary">
            {[
              { icon: ImageIcon, label: "Add media" },
              { icon: Smile, label: "Add emoji" },
              { icon: MapPin, label: "Add location" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className="pressable rounded-full p-2 hover:bg-primary/10"
              >
                <Icon className="size-5" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {count > 0 && <CharCounter count={count} />}
            {/* Springs to life once there's something to post. */}
            <motion.button
              type="submit"
              disabled={!canPost}
              initial={false}
              animate={{
                scale: canPost ? 1 : 0.94,
                opacity: canPost ? 1 : 0.5,
              }}
              whileHover={canPost ? { scale: 1.04 } : undefined}
              whileTap={canPost ? { scale: 0.92 } : undefined}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className={cn(
                "h-9 rounded-full bg-primary px-4 font-bold text-primary-foreground transition-shadow",
                canPost && "shadow-md shadow-primary/30",
              )}
            >
              {pending ? "Sending…" : submitLabel}
            </motion.button>
          </div>
        </div>
      </form>
    </div>
  );
}
