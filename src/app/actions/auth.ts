"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, fieldErrors, passwordSchema, safeNext } from "@/lib/validation";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set after sign-up when Supabase sent a confirmation email. */
  checkEmail?: string;
  email?: string;
};

const credentials = z.object({ email: emailSchema, password: passwordSchema });

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "An account with this email already exists. Try logging in.", email };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Too many sign-up emails sent. Please wait a bit and try again.", email };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: error.message }, email };
    }
    return { error: error.message, email };
  }

  // Email confirmation turned off in Supabase: already signed in.
  if (data.session) redirect("/onboarding");

  return { checkEmail: parsed.data.email };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Enter your password.") })
    .safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "invalid_credentials") return { error: "Wrong email or password.", email };
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the link.", email };
    }
    return { error: error.message, email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
