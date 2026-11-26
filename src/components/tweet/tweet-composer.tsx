"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, ListChecks, MapPin, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { UserAvatar } from "@/components/user-avatar";
import type { TweetData } from "@/lib/types";
import { LocationPicker } from "./location-picker";
import { QuotedTweet } from "./quoted-tweet";
import { useMentionSuggestions } from "./mention-suggestions";
import {
  NEW_POLL,
  PollEditor,
  pollIsReady,
  type PollDraft,
} from "./poll-editor";
import { IMAGE_TYPES, MAX_CHIRP_IMAGES } from "@/lib/storage";
import { checkImage, deleteStoredFiles, uploadChirpImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { CharCounter, CHIRP_MAX } from "./char-counter";
import {
  ThreadPart,
  newThreadPart,
  threadPartOk,
  type Attachment,
  type ThreadPartDraft,
} from "./thread-part";

const MAX = CHIRP_MAX;

export type ChirpExtras = {
  mediaUrls: string[];
  poll?: PollDraft;
  location?: string;
};

/** One chirp of a thread, ready to post. */
export type ThreadPost = ChirpExtras & { content: string };

/** The most chirps in one thread (matches the server). */
const MAX_THREAD = 25;

/** A toolbar icon button (image, GIF, poll, location). */
function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pressable rounded-full p-2 hover:bg-primary/10 disabled:opacity-40",
        active && "bg-primary/10",
      )}
    >
      {children}
    </button>
  );
}

export function TweetComposer({
  placeholder = "What's the chirp?",
  submitLabel = "Chirp",
  replyingTo,
  textareaId,
  author,
  quoted,
  onPost,
  onPostThread,
}: {
  placeholder?: string;
  submitLabel?: string;
  /** Username being replied to; shows a "Replying to @x" line. */
  replyingTo?: string;
  textareaId?: string;
  /** Writing a quote: the chirp being quoted, shown under your comment. */
  quoted?: TweetData;
  /** The signed-in user: avatar next to the box, and the folder images upload into. */
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  /**
   * Called with the trimmed text plus uploaded image URLs, poll and location.
   * Return (or resolve) an error message to keep everything and show the
   * error; return nothing on success to clear the box.
   */
  onPost?: (
    content: string,
    extras: ChirpExtras,
  ) => string | void | Promise<string | void>;
  /**
   * Turns on threads (the "+" button). Called instead of onPost when there's
   * more than one chirp; same return contract.
   */
  onPostThread?: (
    parts: ThreadPost[],
  ) => string | void | Promise<string | void>;
}) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [location, setLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  // Later chirps of a thread (the first chirp is the main box above).
  const [parts, setParts] = useState<ThreadPartDraft[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const gifInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentions = useMentionSuggestions(textareaRef, content, setContent);
  const count = content.length;
  const hasSomething = content.trim().length > 0 || attachments.length > 0;
  // A poll needs a question and every choice filled in.
  const pollOk = !poll || (content.trim().length > 0 && pollIsReady(poll));
  const canPost =
    hasSomething &&
    pollOk &&
    count <= MAX &&
    parts.every(threadPartOk) &&
    !pending;
  const full = attachments.length >= MAX_CHIRP_IMAGES;

  // Free the preview images' memory when the composer goes away.
  const latest = useRef(attachments);
  useEffect(() => {
    latest.current = [...attachments, ...parts.flatMap((p) => p.attachments)];
  });
  useEffect(
    () => () => latest.current.forEach((a) => URL.revokeObjectURL(a.preview)),
    [],
  );

  function addFiles(files: Iterable<File>) {
    const room = MAX_CHIRP_IMAGES - attachments.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    const problem = picked.map(checkImage).find(Boolean);
    if (problem) return setError(problem);
    if (picked.length > room) {
      setError(`You can add up to ${MAX_CHIRP_IMAGES} images.`);
    } else {
      setError(undefined);
    }
    setAttachments((list) => [
      ...list,
      ...picked.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeAttachment(id: string) {
    setAttachments((list) => {
      const gone = list.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((a) => a.id !== id);
    });
  }

  async function submit() {
    if (!canPost) return;
    setPending(true);
    setError(undefined);
    let uploaded: string[] = [];
    try {
      const upload = (list: Attachment[]) =>
        Promise.all(list.map((a) => uploadChirpImage(author.id, a.file)));
      const firstUrls = await upload(attachments);
      uploaded = [...firstUrls];
      const first = {
        mediaUrls: firstUrls,
        poll: poll ?? undefined,
        location: location.trim() || undefined,
      };
      let failure: string | void;
      if (parts.length > 0 && onPostThread) {
        const rest: ThreadPost[] = [];
        for (const part of parts) {
          const urls = await upload(part.attachments);
          uploaded.push(...urls);
          rest.push({ content: part.content.trim(), mediaUrls: urls });
        }
        failure = await onPostThread([
          { content: content.trim(), ...first },
          ...rest,
        ]);
      } else {
        failure = await onPost?.(content.trim(), first);
      }
      if (failure) {
        setError(failure);
        void deleteStoredFiles(uploaded); // the chirp wasn't saved; don't leave its images behind
        return;
      }
      attachments.forEach((a) => URL.revokeObjectURL(a.preview));
      parts.forEach((p) =>
        p.attachments.forEach((a) => URL.revokeObjectURL(a.preview)),
      );
      setParts([]);
      setAttachments([]);
      setContent("");
      setPoll(null);
      setLocation("");
      setEditingLocation(false);
    } catch (e) {
      void deleteStoredFiles(uploaded);
      setError(e instanceof Error ? e.message : "Couldn't upload your images.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="group/composer flex gap-3 border-b px-4 pt-3 pb-2">
      {/* The avatar glows while you're writing; in a thread, a line runs
          down from it through each chirp's avatar. */}
      <div className="flex shrink-0 flex-col items-center">
        <UserAvatar
          name={author.displayName}
          username={author.username}
          src={author.avatarUrl ?? undefined}
          className="ring-0 ring-primary/40 ring-offset-2 ring-offset-background transition-[box-shadow] duration-300 group-focus-within/composer:ring-2"
        />
        {parts.length > 0 && (
          <div aria-hidden className="mt-1 mb-12 w-0.5 flex-1 bg-border" />
        )}
      </div>
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
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={textareaId}
            aria-label={placeholder}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              mentions.trackCaret(e);
            }}
            onSelect={mentions.trackCaret}
            onClick={mentions.trackCaret}
            onPaste={(e) => {
              // Pasting an image attaches it.
              const files = [...e.clipboardData.files];
              if (files.some((f) => f.type.startsWith("image/"))) {
                e.preventDefault();
                addFiles(files);
              }
            }}
            onKeyDown={(e) => {
              // The @mention list gets first go at arrows / Enter / Tab / Esc.
              if (mentions.onKeyDown(e)) return;
              // Ctrl/Cmd + Enter posts.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={poll ? "Ask a question" : placeholder}
            rows={1}
            disabled={pending}
            className="field-sizing-content w-full resize-none bg-transparent py-2 text-xl outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          {mentions.list}
        </div>

        {/* Attached images, with a remove button on each. */}
        <AnimatePresence initial={false}>
          {attachments.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "mb-2 grid gap-2 overflow-hidden",
                attachments.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
              aria-label="Attached images"
            >
              <AnimatePresence initial={false}>
                {attachments.map((a, i) => (
                  <motion.li
                    key={a.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative overflow-hidden rounded-2xl border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.preview}
                      alt={`Attached image ${i + 1}`}
                      className={cn(
                        "w-full object-cover",
                        attachments.length === 1 ? "max-h-80" : "aspect-square",
                        pending && "opacity-60",
                      )}
                    />
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      disabled={pending}
                      onClick={() => removeAttachment(a.id)}
                      className="pressable absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black/80"
                    >
                      <X className="size-4" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {poll && (
            <PollEditor
              key="poll"
              poll={poll}
              onChange={setPoll}
              onRemove={() => setPoll(null)}
              disabled={pending}
            />
          )}
          {editingLocation && (
            <LocationPicker
              key="location"
              value={location}
              onChange={setLocation}
              onDone={() => setEditingLocation(false)}
            />
          )}
        </AnimatePresence>

        {!editingLocation && location.trim() && (
          <p className="mb-2 flex w-fit items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-2.5 text-[13px] font-medium text-primary">
            <MapPin className="size-3.5" aria-hidden />
            {location.trim()}
            <button
              type="button"
              aria-label="Remove location"
              onClick={() => setLocation("")}
              className="rounded-full p-0.5 hover:bg-primary/15"
            >
              <X className="size-3.5" />
            </button>
          </p>
        )}

        {quoted && (
          <QuotedTweet
            quoted={quoted}
            interactive={false}
            className="mt-0 mb-2"
          />
        )}

        {/* The rest of the thread, each joined to the one above. */}
        <AnimatePresence initial={false}>
          {parts.map((part, i) => (
            <ThreadPart
              key={part.id}
              part={part}
              index={i + 1}
              total={parts.length + 1}
              author={author}
              disabled={pending}
              onError={setError}
              onChange={(next) =>
                setParts((list) =>
                  list.map((p) => (p.id === next.id ? next : p)),
                )
              }
              onRemove={() => {
                part.attachments.forEach((a) => URL.revokeObjectURL(a.preview));
                setParts((list) => list.filter((p) => p.id !== part.id));
              }}
            />
          ))}
        </AnimatePresence>

        {error && (
          <p role="alert" className="pb-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center gap-4 border-t pt-2">
          <div className="-ml-2 flex flex-1 items-center justify-between text-primary">
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label={
                full ? `Up to ${MAX_CHIRP_IMAGES} images` : "Add images"
              }
              title={full ? `Up to ${MAX_CHIRP_IMAGES} images` : "Add images"}
              disabled={full || pending || Boolean(poll)}
              onClick={() => fileInput.current?.click()}
              className="pressable rounded-full p-2 hover:bg-primary/10 disabled:opacity-40"
            >
              <ImageIcon className="size-5" />
            </button>
            {/* GIFs come from your device (they're uploaded as-is, so they keep animating). */}
            <input
              ref={gifInput}
              type="file"
              accept="image/gif"
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <ToolButton
              label="Add a GIF"
              disabled={full || pending || Boolean(poll)}
              onClick={() => gifInput.current?.click()}
            >
              <span className="flex size-5 items-center justify-center rounded-[4px] border-[1.75px] border-current text-[8px] leading-none font-extrabold">
                GIF
              </span>
            </ToolButton>
            {!quoted && (
              <ToolButton
                label={poll ? "Remove poll" : "Add a poll"}
                active={Boolean(poll)}
                disabled={pending || attachments.length > 0}
                onClick={() => setPoll(poll ? null : NEW_POLL)}
              >
                <ListChecks className="size-5" />
              </ToolButton>
            )}
            {onPostThread && !quoted && (
              <ToolButton
                label={
                  parts.length + 1 >= MAX_THREAD
                    ? `Up to ${MAX_THREAD} chirps in a thread`
                    : "Add another chirp (thread)"
                }
                disabled={
                  pending ||
                  !hasSomething ||
                  !parts.every(threadPartOk) ||
                  parts.length + 1 >= MAX_THREAD
                }
                onClick={() => setParts((list) => [...list, newThreadPart()])}
              >
                <Plus className="size-5" />
              </ToolButton>
            )}
            <ToolButton
              label="Add location"
              active={editingLocation || Boolean(location.trim())}
              disabled={pending}
              onClick={() => setEditingLocation((v) => !v)}
            >
              <MapPin className="size-5" />
            </ToolButton>
          </div>
          <div className="flex shrink-0 items-center gap-3">
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
              {pending
                ? attachments.length || parts.some((p) => p.attachments.length)
                  ? "Uploading…"
                  : "Sending…"
                : parts.length > 0
                  ? "Post all"
                  : submitLabel}
            </motion.button>
          </div>
        </div>
      </form>
    </div>
  );
}
