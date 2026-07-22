import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Dumbbell, Gauge, Heart, Thermometer, Droplet, Footprints } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedReadings, type UnifiedReading } from "@/hooks/useUnifiedReadings";
import { useWorkoutLogs } from "@/hooks/useActivity";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Entry = {
  at: string;
  icon: JSX.Element;
  title: string;
  detail: string;
  source?: string;
  device?: string | null;
};

const iconFor = (kind: UnifiedReading["kind"]) => {
  switch (kind) {
    case "heart_rate": return <Heart className="h-3.5 w-3.5 text-primary" />;
    case "blood_pressure": return <Gauge className="h-3.5 w-3.5 text-primary" />;
    case "spo2": return <Activity className="h-3.5 w-3.5 text-accent" />;
    case "temperature": return <Thermometer className="h-3.5 w-3.5 text-warning" />;
    case "glucose": return <Droplet className="h-3.5 w-3.5 text-destructive" />;
    case "steps": return <Footprints className="h-3.5 w-3.5 text-primary" />;
  }
};

export function BitacoraTab() {
  const { user } = useAuth();
  const from = new Date(Date.now() - 30 * 86400_000).toISOString();
  const to = new Date().toISOString();
  const { data: readings } = useUnifiedReadings(user?.id, from, to);
  const { data: logs } = useWorkoutLogs(30);

  const entries: Entry[] = useMemo(() => {
    const rs: Entry[] = (readings ?? []).map((r) => ({
      at: r.measured_at,
      icon: iconFor(r.kind),
      title:
        r.kind === "blood_pressure"
          ? `Presión ${r.value}/${r.value2} ${r.unit}`
          : r.kind === "heart_rate"
            ? `Frecuencia cardiaca ${r.value} ${r.unit}`
            : r.kind === "spo2"
              ? `SpO₂ ${r.value}%`
              : r.kind === "temperature"
                ? `Temperatura ${r.value} ${r.unit}`
                : r.kind === "glucose"
                  ? `Glucosa ${r.value} ${r.unit}`
                  : `Pasos ${r.value}`,
      detail: r.notes ?? "",
      source: r.source,
      device: r.device_name,
    }));
    const ls: Entry[] = (logs ?? []).map((l) => ({
      at: l.fecha,
      icon: <Dumbbell className="h-3.5 w-3.5 text-accent" />,
      title: l.completed ? "Entrenamiento completado" : "Entrenamiento registrado",
      detail: [
        l.duration_min ? `${l.duration_min} min` : null,
        l.rpe ? `RPE ${l.rpe}` : null,
        l.hr_avg ? `HR ${l.hr_avg} bpm` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      source: "workout",
    }));
    return [...rs, ...ls].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [readings, logs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bitácora de actividad (30 días)</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay registros. Cuando sincronices dispositivos o registres entrenamientos, aparecerán aquí con fecha y hora auditable.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-40 shrink-0 text-xs text-muted-foreground font-mono">
                  {format(new Date(e.at), "dd MMM yy HH:mm", { locale: es })}
                </span>
                <span className="flex items-center gap-1.5">
                  {e.icon}
                  <span className="font-medium">{e.title}</span>
                </span>
                {e.detail && <span className="text-muted-foreground text-xs">{e.detail}</span>}
                {e.source && (
                  <Badge variant={e.source === "ble" ? "default" : "outline"} className="text-[10px] ml-auto">
                    {e.source}
                    {e.device ? ` · ${e.device}` : ""}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}