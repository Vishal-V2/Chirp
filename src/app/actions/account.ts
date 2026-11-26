"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { RECENT_SIGN_IN_MINUTES, deletionCheck } from "@/lib/account-deletion";

export type DeactivateState = { error?: string };

/** Is this password right for this email? Checked on a throwaway session. */
async function passwordIsCorrect(email: string, password: string) {
  const supabase = createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return false;
  // End just this check's session; the person's real session is untouched.
  await supabase.auth.signOut({ scope: "local" });
  return true;
}

/**
 * Deactivates the signed-in account after re-checking who it is (password,
 * or a fresh Google sign-in). The account is hidden at once and deleted for
 * good after 5 days unless they log in and reactivate it.
 */
export async function deactivateAccount(
  _prev: DeactivateState,
  formData: FormData,
): Promise<DeactivateState> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const check = deletionCheck(data?.claims);

  if (check.method === "password") {
    const password = formData.get("password");
    if (typeof password !== "string" || !password) {
      return { error: "Enter your password." };
    }
    if (!viewer.email || !(await passwordIsCorrect(viewer.email, password))) {
      return { error: "That password isn't right." };
    }
  } else if (!check.recentGoogleSignIn) {
    return {
      error: `Confirm with Google first (within ${RECENT_SIGN_IN_MINUTES} minutes of deactivating).`,
    };
  }

  await prisma.user.update({
    where: { id: viewer.profile.id },
    data: { deactivatedAt: new Date() },
  });
  // Sign out everywhere.
  await supabase.auth.signOut({ scope: "global" });
  redirect(
    `/login?notice=${encodeURIComponent("Your account is deactivated. Log in within 5 days to restore it; after that it's deleted for good.")}`,
  );
}

/** Brings a deactivated account back, exactly as it was. */
export async function reactivateAccount() {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");
  await prisma.user.update({
    where: { id: viewer.profile.id },
    data: { deactivatedAt: null },
  });
  redirect("/");
}
