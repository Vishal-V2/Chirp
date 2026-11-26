"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useQuery } from "urql";
import {
  EmptyState,
  TweetFeed,
  feedSource,
} from "@/components/feed/tweet-feed";
import { FeedTabs } from "@/components/layout/feed-tabs";
import { TabPanel, nextDirection } from "@/components/motion/tab-panel";
import { UserRow } from "@/components/user/user-row";
import { TrendsList } from "./trends-list";
import { PopularTweetsQuery, SearchTweetsQuery } from "@/graphql/client/tweets";
import { DiscoverPeopleQuery, SearchUsersQuery } from "@/graphql/client/users";

const SEARCH_DELAY_MS = 300;

function PeopleSkeleton() {
  return (
    <div role="status" aria-label="Loading people">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3" aria-hidden>
          <div className="skeleton size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton h-3.5 w-1/3 rounded" />
            <div className="skeleton h-3.5 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** People: search results, or suggestions when there's no search. */
function PeopleList({ query }: { query: string }) {
  const [search] = useQuery({
    query: SearchUsersQuery,
    variables: { query },
    pause: !query,
  });
  const [discover] = useQuery({
    query: DiscoverPeopleQuery,
    pause: Boolean(query),
  });
  const users = query ? search.data?.searchUsers : discover.data?.whoToFollow;
  const error = query ? search.error : discover.error;

  if (!users) {
    if (error)
      return (
        <p className="px-4 py-8 text-center text-muted-foreground">
          Couldn&apos;t load people.
        </p>
      );
    return <PeopleSkeleton />;
  }
  if (users.length === 0) {
    return query ? (
      <EmptyState
        title={`No one matches “${query}”`}
        body="Try a name or an @username."
      />
    ) : (
      <EmptyState
        title="You follow everyone"
        body="New people will show up here as they join."
      />
    );
  }
  return (
    <div>
      {users.map((u) => (
        <UserRow key={u.id} user={u} />
      ))}
    </div>
  );
}

/** Explore: search chirps and people; popular chirps and suggestions when idle. */
export function ExploreView({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery.trim());
  const [tab, setTab] = useState(0);
  const [direction, setDirection] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // Search once typing pauses, and keep it in the URL (?q=) for Back and sharing.
  useEffect(() => {
    const next = text.trim();
    if (next === query) return;
    const timer = setTimeout(() => {
      // Switching between browsing and searching starts on the first tab again.
      if (Boolean(next) !== Boolean(query)) {
        setTab(0);
        setDirection(0);
      }
      setQuery(next);
      router.replace(
        next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname,
        {
          scroll: false,
        },
      );
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, query, router, pathname]);

  const tabs = query ? ["Chirps", "People"] : ["Popular", "Trending", "People"];
  const tabName = tabs[tab] ?? tabs[0];

  return (
    <>
      <div className="autohide-top sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        <form
          role="search"
          className="px-4 pt-2 pb-1"
          onSubmit={(e) => {
            e.preventDefault();
            // Results are already live; Enter just closes the on-screen keyboard.
            input.current?.blur();
          }}
        >
          <label className="flex h-11 items-center gap-3 rounded-full bg-muted px-4 text-muted-foreground transition-colors focus-within:bg-background focus-within:ring-2 focus-within:ring-primary">
            <Search className="size-4 shrink-0" aria-hidden />
            <input
              ref={input}
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search chirps and people"
              aria-label="Search chirps and people"
              maxLength={100}
              className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setText("");
                  input.current?.focus();
                }}
                className="pressable -mr-1 rounded-full bg-foreground/80 p-0.5 text-background hover:bg-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </label>
        </form>
        {/* key: reset the tab bar when switching between browsing and searching */}
        <FeedTabs
          key={query ? "search" : "browse"}
          tabs={tabs}
          onChange={(t) => {
            const i = tabs.indexOf(t);
            setDirection(nextDirection([0, 1, 2], tab, i));
            setTab(i);
          }}
        />
      </div>

      <TabPanel key={`${query}-${tab}`} direction={direction}>
        {tabName === "People" ? (
          <PeopleList query={query} />
        ) : tabName === "Trending" ? (
          <TrendsList first={20} />
        ) : query ? (
          <TweetFeed
            key={`search-${query}`}
            source={feedSource({
              query: SearchTweetsQuery,
              variables: { query },
              select: (d) => d.searchTweets,
              empty: {
                title: `No chirps match “${query}”`,
                body: "Try fewer or different words.",
              },
            })}
          />
        ) : (
          <TweetFeed
            key="popular"
            source={feedSource({
              query: PopularTweetsQuery,
              variables: {},
              select: (d) => d.popularTweets,
              empty: {
                title: "Nothing popular yet",
                body: "Chirps with the most likes this month will show up here.",
              },
            })}
          />
        )}
      </TabPanel>
    </>
  );
}
