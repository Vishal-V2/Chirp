"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather } from "lucide-react";
import { getNavItems } from "./nav-items";

export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Post"
        className="fixed right-4 bottom-20 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg sm:hidden"
      >
        <Feather className="size-6" />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-14 items-center justify-around border-t bg-background/90 backdrop-blur sm:hidden">
        {getNavItems(username).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 items-center justify-center py-3"
            >
              <Icon className="size-6" strokeWidth={active ? 2.6 : 2} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
