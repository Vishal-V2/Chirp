"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Feather } from "lucide-react";
import { getNavItems } from "./nav-items";

export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/?compose=1"
        aria-label="Write a chirp"
        className="pressable fixed right-4 bottom-20 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 sm:hidden"
      >
        <Feather className="size-6" />
      </Link>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-14 items-center justify-around border-t bg-background/90 backdrop-blur sm:hidden">
        {getNavItems(username).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="pressable relative flex flex-1 items-center justify-center py-3"
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <motion.span
                className="block"
                initial={false}
                animate={active ? { scale: [1, 1.3, 0.9, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Icon
                  className={cn("size-6", active && "text-primary")}
                  strokeWidth={active ? 2.6 : 2}
                />
              </motion.span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
