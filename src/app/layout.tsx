import type { Metadata } from "next";
import { Bricolage_Grotesque, Schibsted_Grotesk } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Display: wordmark, page titles, names. Its width and optical-size axes give
// the brand some character.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

// Body/UI: a news publisher's reading face, calm next to the quirky display.
const body = Schibsted_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Chirp", template: "%s / Chirp" },
  description: "Short posts from the people you follow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class before React loads.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
