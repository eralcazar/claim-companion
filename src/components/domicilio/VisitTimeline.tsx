import { useVisitEvents } from "@/hooks/useHomeVisits";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check, X, Car, MapPin, PlusCircle, Flag, Ban, PencilLine,
} from "lucide-react";

const META: Record<string, { label: string; Icon: any; color: string }> = {
  created:   { label: "Solicitud creada",  Icon: PlusCircle, color: "text-primary" },
  accepted:  { label: "Aceptada",          Icon: Check,      color: "text-emerald-600" },
  rejected:  { label: "Rechazada",         Icon: X,          color: "text-destructive" },
  en_route:  { label: "En camino",         Icon: Car,        color: "text-amber-600" },
  arrived:   { label: "Llegó al domicilio",Icon: MapPin,     color: "text-emerald-600" },
  completed: { label: "Completada",        Icon: Flag,       color: "text-emerald-700" },
  cancelled: { label: "Cancelada",         Icon: Ban,        color: "text-muted-foreground" },
  updated:   { label: "Actualizada",       Icon: PencilLine, color: "text-muted-foreground" },
};

export function VisitTimeline({ visitId }: { visitId: string }) {
  const { data: events = [], isLoading } = useVisitEvents(visitId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando historial…</p>;
  if (events.length === 0) return <p className="text-sm text-muted-foreground">Sin eventos aún.</p>;
  return (
    <ol className="relative border-l border-border pl-6 space-y-4">
      {events.map((e) => {
        const m = META[e.event] ?? META.updated;
        const Icon = m.Icon;
        const motivo = e.metadata?.motivo_rechazo as string | undefined;
        return (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full bg-background border ${m.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(e.created_at), "d MMM yyyy · HH:mm", { locale: es })}
            </div>
            {motivo && <p className="text-xs mt-1">Motivo: {motivo}</p>}
          </li>
        );
      })}
    </ol>
  );
}