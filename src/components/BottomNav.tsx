import { Home, FileText, Calendar, Pill, User, FlaskConical, Stethoscope } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { user, roles } = useAuth();
  const { actingAsPatientId } = useImpersonation();

  const patientConsultorioId = actingAsPatientId ?? user?.id;
  const showPatientConsultorio = !!patientConsultorioId && (roles.includes("paciente") || !!actingAsPatientId);

  const tabs = [
    { to: "/", icon: Home, label: "Panel de Paciente" },
    { to: "/reclamos", icon: FileText, label: "Reclamos" },
    { to: "/agenda", icon: Calendar, label: "Agenda" },
    ...(showPatientConsultorio
      ? [{ to: `/consultorio?paciente=${patientConsultorioId}`, icon: Stethoscope, label: "Consultorio" }]
      : []),
    { to: "/recetas", icon: Pill, label: "Recetas" },
    { to: "/estudios", icon: FlaskConical, label: "Estudios" },
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
