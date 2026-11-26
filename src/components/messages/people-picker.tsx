"use client";

import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useQuery } from "urql";
import { UserAvatar } from "@/components/user-avatar";
import { useViewer } from "@/components/providers/viewer-provider";
import { SearchUsersQuery } from "@/graphql/client/users";
import { cn } from "@/lib/utils";

export type PickedPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

/**
 * Search people by name or @username and tap to pick them (shown as chips).
 * Used by New message and a group's Add people.
 */
export function PeoplePicker({
  picked,
  onChange,
  max,
  exclude = [],
}: {
  picked: PickedPerson[];
  onChange: (picked: PickedPerson[]) => void;
  /** The most people that can be picked. */
  max: number;
  /** People who can't be picked (e.g. already in the group). */
  exclude?: string[];
}) {
  const viewer = useViewer();
  const [text, setText] = useState("");
  const query = text.trim();
  const [{ data, fetching }] = useQuery({
    query: SearchUsersQuery,
    variables: { query },
    pause: !query,
  });
  const people = (data?.searchUsers ?? []).filter(
    (u) => u.id !== viewer?.id && !exclude.includes(u.id),
  );
  const isPicked = (id: string) => picked.some((p) => p.id === id);

  function toggle(u: PickedPerson) {
    if (isPicked(u.id)) onChange(picked.filter((p) => p.id !== u.id));
    else if (picked.length < max) onChange([...picked, u]);
  }

  return (
    <>
      <div className="border-b px-4 pb-3">
        {picked.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Picked">
            {picked.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  className="pressable flex items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5 text-sm font-semibold hover:bg-muted"
                  aria-label={`Remove ${p.displayName}`}
                >
                  <UserAvatar
                    name={p.displayName}
                    username={p.username}
                    src={p.avatarUrl ?? undefined}
                    className="size-6"
                  />
                  {p.displayName}
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="flex h-10 items-center gap-2 rounded-full bg-muted px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
          <Search className="size-4" aria-hidden />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <div className="min-h-40 overflow-y-auto py-1">
        {!query ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Type a name or @username.
          </p>
        ) : fetching && people.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : people.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No one matches “{query}”.
          </p>
        ) : (
          people.map((u) => {
            const on = isPicked(u.id);
            const full = !on && picked.length >= max;
            return (
              <button
                key={u.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={full}
                onClick={() => toggle(u)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-40"
              >
                <UserAvatar
                  name={u.displayName}
                  username={u.username}
                  src={u.avatarUrl ?? undefined}
                />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-bold">
                    {u.displayName}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    @{u.username}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/50",
                  )}
                  aria-hidden
                >
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
