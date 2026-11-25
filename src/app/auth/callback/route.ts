import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";

/**
 * Supabase sends users here from the confirmation email with a one-time
 * `code`, which we exchange for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

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
