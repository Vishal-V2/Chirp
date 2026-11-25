"use client";

import { useEffect, useState } from "react";
import { useQuery } from "urql";
import { UserAvatar } from "@/components/user-avatar";
import { SearchUsersQuery } from "@/graphql/client/users";
import { cn } from "@/lib/utils";

/** The "@partial" being typed right before the cursor, if any. */
function mentionAt(text: string, caret: number) {
  const m = /(?:^|[^\w@])@([A-Za-z0-9_]{1,15})$/.exec(text.slice(0, caret));
  return m ? { query: m[1], start: caret - m[1].length - 1 } : null;
}

/**
 * Suggests people while you type "@na…" in a textarea. Returns a key handler
 * (↑/↓ to move, Enter/Tab to pick, Esc to close) and the list to render.
 */
export function useMentionSuggestions(
  textarea: React.RefObject<HTMLTextAreaElement | null>,
  text: string,
  setText: (text: string) => void,
) {
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const token = mentionAt(text, caret);

  // Wait a moment after typing before asking the server.
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(token?.query ?? ""), 150);
    return () => clearTimeout(t);
  }, [token?.query]);

  const open =
    Boolean(token) && dismissedAt !== token?.start && debounced.length > 0;
  const [{ data }] = useQuery({
    query: SearchUsersQuery,
    variables: { query: debounced },
    pause: !open,
  });
  const people = open ? (data?.searchUsers ?? []).slice(0, 5) : [];

  function pick(username: string) {
    if (!token) return;
    const before = text.slice(0, token.start);
    const after = text.slice(caret).replace(/^[A-Za-z0-9_]*/, ""); // drop the rest of the word
    const inserted = `@${username} `;
    setText(before + inserted + after);
    const pos = before.length + inserted.length;
    setCaret(pos);
    setActive(0);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(pos, pos);
    });
  }

  /** Call from the textarea's onKeyDown; returns true if it handled the key. */
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (people.length === 0) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + people.length) % people.length);
      return true;
    }
    if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
      e.preventDefault();
      pick(people[Math.min(active, people.length - 1)].username);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissedAt(token?.start ?? null);
      return true;
    }
    return false;
  }

  /** Keep track of the cursor (typing, clicking, arrow keys). */
  const trackCaret = (e: React.SyntheticEvent<HTMLTextAreaElement>) =>
    setCaret(e.currentTarget.selectionStart ?? 0);

  const list =
    people.length > 0 ? (
      <ul
        role="listbox"
        aria-label="Mention someone"
        className="absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-2xl border bg-popover py-1 shadow-lg"
      >
        {people.map((u, i) => (
          <li key={u.id} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep focus in the textarea
              onClick={() => pick(u.username)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left",
                i === active && "bg-muted",
              )}
            >
              <UserAvatar
                name={u.displayName}
                username={u.username}
                src={u.avatarUrl ?? undefined}
                className="size-8"
              />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-bold">
                  {u.displayName}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  @{u.username}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return { onKeyDown, trackCaret, list };
}
