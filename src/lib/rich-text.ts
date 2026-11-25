/**
 * Shared rules for mentions, hashtags and links in chirps. Used by the server
 * (to notify people and index tags) and the browser (to render links), so both
 * always agree on what counts.
 */

// Must not be glued to a word before it ("email@site" or "a#b" don't count).
const BEFORE = String.raw`(?<![\p{L}\p{M}\p{N}_@#])`;

/** @username: 3-15 letters, numbers or _ (same rule as usernames). */
const MENTION = new RegExp(String.raw`${BEFORE}@([A-Za-z0-9_]{3,15})(?![A-Za-z0-9_])`, "gu");

/**
 * #tag: starts with a letter, then letters/numbers/_ (any language), up to 50.
 * \p{M} (combining marks) keeps scripts like Hindi or Thai whole: #हिंदी.
 */
const HASHTAG = new RegExp(String.raw`${BEFORE}#(\p{L}[\p{L}\p{M}\p{N}_]{0,49})(?![\p{L}\p{M}\p{N}_])`, "gu");

/** http(s) links; trailing punctuation like "." or ")" isn't part of the link. */
const URL_RE = /\bhttps?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'}]/g;

/** Lower-cased, de-duplicated usernames mentioned in a chirp. */
export function extractMentions(text: string): string[] {
  return [...new Set([...text.matchAll(MENTION)].map((m) => m[1].toLowerCase()))];
}

/** Lower-cased, de-duplicated hashtags in a chirp (without the #). */
export function extractHashtags(text: string): string[] {
  return [...new Set([...text.matchAll(HASHTAG)].map((m) => m[1].toLowerCase()))].slice(0, 20);
}

/** Normalises a tag from a URL or search box: "#Café" -> "café". */
export function normalizeTag(tag: string): string {
  return decodeURIComponent(tag).replace(/^#/, "").trim().toLowerCase().slice(0, 50);
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "mention"; text: string; username: string }
  | { kind: "hashtag"; text: string; tag: string }
  | { kind: "link"; text: string; href: string };

/** Splits a chirp into plain text, @mentions, #hashtags and links, in order. */
export function tokenize(text: string): Segment[] {
  type Hit = { start: number; end: number; segment: Segment };
  const hits: Hit[] = [];
  for (const m of text.matchAll(URL_RE)) {
    hits.push({ start: m.index!, end: m.index! + m[0].length, segment: { kind: "link", text: m[0], href: m[0] } });
  }
  const insideLink = (i: number) => hits.some((h) => h.segment.kind === "link" && i >= h.start && i < h.end);
  for (const m of text.matchAll(MENTION)) {
    if (insideLink(m.index!)) continue;
    hits.push({ start: m.index!, end: m.index! + m[0].length, segment: { kind: "mention", text: m[0], username: m[1] } });
  }
  for (const m of text.matchAll(HASHTAG)) {
    if (insideLink(m.index!)) continue;
    hits.push({ start: m.index!, end: m.index! + m[0].length, segment: { kind: "hashtag", text: m[0], tag: m[1].toLowerCase() } });
  }
  hits.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let at = 0;
  for (const h of hits) {
    if (h.start < at) continue; // overlapping match; keep the first
    if (h.start > at) out.push({ kind: "text", text: text.slice(at, h.start) });
    out.push(h.segment);
    at = h.end;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}
