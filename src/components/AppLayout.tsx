import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import { KariFloatingButton } from "@/components/kari/KariFloatingButton";

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
              <CareCentralLogo size={28} withText />
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </header>
          )}

          {isMobile && (
            <header className="h-14 flex items-center border-b px-4">
              <CareCentralLogo size={26} withText />
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </header>
          )}

          <ImpersonationBanner />

          <main className={`flex-1 p-4 ${isMobile ? "pb-20" : ""}`}>
            <Outlet />
          </main>
        </div>

        {isMobile && <BottomNav />}
        <KariFloatingButton />
      </div>
    </SidebarProvider>
  );
}
