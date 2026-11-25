import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages anyone can open without signing in. */
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth/"];
/** Pages a signed-in user should skip. */
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

const matches = (path: string, list: string[]) =>
  list.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));

// Refreshes the Supabase session cookie on every request, and sends
// signed-out visitors to /login (optimistic check; pages re-check on the server).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this call refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  // The GraphQL API answers signed-out requests itself (with UNAUTHENTICATED errors).
  if (path.startsWith("/api/")) return response;

  // Supabase sends failed email links (expired, already used) back with
  // ?error_code=… on whatever page; explain it on the login page instead.
  const linkError = request.nextUrl.searchParams.get("error_code");
  if (linkError && path !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = signedIn ? "/" : "/login";
    url.search = signedIn
      ? ""
      : `?error=${encodeURIComponent(
          linkError === "otp_expired"
            ? "That email link has expired or was already used. Request a new one."
            : "That email link didn't work. Please try again.",
        )}`;
    return NextResponse.redirect(url);
  }

  // Reached /reset-password without a valid reset link (e.g. it expired).
  if (!signedIn && path === "/reset-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=${encodeURIComponent("Your reset link has expired. Request a new one with “Forgot password?”.")}`;
    return NextResponse.redirect(url);
  }

  if (!signedIn && !matches(path, PUBLIC_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (signedIn && matches(path, GUEST_ONLY)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
