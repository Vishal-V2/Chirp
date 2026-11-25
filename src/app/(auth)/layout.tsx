import { Bird } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel (large screens only) */}
      <div className="relative hidden flex-1 overflow-hidden bg-[#4a26c9] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Bird className="size-10" strokeWidth={2} aria-hidden />
        <div>
          <p className="mb-10 max-w-xs text-xl leading-snug text-white/85">
            Short posts from the people you follow.
          </p>
          {/* The wordmark as the picture: huge, heavy, cropped by the edge. */}
          <p
            aria-hidden
            className="-mb-[0.18em] -ml-[0.06em] font-heading text-[clamp(9rem,17vw,16rem)] leading-[0.8] font-extrabold tracking-[-0.06em] text-white lowercase select-none"
            style={{ fontVariationSettings: '"wdth" 75, "opsz" 96' }}
          >
            chirp
          </p>
        </div>
      </div>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <Wordmark className="mb-10 text-4xl lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
