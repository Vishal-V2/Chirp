import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { GraphQLProvider } from "@/components/graphql-provider";
import { RealtimeMessagesProvider } from "@/components/messages/realtime-provider";
import { Toaster } from "@/components/ui/sonner";
import { ViewerProvider } from "@/components/viewer-provider";
import { getViewer } from "@/lib/auth";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  // Signed in + has a profile, or we send them where they need to go.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.profile) redirect("/onboarding");

  return (
    <ViewerProvider viewer={viewer.profile}>
      <GraphQLProvider>
        <RealtimeMessagesProvider userId={viewer.profile.id}>
          <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] justify-center">
            <header className="sticky top-0 hidden h-dvh w-[72px] shrink-0 sm:block xl:w-[260px]">
              <SidebarNav viewer={viewer.profile} />
            </header>

            <main className="min-w-0 w-full max-w-[600px] border-x pb-14 sm:pb-0">
              {children}
            </main>

            <aside className="hidden w-[350px] shrink-0 pl-6 lg:block">
              <RightSidebar />
            </aside>

            <MobileNav username={viewer.profile.username} />
          </div>
        </RealtimeMessagesProvider>
      </GraphQLProvider>
      <Toaster position="bottom-center" />
    </ViewerProvider>
  );
}
