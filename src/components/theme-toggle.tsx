"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** Sun in light mode, moon in dark mode. Pure CSS, so no hydration flicker. */
function ThemeIcon({ className }: { className?: string }) {
  return (
    <>
      <Sun className={cn("dark:hidden", className)} />
      <Moon className={cn("hidden dark:block", className)} />
    </>
  );
}

export function ThemeToggle({
  variant = "icon",
}: {
  variant?: "sidebar" | "icon";
}) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change theme"
        className={cn(
          "flex items-center rounded-full transition-colors hover:bg-muted data-popup-open:bg-muted",
          variant === "sidebar" ? "w-fit gap-4 p-3 text-xl xl:pr-6" : "p-2",
        )}
      >
        <ThemeIcon className={variant === "sidebar" ? "size-6" : "size-5"} />
        {variant === "sidebar" && (
          <span className="hidden xl:inline">Theme</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={variant === "sidebar" ? "right" : "bottom"}
        align={variant === "sidebar" ? "center" : "end"}
        className="w-44"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme ?? "system"}
            onValueChange={setTheme}
          >
            {options.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                className="py-2 text-[15px]"
              >
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
