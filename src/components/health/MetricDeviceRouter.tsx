import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, HeartPulse, Layers, Moon, Wind, X } from "lucide-react";
import { useMemo } from "react";
import { useMetricDevicePreferences, type MetricKey } from "@/hooks/useMetricDevicePreferences";
import { useMyDeviceVerifications } from "@/hooks/useDeviceVerifications";
import { toast } from "sonner";

const METRICS: { key: MetricKey; label: string; icon: any }[] = [
  { key: "heart_rate", label: "Frecuencia cardíaca", icon: HeartPulse },
  { key: "steps", label: "Pasos / actividad", icon: Activity },
  { key: "sleep", label: "Sueño", icon: Moon },
  { key: "spo2", label: "SpO₂", icon: Wind },
];

export function MetricDeviceRouter() {
  const { list, setPreferred, clearMetric } = useMetricDevicePreferences();
  const verifs = useMyDeviceVerifications();

  const devices = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of verifs.data ?? []) {
      if (v.status === "success") {
        map.set(v.device_id, v.model_label || v.device_id);
      }
    }
    return Array.from(map, ([device_id, label]) => ({ device_id, label }));
  }, [verifs.data]);

  const currentFor = (metric: MetricKey) =>
    (list.data ?? []).find((p) => p.metric === metric && p.priority === 1) ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Dispositivo preferido por métrica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cuando tenés varios dispositivos conectados a la vez, elegí cuál usar por métrica.
          Si dos dispositivos reportan la misma medición al mismo tiempo, CareCentral se queda
          con el que marques como preferido.
        </p>

        {devices.length === 0 && (
          <div className="rounded border p-2 text-xs text-muted-foreground">
            Todavía no tenés dispositivos homologados. Registrá al menos una verificación exitosa
            desde el catálogo para poder elegir preferencia por métrica.
          </div>
        )}

        <ul className="space-y-2">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const current = currentFor(m.key);
            return (
              <li key={m.key} className="rounded-md border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {m.label}
                  </span>
                  {current ? (
                    <Badge variant="secondary" className="text-xs">
                      Preferido: {current.device_label ?? current.device_id}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Sin preferencia</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select
                    disabled={devices.length === 0}
                    value={current?.device_id ?? ""}
                    onValueChange={(v) => {
                      const d = devices.find((x) => x.device_id === v);
                      setPreferred.mutate(
                        { metric: m.key, device_id: v, device_label: d?.label ?? null },
                        { onSuccess: () => toast.success("Preferencia guardada") },
                      );
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Elegir dispositivo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.device_id} value={d.device_id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {current && (
                    <Button size="sm" variant="ghost" onClick={() => clearMetric.mutate(m.key)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}