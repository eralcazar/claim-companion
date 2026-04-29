import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { NotificationBell } from "@/components/NotificationBell";

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
              <div className="flex flex-col leading-tight">
                <h1 className="font-heading text-lg font-semibold text-primary">
                  Bienestar Móvil
                </h1>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Iniciativa Ciudadana
                </span>
              </div>
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </header>
          )}

          {isMobile && (
            <header className="h-14 flex items-center border-b px-4">
              <div className="flex flex-col leading-tight">
                <h1 className="font-heading text-base font-semibold text-primary">
                  Bienestar Móvil
                </h1>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Iniciativa Ciudadana
                </span>
              </div>
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
      </div>
    </SidebarProvider>
  );
}
