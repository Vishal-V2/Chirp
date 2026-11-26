import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bird } from "lucide-react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile) redirect("/");

  // Suggest a username from the email, e.g. "jane.doe@x.com" -> "jane_doe".
  const suggested = (viewer.email?.split("@")[0] ?? "")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .slice(0, 15);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Bird className="mb-8 size-10 text-primary" />
        <h1 className="mb-2 font-heading text-3xl font-extrabold tracking-tight">
          Set up your profile
        </h1>
        <p className="mb-8 text-muted-foreground">
          Pick a name and a username. You can change your name later.
        </p>
        <OnboardingForm
          suggestedUsername={suggested}
          suggestedName={viewer.name}
        />
      </div>
    </main>
  );
}
