"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function FeedTabs({
  tabs,
  onChange,
}: {
  tabs: string[];
  onChange?: (tab: string) => void;
}) {
  const [active, setActive] = useState(tabs[0]);
  // Unique per tab bar, so the underline only slides within its own bar.
  const indicatorId = useId();

  return (
    <div role="tablist" className="flex">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          type="button"
          aria-selected={active === tab}
          onClick={() => {
            setActive(tab);
            onChange?.(tab);
          }}
          className={cn(
            "flex flex-1 justify-center transition-colors hover:bg-muted/60",
            active === tab ? "font-bold" : "text-muted-foreground",
          )}
        >
          <span className="relative py-4">
            {tab}
            {active === tab && (
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
