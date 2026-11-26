import { z } from "zod";

// Shared rules used by the forms (server actions) and the GraphQL API.

/**
 * Names that would collide with Chirp's own pages (profiles live at
 * /<username>, so a user called "explore" would be hidden by /explore),
 * plus a few that would confuse people.
 */
export const RESERVED_USERNAMES = new Set([
  "home",
  "explore",
  "notifications",
  "messages",
  "bookmarks",
  "hashtag",
  "login",
  "logout",
  "signup",
  "onboarding",
  "settings",
  "api",
  "auth",
  "status",
  "search",
  "admin",
  "root",
  "support",
  "help",
  "about",
  "privacy",
  "terms",
  "compose",
  "new",
  "chirp",
  "chirps",
  "i",
  "me",
]);

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]+$/, "Only letters, numbers and _ are allowed.")
  .min(3, "Username must be at least 3 characters.")
  .max(15, "Username must be 15 characters or fewer.")
  .refine(
    (u) => !RESERVED_USERNAMES.has(u.toLowerCase()),
    "That username isn't available.",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name can't be blank.")
  .max(50, "Name must be 50 characters or fewer.");

export const bioSchema = z
  .string()
  .trim()
  .max(160, "Bio must be 160 characters or fewer.");

export const emailSchema = z.email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

/** First error message per field, for showing under form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Only allow same-site relative redirects like "/samrivera" (blocks "//evil.com"). */
export function safeNext(next: unknown, fallback = "/"): string {
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
    ? next
    : fallback;
}
