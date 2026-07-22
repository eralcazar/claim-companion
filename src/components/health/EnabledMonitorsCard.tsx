import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartPulse, Moon, Footprints, Droplet, Activity, Thermometer } from "lucide-react";
import { useDeviceCapabilities, type MonitorKey } from "@/hooks/useDeviceCapabilities";

const MONITORS: Array<{
  key: MonitorKey;
  label: string;
  route: string;
  Icon: typeof HeartPulse;
}> = [
  { key: "heart_rate", label: "Pulso", route: "/frecuencia-cardiaca", Icon: HeartPulse },
  { key: "sleep", label: "Sueño", route: "/sueno", Icon: Moon },
  { key: "steps", label: "Pasos y actividad", route: "/pasos", Icon: Footprints },
  { key: "spo2", label: "Oxigenación", route: "/salud", Icon: Droplet },
  { key: "blood_pressure", label: "Presión arterial", route: "/salud", Icon: Activity },
  { key: "temperature", label: "Temperatura", route: "/salud", Icon: Thermometer },
];

/**
 * Muestra qué monitores están habilitados según los dispositivos emparejados y
 * los datos ya sincronizados. Los monitores de pulso, sueño y pasos se activan
 * automáticamente aunque el dispositivo no mida oxigenación ni presión arterial.
 */
export function EnabledMonitorsCard() {
  const { data, isLoading } = useDeviceCapabilities();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Monitores habilitados por tus dispositivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.devices && data.devices.length > 0 && (
          <div className="flex flex-wrap gap-1 text-xs">
            {data.devices.map((d, i) => (
              <Badge key={i} variant="outline">{d.name}</Badge>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {MONITORS.map(({ key, label, route, Icon }) => {
            const enabled = data?.enabledMonitors?.[key] ?? false;
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-2 rounded-md border p-2 ${
                  enabled ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{label}</span>
                </div>
                {enabled ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={route}>Abrir</Link>
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Sin datos</Badge>
                )}
              </div>
            );
          })}
        </div>
        {isLoading && (
          <p className="text-xs text-muted-foreground">Detectando capacidades…</p>
        )}
        {!isLoading && !data?.devices?.length && (
          <p className="text-xs text-muted-foreground">
            Aún no tienes dispositivos emparejados. Los monitores se habilitan también con registro manual o importación CSV.
          </p>
        )}
      </CardContent>
    </Card>
  );
}