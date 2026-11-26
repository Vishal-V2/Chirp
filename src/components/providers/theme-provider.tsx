"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Adds/removes the `dark` class on <html> and remembers the choice. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
