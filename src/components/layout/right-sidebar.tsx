import { Search } from "lucide-react";
import { formatCount } from "@/lib/format";
import { WhoToFollow } from "./who-to-follow";

// Placeholder topics until Chirp has hashtags/search.
const trends = [
  { category: "Technology · Trending", topic: "Next.js 16", posts: 12400 },
  { category: "Design · Trending", topic: "#DesignSystems", posts: 5310 },
  { category: "Trending", topic: "Postgres", posts: 8820 },
  { category: "Programming · Trending", topic: "TypeScript", posts: 30100 },
];

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
              <a
                href="#"
                className="block px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <p className="text-xs text-muted-foreground">
                  {trend.category}
                </p>
                <p className="font-bold">{trend.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(trend.posts)} posts
                </p>
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <WhoToFollow />

      <p className="px-4 text-xs text-muted-foreground">© 2026 Chirp</p>
    </div>
  );
}
