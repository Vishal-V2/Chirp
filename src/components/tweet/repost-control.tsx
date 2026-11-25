"use client";

import { useState } from "react";
import { PenLine, Repeat2 } from "lucide-react";
import { motion } from "motion/react";
import { AnimatedCount } from "@/components/motion/animated-count";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TweetData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QuoteDialog } from "./quote-dialog";

/**
 * The repost button opens a small menu: Repost (or Undo repost) and Quote,
 * like on Twitter.
 */
export function RepostControl({
  tweet,
  retweeted,
  count,
  onToggle,
  large,
}: {
  tweet: TweetData;
  retweeted: boolean;
  count: number;
  onToggle: () => void;
  /** Bigger icon, no count (single-chirp page). */
  large?: boolean;
}) {
  const [quoting, setQuoting] = useState(false);
  // Bumped each time you repost, to replay the spin.
  const [spins, setSpins] = useState(0);

  return (
    // Keep clicks (including ones from the portaled menu/dialog) from opening the chirp.
    <div onClick={(e) => e.stopPropagation()} className="contents">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={retweeted ? "Undo repost or quote" : "Repost or quote"}
          className={cn(
            "group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-emerald-500 data-popup-open:text-emerald-500",
            retweeted && "text-emerald-500",
          )}
        >
          <span className="relative -m-2 rounded-full p-2 transition-colors group-hover:bg-emerald-500/10 group-data-popup-open:bg-emerald-500/10">
            <motion.span
              key={spins}
              className="block"
              initial={spins ? { rotate: 0, scale: 1 } : false}
              animate={spins ? { rotate: 360, scale: [1, 1.25, 1] } : undefined}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <Repeat2 className={large ? "size-[22px]" : "size-[18px]"} />
            </motion.span>
          </span>
          {!large && (
            <span className="min-w-6 text-left">
              <AnimatedCount value={count} />
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              if (!retweeted) setSpins((n) => n + 1);
              onToggle();
            }}
            className="py-2 text-[15px] font-semibold"
          >
            <Repeat2 />
            {retweeted ? "Undo repost" : "Repost"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setQuoting(true)}
            className="py-2 text-[15px] font-semibold"
          >
            <PenLine />
            Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <QuoteDialog tweet={tweet} open={quoting} onOpenChange={setQuoting} />
    </div>
  );
}
