import { cookies } from "next/headers";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { FirstRunTour } from "@/components/tour/first-run-tour";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth";
import { getUserPreferences } from "@/lib/db/queries";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DataStreamProvider>
      <Suspense fallback={<div className="flex h-dvh" />}>
        <SidebarWrapper>{children}</SidebarWrapper>
      </Suspense>
    </DataStreamProvider>
  );
}

async function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([getSession(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  // First-run tour auto-starts only for a signed-in user who has not seen it.
  const autoStartTour = session?.user
    ? !(await getUserPreferences({ userId: session.user.id })).hasSeenTour
    : false;

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
      <SidebarInset>{children}</SidebarInset>
      <FirstRunTour autoStart={autoStartTour} />
    </SidebarProvider>
  );
}
