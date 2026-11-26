"use client";

import { useEffect } from "react";

/**
 * Phone-style auto-hiding bars: scrolling down marks the page
 * `data-bars="hidden"` on <html> (the top header slides up, the bottom nav
 * slides down); scrolling up, or being near the top, brings them back.
 * The CSS lives in globals.css (`autohide-*`), and only applies on phones.
 */
export function useHideBarsOnScroll(enabled: boolean, resetKey: string) {
  useEffect(() => {
    const root = document.documentElement;
    const show = () => root.removeAttribute("data-bars");
    show(); // new page or disabled: start with the bars visible
    if (!enabled) return;

    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - last;
      if (y < 60) show();
      else if (delta > 6) root.setAttribute("data-bars", "hidden");
      else if (delta < -6) show();
      else return; // tiny jitter: keep the last position as the reference
      last = y;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      show();
    };
  }, [enabled, resetKey]);
}
