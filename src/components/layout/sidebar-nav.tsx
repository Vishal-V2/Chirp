"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Bird, Feather } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
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
          className="wiggle-on-hover flex h-12 items-center justify-center rounded-full px-3 text-primary transition-colors hover:bg-primary/10 xl:w-fit xl:justify-start"
        >
          <Bird className="size-7 xl:hidden" />
          <Wordmark className="hidden text-[2rem] xl:inline-flex" />
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
                  "group/nav relative flex w-fit items-center gap-4 rounded-full p-3 text-xl transition-colors hover:bg-muted/70 xl:pr-6",
                  active && "font-bold",
                )}
              >
                {/* Highlight that slides to whichever page is active. */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span
                  className="block"
                  initial={false}
                  animate={
                    active
                      ? { scale: [1, 1.3, 0.9, 1], rotate: [0, -8, 6, 0] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <Icon
                    className={cn(
                      "size-6 transition-transform duration-200 group-hover/nav:scale-110 group-active/nav:scale-90",
                      active && "text-primary",
                    )}
                    strokeWidth={active ? 2.6 : 2}
                  />
                </motion.span>
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
          <ThemeToggle variant="sidebar" />
        </nav>

        <Link
          href="/?compose=1"
          aria-label="Write a chirp"
          className="pressable mt-4 flex size-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 xl:h-12 xl:w-full"
        >
          <Feather className="size-5 xl:hidden" />
          <span className="hidden text-base xl:inline">Chirp</span>
        </Link>
      </div>

      <AccountMenu viewer={viewer} />
    </div>
  );
}
