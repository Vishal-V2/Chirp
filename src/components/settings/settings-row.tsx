import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A settings menu row that opens another settings page (like X's). */
export function SettingsRow({
  href,
  label,
  hint,
  icon: Icon,
  count,
  danger,
}: {
  href: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /** Shown on the right, e.g. how many accounts are muted. */
  count?: number;
  /** Red label, for destructive things like deleting the account. */
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      {Icon && <Icon className="size-5 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px]", danger && "text-destructive")}>
          {label}
        </span>
        {hint && (
          <span className="block text-[13px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {count !== undefined && (
        <span className="text-sm text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
