"use client";

import { cn } from "@/lib/utils";

/** The most characters a chirp can have. */
export const CHIRP_MAX = 280;

/** Circular progress showing how much of the 280-char limit is used. */
export function CharCounter({ count }: { count: number }) {
  const remaining = CHIRP_MAX - count;
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(count / CHIRP_MAX, 1);
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
