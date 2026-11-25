import { redirect } from "next/navigation";
import { Bird } from "lucide-react";
import { HomeTimeline } from "@/components/feed/home-timeline";
import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getViewer } from "@/lib/auth";

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");

  return (
    <HomeTimeline
      viewer={viewer.profile}
      header={
        // Mobile-only top bar (the sidebar is hidden on phones).
        <div className="flex items-center justify-between px-3 pt-2 sm:hidden">
          <AccountMenu viewer={viewer.profile} variant="compact" />
          <Bird className="size-7 text-primary" />
          <ThemeToggle />
        </div>
      }
    />
  );
}
