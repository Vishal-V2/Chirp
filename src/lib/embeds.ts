import { tokenize } from "./rich-text";

export type Embed =
  | { kind: "youtube"; url: string; videoId: string; start?: number }
  | { kind: "tweet"; url: string; tweetId: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** "1m30s", "90s" or "90" -> 90 */
function seconds(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (!m) return undefined;
  const total =
    Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return total || undefined;
}

/** Recognises a YouTube video or an X/Twitter post link. */
export function embedFor(url: string): Embed | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|mobile|music)\./, "");

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return YT_ID.test(id)
      ? {
          kind: "youtube",
          url,
          videoId: id,
          start: seconds(u.searchParams.get("t")),
        }
      : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = u.pathname.split("/");
    const id =
      first === "watch"
        ? u.searchParams.get("v")
        : ["shorts", "embed", "live"].includes(first)
          ? second
          : null;
    return id && YT_ID.test(id)
      ? {
          kind: "youtube",
          url,
          videoId: id,
          start: seconds(
            u.searchParams.get("t") ?? u.searchParams.get("start"),
          ),
        }
      : null;
  }
  if (host === "x.com" || host === "twitter.com") {
    const m = /^\/[A-Za-z0-9_]{1,15}\/status(?:es)?\/(\d{1,25})/.exec(
      u.pathname,
    );
    return m ? { kind: "tweet", url, tweetId: m[1] } : null;
  }
  return null;
}

/** The first embeddable link in a chirp, if any. */
export function findEmbed(text: string): Embed | null {
  for (const s of tokenize(text)) {
    if (s.kind === "link") {
      const embed = embedFor(s.href);
      if (embed) return embed;
    }
  }
  return null;
}
