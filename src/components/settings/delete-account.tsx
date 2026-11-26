"use client";

import { useActionState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FormError } from "@/components/auth/form-field";
import { deactivateAccount, type DeactivateState } from "@/app/actions/account";
import { signInWithGoogle } from "@/app/actions/auth";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";

export type DeletionCheck = {
  method: "password" | "google";
  recentGoogleSignIn: boolean;
};

/** Settings → Delete account: deactivate now, deleted for good after 5 days. */
export function DeleteAccountView({
  check,
  username,
}: {
  check: DeletionCheck;
  username: string;
}) {
  const [state, action, pending] = useActionState<DeactivateState, FormData>(
    deactivateAccount,
    {},
  );

  return (
    <>
      <PageHeader back title="Delete account" />
      <div className="px-4 py-4">
        <h2 className="font-heading text-xl font-bold tracking-tight">
          This will deactivate @{username}
        </h2>
        <div className="mt-3 space-y-3 text-[15px] text-muted-foreground">
          <p>
            Your profile, chirps, replies and likes disappear from Chirp right
            away, and you&apos;re logged out everywhere.
          </p>
          <p>
            <strong className="text-foreground">
              Changed your mind? Log in within {DELETE_AFTER_DAYS} days
            </strong>{" "}
            to restore everything, exactly as it was. After that your account,
            chirps, messages and photos are deleted for good. This can&apos;t be
            undone.
          </p>
          <p>
            Your username stays reserved for those {DELETE_AFTER_DAYS} days,
            then becomes available to others.
          </p>
        </div>

        {check.method === "password" ? (
          <form action={action} className="mt-8 flex flex-col gap-3">
            <FormError message={state.error} />
            <label className="text-sm font-semibold" htmlFor="delete-password">
              Enter your password to confirm
            </label>
            <input
              id="delete-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="h-11 rounded-md border bg-transparent px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <DangerButton pending={pending} />
          </form>
        ) : check.recentGoogleSignIn ? (
          <form action={action} className="mt-8 flex flex-col gap-3">
            <FormError message={state.error} />
            <p className="text-sm text-muted-foreground">
              You just confirmed it&apos;s you with Google.
            </p>
            <DangerButton pending={pending} />
          </form>
        ) : (
          <form action={signInWithGoogle} className="mt-8 flex flex-col gap-3">
            <input type="hidden" name="next" value="/settings/delete-account" />
            <p className="text-sm text-muted-foreground">
              You sign in with Google, so confirm it&apos;s you by signing in
              with Google again.
            </p>
            <button
              type="submit"
              className="pressable h-11 rounded-full border font-bold hover:bg-muted"
            >
              Confirm with Google
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function DangerButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="pressable h-11 rounded-full bg-destructive font-bold text-white hover:bg-destructive/90 disabled:opacity-60"
    >
      {pending ? "Deactivating…" : "Deactivate account"}
    </button>
  );
}
