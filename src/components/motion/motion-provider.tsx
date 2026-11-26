"use client";

import { MotionConfig } from "motion/react";

/**
 * App-wide animation settings. `reducedMotion="user"` turns off movement for
 * people who've asked their OS to reduce motion (opacity fades still run).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    >
      {children}
    </MotionConfig>
  );
}
