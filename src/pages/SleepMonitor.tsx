import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Moon, Bluetooth, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useActivityGoals } from "@/hooks/useActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DailySeriesChart } from "@/components/health/DailySeriesChart";
import { MonitorPdfExport } from "@/components/health/MonitorPdfExport";
import { EnabledMonitorsCard } from "@/components/health/EnabledMonitorsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { useResolvedThreshold } from "@/hooks/usePatientThresholds";
import { MonitorAlertsCard } from "@/components/health/MonitorAlertsCard";
import { SyncStatusPill } from "@/components/health/SyncStatusPill";

type Row = {
  fecha: string;
  sleep_minutes: number | null;
  source: string | null;
  device_name: string | null;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function SleepMonitor() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  const qc = useQueryClient();
  const { data: goals } = useActivityGoals();
  const goalMin = goals?.sleep_minutes_goal ?? 420;

  const [form, setForm] = useState({ fecha: isoToday(), horas: 7, minutos: 0 });
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30 | 60 | 90>(30);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sleep-monitor", patientId, rangeDays],
    enabled: !!patientId,
    queryFn: async (): Promise<Row[]> => {
      const from = new Date(Date.now() - rangeDays * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("activity_readings")
        .select("fecha, sleep_minutes, source, device_name")
        .eq("patient_id", patientId!)
        .gte("fecha", from)
        .not("sleep_minutes", "is", null)
        .order("fecha", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const sources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source ?? "manual"))),
    [rows],
  );
  const deviceNames = useMemo(
    () => Array.from(new Set(rows.map((r) => r.device_name).filter(Boolean) as string[])),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (sourceFilter === "all" || (r.source ?? "manual") === sourceFilter) &&
          (deviceFilter === "all" || r.device_name === deviceFilter),
      ),
    [rows, sourceFilter, deviceFilter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    const meta = new Map<string, { source?: string | null; device?: string | null }>();
    for (const r of filtered) {
      if (r.sleep_minutes == null) continue;
      const prev = map.get(r.fecha) ?? 0;
      if (r.sleep_minutes >= prev) {
        map.set(r.fecha, r.sleep_minutes);
        meta.set(r.fecha, { source: r.source, device: r.device_name });
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([fecha, mins]) => ({
        fecha,
        value: +(mins / 60).toFixed(2),
        source: meta.get(fecha)?.source ?? null,
        device: meta.get(fecha)?.device ?? null,
      }));
  }, [filtered]);

  const kpi = useMemo(() => {
    const last7 = byDay.slice(-7);
    const last30 = byDay.slice(-30);
    const avg = (arr: typeof byDay) =>
      arr.length ? arr.reduce((s, x) => s + x.value, 0) / arr.length : 0;
    const goalH = goalMin / 60;
    const below = last30.filter((x) => x.value < goalH).length;
    const best = last30.reduce((m, x) => (x.value > m ? x.value : m), 0);
    return { avg7: avg(last7), avg30: avg(last30), below, best, goalH };
  }, [byDay, goalMin]);

  const lastNight = byDay.length ? byDay[byDay.length - 1] : null;

  const th = useResolvedThreshold("sleep");
  const { syncStatus, lastReadingAt, alerts } = useMonitorHealth({
    points: byDay.map((d) => ({ fecha: d.fecha, value: d.value, source: d.source ?? null })),
    rangeDays,
    hardLow: th.hardLow ?? 3, hardHigh: th.hardHigh ?? 14,
    outlierZ: th.outlierZ,
    label: "sueño", unit: "h",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error("Sin sesión");
      const total = Math.max(0, Math.round(form.horas * 60 + form.minutos));
      const { error } = await supabase
        .from("activity_readings")
        .upsert(
          {
            patient_id: patientId,
            fecha: form.fecha,
            sleep_minutes: total,
            source: "manual",
          },
          { onConflict: "patient_id,fecha,source" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro guardado");
      qc.invalidateQueries({ queryKey: ["sleep-monitor"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Moon className="h-6 w-6 text-primary" />
            Monitor de Sueño
          </h1>
          <p className="text-sm text-muted-foreground">
            Horas dormidas por noche. Se sincroniza desde tu smartwatch (Xiaomi/Mi Fitness) vía
            Health Connect o Apple Health.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dispositivos">
            <Bluetooth className="h-4 w-4 mr-1" />
            Dispositivos compatibles
          </Link>
        </Button>
      </header>

      <EnabledMonitorsCard />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <SyncStatusPill
          status={syncStatus}
          lastReadingAt={lastReadingAt}
          onRetry={() => refetch()}
          retrying={isFetching}
          deviceLabel={lastNight?.device ?? null}
        />
      </div>
      <MonitorAlertsCard alerts={alerts} />

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Rango</Label>
            <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v) as any)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[7, 14, 30, 60, 90].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} días</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fuente</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dispositivo</Label>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {deviceNames.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <MonitorPdfExport
              title="Monitor de Sueño"
              subtitle={`Últimos ${rangeDays} días`}
              unit="h"
              goal={+kpi.goalH.toFixed(1)}
              kpis={[
                { label: "Última noche", value: byDay.length ? `${byDay[byDay.length-1].value.toFixed(1)} h` : "—" },
                { label: "Promedio 7 días", value: `${kpi.avg7.toFixed(1)} h` },
                { label: `Promedio ${rangeDays} días`, value: `${kpi.avg30.toFixed(1)} h` },
                { label: "Noches bajo meta", value: String(kpi.below) },
                { label: "Mejor noche", value: `${kpi.best.toFixed(1)} h` },
              ]}
              data={byDay}
              fileName={`sueno-${rangeDays}d.pdf`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Última noche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {lastNight ? `${lastNight.value.toFixed(1)} h` : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {lastNight ? new Date(lastNight.fecha + "T00:00:00").toLocaleDateString("es-MX") : "sin registro"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Promedio 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpi.avg7.toFixed(1)} h</div>
            <div className="text-xs text-muted-foreground">Meta {kpi.goalH.toFixed(1)} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Promedio 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpi.avg30.toFixed(1)} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bajo meta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpi.below}</div>
            <div className="text-xs text-muted-foreground">de últimas 30 noches</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Horas dormidas · últimos 30 días</CardTitle>
          <Badge variant="outline">Mejor: {kpi.best.toFixed(1)} h</Badge>
        </CardHeader>
        <CardContent>
          <DailySeriesChart
            data={byDay}
            unit="h"
            color="hsl(240 60% 55%)"
            goal={+(kpi.goalH.toFixed(1))}
            emptyLabel={isLoading ? "Cargando…" : "Aún no hay registros de sueño."}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar manualmente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4 items-end">
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                max={isoToday()}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="h">Horas</Label>
              <Input
                id="h"
                type="number"
                min={0}
                max={16}
                value={form.horas}
                onChange={(e) => setForm({ ...form, horas: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="m">Minutos</Label>
              <Input
                id="m"
                type="number"
                min={0}
                max={59}
                value={form.minutos}
                onChange={(e) => setForm({ ...form, minutos: Number(e.target.value) })}
              />
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}