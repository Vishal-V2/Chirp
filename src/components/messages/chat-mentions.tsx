"use client";

import Link from "next/link";
import { useState } from "react";
import { Users } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

/** A group member, as far as mentions are concerned. */
export type Member = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

/** "@all" (or "@everyone") pings everyone in the group. */
const EVERYONE = new Set(["all", "everyone"]);

const MENTION = /(^|[^\w@])@([A-Za-z0-9_]{1,15})\b/g;

/** Lower-cased usernames (and "all"/"everyone") mentioned in a message. */
export function mentionsIn(text: string) {
  return new Set([...text.matchAll(MENTION)].map((m) => m[2].toLowerCase()));
}

/** Does this message mention you, by name or with @all? */
export function mentionsUser(text: string, username: string) {
  const found = mentionsIn(text);
  return (
    found.has(username.toLowerCase()) ||
    [...found].some((name) => EVERYONE.has(name))
  );
}

/** Was it an @all? */
export function mentionsEveryone(text: string) {
  return [...mentionsIn(text)].some((name) => EVERYONE.has(name));
}

/**
 * A message's text with @mentions of group members (linked to their profile)
 * and @all highlighted. Other "@words" stay plain text.
 */
export function MessageText({
  text,
  members,
  mine,
}: {
  text: string;
  members: Member[];
  mine: boolean;
}) {
  const byName = new Map(members.map((m) => [m.username.toLowerCase(), m]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const name = match[2].toLowerCase();
    const member = byName.get(name);
    if (!member && !EVERYONE.has(name)) continue;
    const start = match.index + match[1].length;
    parts.push(text.slice(last, start));
    const label = `@${match[2]}`;
    // Like X: underlined in your own bubbles, coloured in others'. The
    // underline runs straight through the "@" (skip-ink off); otherwise
    // browsers break it around the "@" and leave a stray dot.
    const style = mine
      ? "underline decoration-1 underline-offset-2 [text-decoration-skip-ink:none]"
      : "font-medium text-primary";
    parts.push(
      member ? (
        <Link
          key={start}
          href={`/${member.username}`}
          className={cn(style, "hover:opacity-80")}
        >
          {label}
        </Link>
      ) : (
        <span key={start} className={style}>
          {label}
        </span>
      ),
    );
    last = start + label.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** The "@partial" right before the cursor ("@" alone counts), if any. */
function mentionAt(text: string, caret: number) {
  const m = /(?:^|[^\w@])@([A-Za-z0-9_]{0,15})$/.exec(text.slice(0, caret));
  return m
    ? { query: m[1].toLowerCase(), start: caret - m[1].length - 1 }
    : null;
}

/**
 * In a group's message box: typing "@" suggests the group's members and @all.
 * Returns a key handler (↑/↓ to move, Enter/Tab to pick, Esc to close), a
 * caret tracker, and the list to render above the box.
 */
export function useGroupMentions({
  textarea,
  text,
  setText,
  members,
  enabled,
}: {
  textarea: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  setText: (text: string) => void;
  /** Everyone else in the group. */
  members: Member[];
  enabled: boolean;
}) {
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const token = enabled ? mentionAt(text, caret) : null;
  const open = Boolean(token) && dismissedAt !== token?.start;

  type Option = { key: string; insert: string; member?: Member };
  const options: Option[] = !open
    ? []
    : [
        ...("all".startsWith(token!.query)
          ? [{ key: "all", insert: "all" }]
          : []),
        ...members
          .filter(
            (m) =>
              m.username.toLowerCase().startsWith(token!.query) ||
              m.displayName.toLowerCase().includes(token!.query),
          )
          .map((m) => ({ key: m.id, insert: m.username, member: m })),
      ].slice(0, 6);

  function pick(insert: string) {
    if (!token) return;
    const before = text.slice(0, token.start);
    const after = text.slice(caret).replace(/^[A-Za-z0-9_]*/, "");
    const inserted = `@${insert} `;
    setText(before + inserted + after);
    const pos = before.length + inserted.length;
    setCaret(pos);
    setActive(0);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(pos, pos);
    });
  }

  /** Call first from the textarea's onKeyDown; true if it handled the key. */
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (options.length === 0) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
      return true;
    }
    if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
      e.preventDefault();
      pick(options[Math.min(active, options.length - 1)].insert);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissedAt(token?.start ?? null);
      return true;
    }
    return false;
  }

  const trackCaret = (e: React.SyntheticEvent<HTMLTextAreaElement>) =>
    setCaret(e.currentTarget.selectionStart ?? 0);

  const list =
    options.length > 0 ? (
      <ul
        role="listbox"
        aria-label="Mention someone"
        className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl border bg-popover py-1 shadow-lg"
      >
        {options.map((o, i) => (
          <li key={o.key} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep focus in the box
              onClick={() => pick(o.insert)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left",
                i === active && "bg-muted",
              )}
            >
              {o.member ? (
                <UserAvatar
                  name={o.member.displayName}
                  username={o.member.username}
                  src={o.member.avatarUrl ?? undefined}
                  className="size-8"
                />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Users className="size-4" />
                </span>
              )}
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-bold">
                  {o.member ? o.member.displayName : "Everyone"}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {o.member
                    ? `@${o.member.username}`
                    : "@all · notify the whole group"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return { onKeyDown, trackCaret, list };
}
