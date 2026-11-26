"use client";

import { useEffect, useRef } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { motion } from "motion/react";
import { UserAvatar } from "@/components/user-avatar";
import { IMAGE_TYPES, MAX_CHIRP_IMAGES } from "@/lib/storage";
import { checkImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { CharCounter, CHIRP_MAX } from "./char-counter";
import { useMentionSuggestions } from "./mention-suggestions";

export type Attachment = { id: string; file: File; preview: string };

/** A later chirp in a thread being written: its text and images. */
export type ThreadPartDraft = {
  id: string;
  content: string;
  attachments: Attachment[];
};

export const newThreadPart = (): ThreadPartDraft => ({
  id: crypto.randomUUID(),
  content: "",
  attachments: [],
});

/** Is this part ready to post (some text or an image, within the limit)? */
export const threadPartOk = (p: ThreadPartDraft) =>
  (p.content.trim().length > 0 || p.attachments.length > 0) &&
  p.content.length <= CHIRP_MAX;

/**
 * One extra box in the composer's thread: avatar on a connecting line, its
 * own text (with @mention suggestions), up to 4 images, and a remove button.
 */
export function ThreadPart({
  part,
  index,
  total,
  author,
  disabled,
  onChange,
  onRemove,
  onError,
}: {
  part: ThreadPartDraft;
  /** 0-based position in the whole thread (the first chirp is 0). */
  index: number;
  total: number;
  author: { displayName: string; username: string; avatarUrl?: string | null };
  disabled: boolean;
  onChange: (part: ThreadPartDraft) => void;
  onRemove: () => void;
  onError: (message: string | undefined) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const setContent = (content: string) => onChange({ ...part, content });
  const mentions = useMentionSuggestions(textareaRef, part.content, setContent);
  const full = part.attachments.length >= MAX_CHIRP_IMAGES;

  // A new box gets the cursor straight away.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function addFiles(files: Iterable<File>) {
    const room = MAX_CHIRP_IMAGES - part.attachments.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    const problem = picked.map(checkImage).find(Boolean);
    if (problem) return onError(problem);
    onError(
      picked.length > room
        ? `You can add up to ${MAX_CHIRP_IMAGES} images.`
        : undefined,
    );
    onChange({
      ...part,
      attachments: [
        ...part.attachments,
        ...picked.slice(0, room).map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
        })),
      ],
    });
  }

  function removeAttachment(id: string) {
    const gone = part.attachments.find((a) => a.id === id);
    if (gone) URL.revokeObjectURL(gone.preview);
    onChange({
      ...part,
      attachments: part.attachments.filter((a) => a.id !== id),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="relative -ml-[52px] flex gap-3 overflow-hidden pt-2"
    >
      {/* Sits on the composer's thread line; the last box ends the line. */}
      <div className="relative z-10 flex shrink-0 flex-col items-center">
        <UserAvatar
          name={author.displayName}
          username={author.username}
          src={author.avatarUrl ?? undefined}
          className="size-10"
        />
        {index === total - 1 && (
          <div aria-hidden className="w-2 flex-1 bg-background" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="tabular-nums">
            {index + 1}/{total}
          </span>
          <button
            type="button"
            aria-label={`Remove chirp ${index + 1} from the thread`}
            disabled={disabled}
            onClick={onRemove}
            className="pressable ml-auto rounded-full p-1 hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            aria-label={`Chirp ${index + 1} of the thread`}
            value={part.content}
            onChange={(e) => {
              setContent(e.target.value);
              mentions.trackCaret(e);
            }}
            onSelect={mentions.trackCaret}
            onClick={mentions.trackCaret}
            onKeyDown={(e) => {
              mentions.onKeyDown(e);
            }}
            onPaste={(e) => {
              const files = [...e.clipboardData.files];
              if (files.some((f) => f.type.startsWith("image/"))) {
                e.preventDefault();
                addFiles(files);
              }
            }}
            placeholder="Add another chirp"
            rows={1}
            disabled={disabled}
            className="field-sizing-content w-full resize-none bg-transparent py-1 text-[17px] outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          {mentions.list}
        </div>

        {part.attachments.length > 0 && (
          <ul
            className={cn(
              "mb-2 grid gap-2",
              part.attachments.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
            aria-label={`Images in chirp ${index + 1}`}
          >
            {part.attachments.map((a, i) => (
              <li
                key={a.id}
                className="relative overflow-hidden rounded-2xl border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.preview}
                  alt={`Attached image ${i + 1}`}
                  className={cn(
                    "w-full object-cover",
                    part.attachments.length === 1
                      ? "max-h-64"
                      : "aspect-square",
                  )}
                />
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  disabled={disabled}
                  onClick={() => removeAttachment(a.id)}
                  className="pressable absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black/80"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between pb-1">
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
            aria-label={`Add images to chirp ${index + 1}`}
            title="Add images"
            disabled={full || disabled}
            onClick={() => fileInput.current?.click()}
            className="pressable -ml-2 rounded-full p-2 text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            <ImageIcon className="size-[18px]" />
          </button>
          {part.content.length > 0 && (
            <CharCounter count={part.content.length} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
