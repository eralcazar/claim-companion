import { Home, FileText, Calendar, User, FolderOpen } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const tabs = [
    { to: "/", icon: Home, label: "Panel de Paciente" },
    { to: "/reclamos", icon: FileText, label: "Reclamos" },
    { to: "/agenda", icon: Calendar, label: "Agenda" },
    { to: "/expediente", icon: FolderOpen, label: "Expediente" },
    { to: "/perfil", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
