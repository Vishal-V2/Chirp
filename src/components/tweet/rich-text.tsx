import Link from "next/link";
import { tokenize } from "@/lib/rich-text";

/** Chirp text with @mentions, #hashtags and web links turned into links. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((s, i) => {
        if (s.kind === "mention") {
          return (
            <Link
              key={i}
              href={`/${s.username}`}
              className="text-primary hover:underline"
            >
              {s.text}
            </Link>
          );
        }
        if (s.kind === "hashtag") {
          return (
            <Link
              key={i}
              href={`/hashtag/${encodeURIComponent(s.tag)}`}
              className="text-primary hover:underline"
            >
              {s.text}
            </Link>
          );
        }
        if (s.kind === "link") {
          // Show a tidy version; the full link is the target.
          const shown = s.href.replace(/^https?:\/\/(www\.)?/, "");
          return (
            <a
              key={i}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="text-primary hover:underline"
            >
              {shown.length > 40 ? `${shown.slice(0, 40)}…` : shown}
            </a>
          );
        }
        return <span key={i}>{s.text}</span>;
      })}
    </>
  );
}
