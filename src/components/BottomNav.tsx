import { Home, FileText, Calendar, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import kariAvatar from "@/assets/kari-avatar.png";

const sideTabs = [
  { to: "/", icon: Home, label: "Inicio", end: true },
  { to: "/reclamos", icon: FileText, label: "Reclamos", end: false },
  { to: "/agenda", icon: Calendar, label: "Agenda", end: false },
  { to: "/perfil", icon: User, label: "Perfil", end: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/85 md:hidden"
      style={{ boxShadow: "0 -4px 20px -8px hsl(var(--primary) / 0.25)" }}
    >
      <div className="relative flex h-16 items-end justify-around px-2 pb-1">
        {/* Tabs izquierda */}
        {sideTabs.slice(0, 2).map(({ to, icon: Icon, label, end }) => (
          <NavTab key={to} to={to} end={end} icon={Icon} label={label} />
        ))}

        {/* FAB Kari central */}
        <NavLink
          to="/kari"
          className={({ isActive }) =>
            cn(
              "relative -mt-6 flex flex-col items-center justify-end gap-0.5 text-[10px] font-medium transition-transform active:scale-95",
              isActive ? "text-primary" : "text-sidebar-foreground/80",
            )
          }
          aria-label="Pregúntale a Kari"
        >
          <span
            className="rounded-full p-[3px] shadow-lg"
            style={{
              background: "var(--gradient-brand)",
              boxShadow: "0 6px 20px -4px hsl(var(--primary) / 0.55)",
            }}
          >
            <span className="block rounded-full bg-sidebar p-[2px]">
              <img
                src={kariAvatar}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
                style={{ objectPosition: "center top" }}
              />
            </span>
          </span>
          <span>Kari</span>
        </NavLink>

        {/* Tabs derecha */}
        {sideTabs.slice(2).map(({ to, icon: Icon, label, end }) => (
          <NavTab key={to} to={to} end={end} icon={Icon} label={label} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({
  to,
  end,
  icon: Icon,
  label,
}: {
  to: string;
  end: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative flex flex-1 max-w-[80px] flex-col items-center gap-0.5 px-2 py-1 text-[11px] transition-colors",
          isActive
            ? "text-primary font-semibold"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-primary" />
          )}
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
