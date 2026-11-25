import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The reset link signs you in via /auth/callback; without that, there's nothing to reset.
  const viewer = await getViewer();
  if (!viewer) {
    redirect(
      `/login?error=${encodeURIComponent("Your reset link has expired. Request a new one with “Forgot password?”.")}`,
    );
  }

  return (
    <>
      <h1 className="mb-2 font-heading text-3xl font-extrabold tracking-tight">Choose a new password</h1>
      <p className="mb-8 text-muted-foreground">
        {viewer.email ? (
          <>
            For <span className="font-medium text-foreground">{viewer.email}</span>.{" "}
          </>
        ) : null}
        You&apos;ll stay signed in afterwards.
      </p>
      <ResetPasswordForm />
    </>
  );
}
