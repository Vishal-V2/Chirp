import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { reactivateAccount } from "@/app/actions/account";
import { signOut } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";
import { deletionDate } from "@/lib/account-deletion";

export const metadata: Metadata = { title: "Reactivate your account" };

/** Shown when someone logs in to a deactivated account. */
export default async function ReactivatePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.profile) redirect("/onboarding");
  if (!viewer.deactivatedAt) redirect("/");

  const date = deletionDate(viewer.deactivatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-10" />
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          Reactivate your account?
        </h1>
        <p className="mt-3 text-muted-foreground">
          You deactivated @{viewer.profile.username}. It&apos;s hidden from
          everyone and will be{" "}
          <strong className="text-foreground">
            deleted for good on {date}
          </strong>
          . Reactivate it to bring back your profile, chirps, followers and
          messages, exactly as they were.
        </p>
        <form action={reactivateAccount} className="mt-8">
          <button
            type="submit"
            className="pressable h-12 w-full rounded-full bg-foreground font-bold text-background hover:bg-foreground/90"
          >
            Yes, reactivate
          </button>
        </form>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="pressable h-12 w-full rounded-full border font-bold hover:bg-muted"
          >
            No, log out
          </button>
        </form>
      </div>
    </main>
  );
}
