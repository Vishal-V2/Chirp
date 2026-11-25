import { Search } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/user/follow-button";
import { UserAvatar } from "@/components/user-avatar";
import { formatCount } from "@/lib/format";
import { trends, whoToFollow } from "@/lib/mock-data";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border">
      <h2 className="px-4 pt-3 pb-1 text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export function RightSidebar() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="sticky top-0 z-10 bg-background py-1">
        <label className="flex h-11 items-center gap-3 rounded-full bg-muted px-4 text-muted-foreground focus-within:bg-background focus-within:ring-2 focus-within:ring-primary">
          <Search className="size-4" />
          <input
            type="search"
            placeholder="Search Chirp"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <Panel title="What's happening">
        <ul>
          {trends.map((trend) => (
            <li key={trend.topic}>
              <a href="#" className="block px-4 py-3 transition-colors hover:bg-muted/60">
                <p className="text-xs text-muted-foreground">{trend.category}</p>
                <p className="font-bold">{trend.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(trend.posts)} posts
                </p>
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Who to follow">
        <ul>
          {whoToFollow.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <Link
                href={`/${user.username}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar name={user.displayName} username={user.username} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate font-bold hover:underline">{user.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
              </Link>
              <FollowButton
                initialFollowing={user.viewerIsFollowing}
                displayName={user.displayName}
                className="h-8 min-w-20"
              />
            </li>
          ))}
        </ul>
      </Panel>

      <p className="px-4 text-xs text-muted-foreground">© 2026 Chirp</p>
    </div>
  );
}
