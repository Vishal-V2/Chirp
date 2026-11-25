import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

// Deterministic background color per user so fallbacks are easy to tell apart.
const palette = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

function colorFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function UserAvatar({
  name,
  username,
  src,
  className,
  fallbackClassName,
}: {
  name: string;
  username: string;
  src?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-10", className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback
        className={cn("font-semibold text-white", colorFor(username), fallbackClassName)}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
