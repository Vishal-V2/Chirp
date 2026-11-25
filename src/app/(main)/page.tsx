import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { HomeTimeline } from "@/components/feed/home-timeline";
import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getViewer } from "@/lib/auth";

export default async function HomePage(props: PageProps<"/">) {
  const viewer = await getViewer();
  const { compose } = await props.searchParams;
  if (!viewer?.profile) redirect("/login");

  return (
    <HomeTimeline
      viewer={viewer.profile}
      focusComposer={compose === "1"}
      header={
        // Mobile-only top bar (the sidebar is hidden on phones).
        <div className="flex items-center justify-between px-3 pt-2 sm:hidden">
          <AccountMenu viewer={viewer.profile} variant="compact" />
          <Wordmark className="text-2xl" />
          <ThemeToggle />
        </div>
      }
    />
  );
}
