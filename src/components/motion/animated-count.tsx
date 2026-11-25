"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A number that rolls up when it grows and down when it shrinks. */
export function AnimatedCount({ value, className }: { value: number; className?: string }) {
  // Remember the previous value to know which way to roll.
  const [state, setState] = useState({ value, direction: 1 });
  if (state.value !== value) {
    setState({ value, direction: value > state.value ? 1 : -1 });
  }
  const { direction } = state;

  return (
    <span className={cn("relative inline-flex overflow-hidden tabular-nums", className)}>
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={{
            enter: (d: number) => ({ y: d * 14, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (d: number) => ({ y: d * -14, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 600, damping: 40 }}
        >
          {formatCount(value) || " "}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
