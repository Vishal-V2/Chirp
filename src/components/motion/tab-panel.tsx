"use client";

import { motion } from "motion/react";

/**
 * Tab content that slides in from the side you switched towards
 * (direction 1 = moved right, -1 = moved left, 0 = first render).
 * Give it a `key` per tab so it re-mounts on switch.
 */
export function TabPanel({
  direction,
  children,
}: {
  direction: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={direction === 0 ? false : { opacity: 0, x: direction * 48 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
    >
      {children}
    </motion.div>
  );
}

/** Tracks which way the user moved between tabs. */
export function nextDirection<T>(tabs: readonly T[], from: T, to: T) {
  return Math.sign(tabs.indexOf(to) - tabs.indexOf(from));
}
