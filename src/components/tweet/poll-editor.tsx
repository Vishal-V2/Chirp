"use client";

import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { MAX_POLL_OPTION } from "@/lib/storage";

export type PollDraft = { options: string[]; durationMinutes: number };

export const NEW_POLL: PollDraft = {
  options: ["", ""],
  durationMinutes: 24 * 60,
};

const DURATIONS = [
  { label: "5 minutes", minutes: 5 },
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 6 * 60 },
  { label: "1 day", minutes: 24 * 60 },
  { label: "3 days", minutes: 3 * 24 * 60 },
  { label: "7 days", minutes: 7 * 24 * 60 },
];

/** Is the draft ready to post: every choice filled in and all different? */
export function pollIsReady(poll: PollDraft) {
  const texts = poll.options.map((o) => o.trim().toLowerCase());
  return texts.every(Boolean) && new Set(texts).size === texts.length;
}

/** Choices (2-4) and how long the poll runs. */
export function PollEditor({
  poll,
  onChange,
  onRemove,
  disabled,
}: {
  poll: PollDraft;
  onChange: (poll: PollDraft) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const setOption = (i: number, text: string) =>
    onChange({
      ...poll,
      options: poll.options.map((o, j) => (j === i ? text : o)),
    });

  return (
    <motion.fieldset
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      disabled={disabled}
      className="mb-2 overflow-hidden rounded-2xl border"
    >
      <legend className="sr-only">Poll</legend>
      <div className="space-y-2 p-3">
        {poll.options.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex h-11 flex-1 items-center rounded-md border px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <span className="sr-only">Choice {i + 1}</span>
              <input
                value={text}
                maxLength={MAX_POLL_OPTION}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Choice ${i + 1}${i >= 2 ? " (optional)" : ""}`}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {text.length}/{MAX_POLL_OPTION}
              </span>
            </label>
            {i >= 2 && (
              <button
                type="button"
                aria-label={`Remove choice ${i + 1}`}
                onClick={() =>
                  onChange({
                    ...poll,
                    options: poll.options.filter((_, j) => j !== i),
                  })
                }
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {poll.options.length < 4 && (
          <button
            type="button"
            onClick={() =>
              onChange({ ...poll, options: [...poll.options, ""] })
            }
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Plus className="size-4" /> Add a choice
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Poll length</span>
          <select
            value={poll.durationMinutes}
            onChange={(e) =>
              onChange({ ...poll, durationMinutes: Number(e.target.value) })
            }
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Remove poll
        </button>
      </div>
    </motion.fieldset>
  );
}
