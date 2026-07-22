import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDoctorSuggestions } from "@/hooks/useDoctorSuggestions";
import { formatDistance } from "@/lib/geo/haversine";
import { Check, MapPinned } from "lucide-react";

export function SuggestedDoctorsList({
  lat,
  lng,
  selected,
  onSelect,
}: {
  lat: number | null;
  lng: number | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data = [], isLoading } = useDoctorSuggestions({ lat, lng });
  if (lat == null || lng == null) {
    return (
      <p className="text-xs text-muted-foreground">
        Fija tu dirección para ver médicos sugeridos.
      </p>
    );
  }
  if (isLoading) return <p className="text-xs text-muted-foreground">Buscando médicos…</p>;
  if (data.length === 0) return <p className="text-xs text-muted-foreground">Sin médicos registrados.</p>;
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left rounded-md border p-2 text-sm hover:bg-accent ${selected === null ? "border-primary bg-accent" : ""}`}
      >
        Cualquier médico disponible
      </button>
      {data.map((d) => {
        const active = selected === d.user_id;
        return (
          <button
            key={d.user_id}
            type="button"
            onClick={() => onSelect(d.user_id)}
            className={`w-full text-left rounded-md border p-2 hover:bg-accent transition ${active ? "border-primary bg-accent" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{d.full_name}</span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex flex-wrap gap-1 mt-1 text-xs">
              {d.in_coverage ? (
                <Badge variant="secondary" className="text-[10px]">En cobertura</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Fuera de cobertura</Badge>
              )}
              {d.available_today && <Badge variant="default" className="text-[10px]">Disponible hoy</Badge>}
              {d.distance_m != null && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPinned className="h-3 w-3" />{formatDistance(d.distance_m)}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}