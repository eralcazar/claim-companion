import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          {!isMobile && (
            <header className="h-14 flex items-center border-b px-4 gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-semibold text-primary">
                MediClaim
              </h1>
            </header>
          )}

          {isMobile && (
            <header className="h-14 flex items-center border-b px-4">
              <h1 className="font-heading text-lg font-semibold text-primary">
                MediClaim
              </h1>
            </header>
          )}

          <ImpersonationBanner />

          <main className={`flex-1 p-4 ${isMobile ? "pb-20" : ""}`}>
            <Outlet />
          </main>
        </div>

        {isMobile && <BottomNav />}
      </div>
    </SidebarProvider>
  );
}
