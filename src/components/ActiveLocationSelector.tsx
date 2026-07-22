import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveLocation } from "@/contexts/ActiveLocationContext";

export function ActiveLocationSelector() {
  const { locations, activeLocationId, setActiveLocationId, hasMultipleLocations } = useActiveLocation();
  if (!hasMultipleLocations) return null;
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={activeLocationId ?? undefined} onValueChange={setActiveLocationId}>
        <SelectTrigger className="h-8 w-52 text-xs">
          <SelectValue placeholder="Consultorio" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.nombre ?? l.direccion ?? l.ciudad ?? "Consultorio"}
              {l.es_principal ? " · Principal" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}