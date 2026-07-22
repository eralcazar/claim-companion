import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import { KariFloatingButton } from "@/components/kari/KariFloatingButton";
import { BrandSplash } from "@/components/brand/BrandSplash";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PrivacyConsentTracker } from "@/components/legal/PrivacyConsentTracker";
import { CfdiTestModeBanner } from "@/components/facturacion/CfdiModeBadge";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ActiveLocationSelector } from "@/components/ActiveLocationSelector";

export function AppLayout() {
  const isMobile = useIsMobile();
  usePushNotifications();
  useKeyboardShortcuts();

  return (
    <SidebarProvider>
      <BrandSplash />
      <PrivacyConsentTracker />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          {!isMobile && (
            <header className="h-16 flex items-center border-b px-4 gap-3 bg-background/80 backdrop-blur">
              <SidebarTrigger />
              <div className="h-6 w-px bg-border" />
              <CareCentralLogo size={52} withText />
              <div className="ml-auto flex items-center gap-1">
                <ActiveLocationSelector />
                <KeyboardShortcutsHelp />
                <NotificationBell />
              </div>
            </header>
          )}

          {isMobile && (
            <header className="h-16 flex items-center border-b px-4 bg-background/80 backdrop-blur">
              <CareCentralLogo size={44} withText />
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </header>
          )}

          <ImpersonationBanner />
          <CfdiTestModeBanner />

          <main id="main-content" tabIndex={-1} className={`flex-1 p-4 focus:outline-none ${isMobile ? "pb-20" : ""}`}>
            <Outlet />
          </main>
        </div>

        {isMobile && <BottomNav />}
        <KariFloatingButton />
      </div>
    </SidebarProvider>
  );
}
