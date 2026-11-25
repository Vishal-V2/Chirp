"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Layout per image count (like most social apps):
 *  1: one image at its own shape (capped height)
 *  2: side by side   3: one tall + two stacked   4: a 2×2 grid
 */
function gridClass(count: number) {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "aspect-[16/9] grid-cols-2";
  return "aspect-[16/9] grid-cols-2 grid-rows-2";
}

/** Images on a chirp; clicking one opens the full-screen viewer. */
export function TweetMedia({
  urls,
  author,
}: {
  urls: string[];
  author: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (urls.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "mt-3 grid gap-0.5 overflow-hidden rounded-2xl border bg-muted",
          gridClass(urls.length),
        )}
      >
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            aria-label={`Open image ${i + 1} of ${urls.length}`}
            onClick={(e) => {
              e.stopPropagation(); // don't open the chirp itself
              setOpenAt(i);
            }}
            className={cn(
              "group relative min-h-0 overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
              urls.length === 3 && i === 0 && "row-span-2",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Image ${i + 1} from ${author}`}
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]",
                urls.length === 1 ? "max-h-[510px]" : "h-full",
              )}
            />
            {/\.gif(\?|$)/i.test(url) && (
              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                GIF
              </span>
            )}
          </button>
        ))}
      </div>
      <ImageViewer
        urls={urls}
        author={author}
        index={openAt}
        onIndexChange={setOpenAt}
      />
    </>
  );
}

/** Full-screen image viewer with arrow-key / button navigation. */
function ImageViewer({
  urls,
  author,
  index,
  onIndexChange,
}: {
  urls: string[];
  author: string;
  index: number | null;
  onIndexChange: (i: number | null) => void;
}) {
  const [direction, setDirection] = useState(0);
  const go = useCallback(
    (step: number) => {
      if (index === null) return;
      const next = index + step;
      if (next < 0 || next >= urls.length) return;
      setDirection(step);
      onIndexChange(next);
    },
    [index, urls.length, onIndexChange],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    // Capture phase: the dialog stops key events from bubbling up to window.
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [index, go]);

  const navButton =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/75 disabled:opacity-0";

  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => !open && onIndexChange(null)}
    >
      <DialogContent
        showCloseButton={false}
        onClick={(e) => e.stopPropagation()}
        className="flex h-dvh w-screen max-w-none items-center justify-center rounded-none bg-black/92 p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Image from {author}</DialogTitle>
        <button
          type="button"
          aria-label="Close"
          onClick={() => onIndexChange(null)}
          className="absolute top-4 left-4 z-10 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm hover:bg-black/75"
        >
          <X className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => go(-1)}
          disabled={!index}
          className={cn(navButton, "left-4")}
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          aria-label="Next image"
          onClick={() => go(1)}
          disabled={index === null || index >= urls.length - 1}
          className={cn(navButton, "right-4")}
        >
          <ChevronRight className="size-6" />
        </button>
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          {index !== null && (
            <motion.img
              key={urls[index]}
              src={urls[index]}
              alt={`Image ${index + 1} of ${urls.length} from ${author}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="max-h-[92dvh] max-w-[94vw] object-contain"
            />
          )}
        </AnimatePresence>
        {urls.length > 1 && index !== null && (
          <p className="absolute bottom-5 rounded-full bg-black/55 px-3 py-1 text-sm text-white">
            {index + 1} / {urls.length}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
