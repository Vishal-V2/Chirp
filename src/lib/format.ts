const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234 -> "1.2K" */
export function formatCount(n: number): string {
  return n === 0 ? "" : compact.format(n);
}

/** Short relative time like "4m", "5h", or "Nov 24". */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "Joined November 2026" */
export function formatJoined(iso: string): string {
  return `Joined ${new Date(iso).toLocaleDateString("en", { month: "long", year: "numeric" })}`;
}
