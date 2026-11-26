"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MESSAGE_MEDIA_BUCKET } from "@/lib/storage";

/** Signed links last an hour; they're renewed a little before they expire. */
const LIFETIME_S = 3600;
const cache = new Map<string, { url: string; expires: number }>();

/**
 * Short-lived links for private message images. Supabase only signs them for
 * the chat's participants (storage rules), so the files stay private even if
 * a link is shared after it expires.
 */
async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const missing = paths.filter((p) => (cache.get(p)?.expires ?? 0) < now);
  if (missing.length > 0) {
    const { data } = await createClient()
      .storage.from(MESSAGE_MEDIA_BUCKET)
      .createSignedUrls(missing, LIFETIME_S);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        cache.set(item.path, {
          url: item.signedUrl,
          expires: now + (LIFETIME_S - 300) * 1000,
        });
      }
    }
  }
  return Object.fromEntries(
    paths.flatMap((p) => {
      const hit = cache.get(p);
      return hit ? [[p, hit.url]] : [];
    }),
  );
}

/** Signed links for these paths (empty until they're ready). */
export function useSignedImageUrls(paths: string[]) {
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!key) return;
    let live = true;
    void signedUrls(key.split("|")).then((u) => live && setUrls(u));
    return () => {
      live = false;
    };
  }, [key]);
  return urls;
}
