"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { Embed } from "@/lib/embeds";
import { XPostEmbed } from "./x-post-embed";

/** YouTube: a thumbnail first; the (privacy-enhanced) player loads on click. */
function YouTube({ videoId, start }: { videoId: string; start?: number }) {
  const [playing, setPlaying] = useState(false);
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    ...(start ? { start: String(start) } : {}),
  });
  return (
    <div className="relative mt-3 aspect-video overflow-hidden rounded-2xl border bg-black">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
        />
      ) : (
        <button
          type="button"
          aria-label="Play YouTube video"
          onClick={() => setPlaying(true)}
          className="group size-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-[68px] items-center justify-center rounded-2xl bg-[#ff0033] text-white shadow-lg transition-transform group-hover:scale-110">
              <Play className="size-6 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

/** A YouTube video or X post from a link in a chirp, shown inline. */
export function LinkEmbed({
  embed,
  compact = false,
}: {
  embed: Embed;
  compact?: boolean;
}) {
  return (
    // Clicking inside the embed shouldn't open the chirp underneath.
    <div onClick={(e) => e.stopPropagation()} className="link-embed">
      {embed.kind === "youtube" ? (
        <YouTube videoId={embed.videoId} start={embed.start} />
      ) : (
        <XPostEmbed tweetId={embed.tweetId} compact={compact} />
      )}
    </div>
  );
}
