import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { AlertTriangle, CheckCircle2, History } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RowLite = { taken_at?: string; measured_at?: string; fecha?: string; source: string | null; device_name: string | null };

const TABLES: { table: string; time: "taken_at" | "measured_at" | "fecha"; label: string }[] = [
  { table: "heart_rate_readings", time: "measured_at", label: "Frecuencia cardíaca" },
  { table: "spo2_readings", time: "taken_at", label: "SpO₂" },
  { table: "blood_pressure_readings", time: "taken_at", label: "Presión arterial" },
  { table: "temperature_readings", time: "taken_at", label: "Temperatura" },
  { table: "glucose_readings", time: "taken_at", label: "Glucosa" },
  { table: "activity_readings", time: "fecha", label: "Actividad / Sueño" },
];

function timeOf(r: RowLite) {
  return r.measured_at ?? r.taken_at ?? r.fecha ?? "";
}

export function ImportHistoryPanel() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;

  const readingsQ = useQuery({
    queryKey: ["import-history-readings", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
      const out: { kind: string; rows: RowLite[] }[] = [];
      for (const t of TABLES) {
        const { data } = await supabase
          .from(t.table as any)
          .select(`${t.time}, source, device_name`)
          .eq("patient_id", patientId!)
          .gte(t.time, since)
          .order(t.time, { ascending: false })
          .limit(500);
        out.push({ kind: t.label, rows: (data as any[]) ?? [] });
      }
      return out;
    },
  });

  const errorsQ = useQuery({
    queryKey: ["import-history-errors", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ble_connection_errors")
        .select("id, occurred_at, error_message, device_id, context")
        .eq("patient_id", patientId!)
        .order("occurred_at", { ascending: false })
        .limit(20);
      return (data as any[]) ?? [];
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, { source: string; device: string; total: number; kinds: Map<string, number>; last: string }>();
    for (const g of readingsQ.data ?? []) {
      for (const r of g.rows) {
        const source = r.source ?? "manual";
        // ignorar manuales al calcular importaciones
        if (source === "manual") continue;
        const device = r.device_name ?? "(sin nombre)";
        const key = `${source}__${device}`;
        const t = timeOf(r);
        const cur = map.get(key) ?? { source, device, total: 0, kinds: new Map(), last: t };
        cur.total += 1;
        cur.kinds.set(g.kind, (cur.kinds.get(g.kind) ?? 0) + 1);
        if (t > cur.last) cur.last = t;
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.last > a.last ? 1 : -1));
  }, [readingsQ.data]);

  const totalImported = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Historial de importaciones (últimos 90 días)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{totalImported} lecturas importadas</Badge>
            <Badge variant="outline">{groups.length} dispositivos / fuentes</Badge>
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay lecturas importadas desde dispositivos o wearables. Usá <b>Sincronizar ahora</b> desde la ficha del dispositivo.
            </p>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={`${g.source}-${g.device}`} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{g.device}</p>
                      <p className="text-xs text-muted-foreground">Fuente: <code>{g.source}</code></p>
                    </div>
                    <div className="text-right text-xs">
                      <Badge variant="secondary">{g.total} registros</Badge>
                      <p className="text-muted-foreground mt-1">
                        Última: {format(new Date(g.last), "dd MMM yyyy · HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(g.kinds.entries()).map(([k, n]) => (
                      <Badge key={k} variant="outline" className="text-[10px]">{k}: {n}</Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {errorsQ.data?.length ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            Errores recientes de conexión / importación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(errorsQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin errores registrados en las últimas importaciones.</p>
          ) : (
            <ul className="space-y-2">
              {(errorsQ.data ?? []).map((e: any) => (
                <li key={e.id} className="text-sm rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-rose-600">{e.error_message}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.occurred_at), "dd MMM · HH:mm", { locale: es })}
                    </span>
                  </div>
                  {e.context && (
                    <pre className="text-[10px] mt-1 text-muted-foreground truncate">
                      {typeof e.context === "string" ? e.context : JSON.stringify(e.context)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}