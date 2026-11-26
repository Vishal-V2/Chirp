"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes sets the theme before first paint with an inline <script>. Only
 * the copy in the server's HTML ever runs; in the browser React would just warn
 * ("Encountered a script tag…"), so there it's marked as inert text instead.
 */
const scriptProps =
  typeof window === "undefined"
    ? undefined
    : { type: "text/plain", suppressHydrationWarning: true };

/** Adds/removes the `dark` class on <html> and remembers the choice. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  );
}
