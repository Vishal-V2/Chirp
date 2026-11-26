"use client";

import { useSignedImageUrls } from "@/lib/message-media";
import { cn } from "@/lib/utils";

/**
 * Images in a chat bubble. Sent images are private (`paths`, opened with
 * short-lived signed links); while sending, local `previews` show instead.
 */
export function MessageImages({
  paths = [],
  previews,
  mine,
  dimmed,
}: {
  paths?: string[];
  previews?: string[];
  mine: boolean;
  dimmed?: boolean;
}) {
  const signed = useSignedImageUrls(previews ? [] : paths);
  const sources = previews ?? paths.map((p) => signed[p]);
  if (sources.length === 0) return null;
  const single = sources.length === 1;

  return (
    <div
      className={cn(
        "grid max-w-[78%] gap-1 overflow-hidden rounded-3xl",
        single ? "w-64 grid-cols-1" : "w-72 grid-cols-2",
        mine ? "ml-auto" : "mr-auto",
        dimmed && "opacity-70",
      )}
    >
      {sources.map((src, i) =>
        src ? (
          <a
            key={i}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="block bg-muted"
            aria-label={`Open image ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Image ${i + 1}`}
              className={cn(
                "w-full object-cover",
                single ? "max-h-80" : "aspect-square",
              )}
            />
          </a>
        ) : (
          <div
            key={i}
            className={cn("skeleton", single ? "h-48" : "aspect-square")}
            aria-hidden
          />
        ),
      )}
    </div>
  );
}
