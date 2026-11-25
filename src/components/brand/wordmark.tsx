import { Bird } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Chirp wordmark: Bricolage Grotesque, narrowed and heavy, lowercase,
 * set tight so it reads as one quick sound.
 */
export function Wordmark({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-primary", className)}
    >
      <Bird
        className={cn("size-[0.95em] shrink-0", iconClassName)}
        strokeWidth={2.25}
        aria-hidden
      />
      <span
        className="font-heading leading-none font-extrabold tracking-[-0.04em] lowercase"
        style={{ fontVariationSettings: '"wdth" 80, "opsz" 96' }}
      >
        chirp
      </span>
    </span>
  );
}
