import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";

/**
 * Supabase sends people here with a one-time `code` (from a confirmation
 * email, a password-reset email, or after "Continue with Google"), which we
 * exchange for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Google (or Supabase) reported a problem, e.g. the person pressed Cancel.
  const oauthError = searchParams.get("error");
  if (oauthError && !code) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "error",
      oauthError === "access_denied"
        ? "Google sign-in was cancelled."
        : (searchParams.get("error_description") ??
            "Couldn't sign you in. Please try again."),
    );
    return NextResponse.redirect(login);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const login = new URL("/login", origin);
  login.searchParams.set(
    "error",
    "That link is invalid or has expired. Log in, or sign up again to get a new one.",
  );
  return NextResponse.redirect(login);
}
