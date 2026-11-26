import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

// Deterministic background color per user so fallbacks are easy to tell apart.
// Deep tones that sit with the amethyst palette; all keep white initials legible.
const palette = [
  "bg-[#5e35e8]", // amethyst
  "bg-[#9c2a8a]", // starling magenta
  "bg-[#2f5fc4]", // indigo
  "bg-[#127a70]", // dark teal
  "bg-[#b05a18]", // burnt amber
  "bg-[#3d2a7a]", // plum
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
        className={cn(
          "font-semibold text-white",
          colorFor(username),
          fallbackClassName,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
