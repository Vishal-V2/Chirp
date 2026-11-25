"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bird, Feather } from "lucide-react";
import { AccountMenu } from "./account-menu";
import { getNavItems } from "./nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ViewerProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function SidebarNav({ viewer }: { viewer: ViewerProfile }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between px-2 py-2 xl:px-3">
      <div className="flex flex-col items-center gap-1 xl:items-stretch">
        <Link
          href="/"
          aria-label="Chirp home"
          className="flex size-12 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
        >
          <Bird className="size-7" />
        </Link>

        <nav className="flex flex-col items-center gap-1 xl:items-stretch">
          {getNavItems(viewer.username).map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-fit items-center gap-4 rounded-full p-3 text-xl transition-colors hover:bg-muted xl:pr-6",
                  active && "font-bold",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.6 : 2} />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
          <ThemeToggle variant="sidebar" />
        </nav>

        <button
          type="button"
          className="mt-4 flex size-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 xl:h-12 xl:w-full"
        >
          <Feather className="size-5 xl:hidden" />
          <span className="hidden text-base xl:inline">Post</span>
        </button>
      </div>

      <AccountMenu viewer={viewer} />
    </div>
  );
}
