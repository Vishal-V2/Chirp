"use client";

import Link from "next/link";
import { useQuery } from "urql";
import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { SafetyListsQuery } from "@/graphql/client/users";
import {
  useSafetyActions,
  type SafetyTarget,
} from "@/hooks/use-safety-actions";

export type SafetyKind = "muted" | "blocked";

const COPY = {
  muted: {
    title: "Muted accounts",
    about:
      "You won't see chirps or notifications from muted accounts. They aren't told.",
    empty: "No muted accounts",
    tip: "Use “Mute” in a chirp’s ⋯ menu or on a profile to quietly hide someone.",
  },
  blocked: {
    title: "Blocked accounts",
    about:
      "Blocked accounts can't follow you, reply, quote, like your chirps or message you, and you won't see theirs.",
    empty: "No blocked accounts",
    tip: "Use “Block” in a chirp’s ⋯ menu or on a profile to stop someone interacting with you.",
  },
};

/** Settings → Privacy and safety → Muted / Blocked accounts. */
export function SafetyListView({ kind }: { kind: SafetyKind }) {
  const [{ data, fetching, error }, reexecute] = useQuery({
    query: SafetyListsQuery,
    requestPolicy: "cache-and-network",
  });
  const people = kind === "muted" ? data?.mutedAccounts : data?.blockedAccounts;
  const copy = COPY[kind];

  return (
    <>
      <PageHeader back title={copy.title} />
      <p className="px-4 pt-3 pb-3 text-[13px] text-muted-foreground">
        {copy.about}
      </p>
      {error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">Couldn&apos;t load this list.</p>
          <button
            type="button"
            onClick={() => reexecute({ requestPolicy: "network-only" })}
            className="mt-3 h-9 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : !people && fetching ? (
        <div className="space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton size-10 rounded-full" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          ))}
        </div>
      ) : people?.length ? (
        <ul>
          {people.map((p) => (
            <SafetyRow key={p.id} user={p} kind={kind} />
          ))}
        </ul>
      ) : (
        <div className="mx-auto max-w-sm px-8 py-12">
          <h3 className="font-heading text-[31px] leading-tight font-extrabold tracking-tight">
            {copy.empty}
          </h3>
          <p className="mt-2 text-[15px] text-muted-foreground">{copy.tip}</p>
        </div>
      )}
    </>
  );
}

function SafetyRow({
  user,
  kind,
}: {
  user: SafetyTarget & {
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  kind: SafetyKind;
}) {
  const { toggleMute, toggleBlock } = useSafetyActions(user);
  const active = kind === "muted" ? user.viewerHasMuted : user.viewerHasBlocked;

  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      <Link href={`/${user.username}`} className="shrink-0">
        <UserAvatar
          name={user.displayName}
          username={user.username}
          src={user.avatarUrl ?? undefined}
          className="size-10"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/${user.username}`} className="block leading-tight">
          <span className="block truncate font-bold hover:underline">
            {user.displayName}
          </span>
          <span className="block truncate text-muted-foreground">
            @{user.username}
          </span>
        </Link>
        {user.bio && (
          <p className="mt-1 line-clamp-2 text-[15px]">{user.bio}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void (kind === "muted" ? toggleMute() : toggleBlock())}
        className={
          active
            ? "pressable h-8 shrink-0 rounded-full bg-destructive px-4 text-sm font-bold text-white hover:bg-destructive/90"
            : "pressable h-8 shrink-0 rounded-full border px-4 text-sm font-bold hover:bg-muted"
        }
      >
        {kind === "muted"
          ? active
            ? "Unmute"
            : "Mute"
          : active
            ? "Unblock"
            : "Block"}
      </button>
    </li>
  );
}
