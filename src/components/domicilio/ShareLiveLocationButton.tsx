import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Radio, RadioTower } from "lucide-react";
import { useShareDoctorLocation } from "@/hooks/useDoctorLiveLocation";

export function ShareLiveLocationButton({ visitId }: { visitId: string }) {
  const [enabled, setEnabled] = useState(false);
  const { active, lastPoint, error } = useShareDoctorLocation(visitId, enabled);
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={enabled ? "default" : "outline"}
        onClick={() => setEnabled((v) => !v)}
      >
        {enabled ? <RadioTower className="h-4 w-4 mr-1 animate-pulse" /> : <Radio className="h-4 w-4 mr-1" />}
        {enabled ? "Compartiendo ubicación" : "Compartir ubicación"}
      </Button>
      {enabled && (
        <span className="text-xs text-muted-foreground">
          {active
            ? lastPoint
              ? `± ${Math.round(lastPoint.accuracy_m ?? 0)} m`
              : "Obteniendo GPS…"
            : error ?? "Iniciando…"}
        </span>
      )}
    </div>
  );
}