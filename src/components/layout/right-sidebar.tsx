import { WhoToFollow } from "./who-to-follow";

export function RightSidebar() {
  return (
    <div className="sticky top-0 flex flex-col gap-6 py-4">
      <WhoToFollow />
      <p className="px-4 text-[13px] leading-relaxed text-muted-foreground">
        Chirp is a small place for short posts. Be kind.
      </p>
    </div>
  );
}
