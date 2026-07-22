import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Footprints, Bluetooth, Save, Flame, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useActivityGoals } from "@/hooks/useActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DailySeriesChart } from "@/components/health/DailySeriesChart";

type Row = {
  fecha: string;
  steps: number | null;
  active_minutes: number | null;
  calories: number | null;
  source: string | null;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function StepsMonitor() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  const qc = useQueryClient();
  const { data: goals } = useActivityGoals();
  const stepsGoal = goals?.steps_goal ?? 8000;

  const [form, setForm] = useState<{
    fecha: string;
    steps: number;
    active_minutes: number | "";
    calories: number | "";
  }>({ fecha: isoToday(), steps: 0, active_minutes: "", calories: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["steps-monitor", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<Row[]> => {
      const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("activity_readings")
        .select("fecha, steps, active_minutes, calories, source")
        .eq("patient_id", patientId!)
        .gte("fecha", from)
        .order("fecha", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const byDay = useMemo(() => {
    const map = new Map<string, { steps: number; act: number; cal: number }>();
    for (const r of rows) {
      const prev = map.get(r.fecha) ?? { steps: 0, act: 0, cal: 0 };
      // varias fuentes por día: tomamos el máximo (dispositivo suele ganar)
      map.set(r.fecha, {
        steps: Math.max(prev.steps, r.steps ?? 0),
        act: Math.max(prev.act, r.active_minutes ?? 0),
        cal: Math.max(prev.cal, r.calories ?? 0),
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([fecha, v]) => ({ fecha, ...v }));
  }, [rows]);

  const stepsSeries = byDay.map((d) => ({ fecha: d.fecha, value: d.steps }));
  const activeSeries = byDay.map((d) => ({ fecha: d.fecha, value: d.act }));
  const caloriesSeries = byDay.map((d) => ({ fecha: d.fecha, value: d.cal }));

  const today = byDay.find((d) => d.fecha === isoToday());
  const todaySteps = today?.steps ?? 0;
  const pct = Math.min(100, Math.round((todaySteps / stepsGoal) * 100));

  const kpi = useMemo(() => {
    const last7 = byDay.slice(-7);
    const last30 = byDay.slice(-30);
    const total7 = last7.reduce((s, x) => s + x.steps, 0);
    const avg30 = last30.length ? last30.reduce((s, x) => s + x.steps, 0) / last30.length : 0;
    const best = last30.reduce((m, x) => (x.steps > m ? x.steps : m), 0);
    // racha: días consecutivos (desde hoy hacia atrás) que cumplen meta
    let streak = 0;
    for (let i = byDay.length - 1; i >= 0; i--) {
      if (byDay[i].steps >= stepsGoal) streak++;
      else break;
    }
    return { total7, avg30, best, streak };
  }, [byDay, stepsGoal]);

  const save = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error("Sin sesión");
      const payload: Record<string, unknown> = {
        patient_id: patientId,
        fecha: form.fecha,
        source: "manual",
        steps: Math.max(0, Math.round(form.steps)),
      };
      if (form.active_minutes !== "") payload.active_minutes = Math.max(0, Math.round(Number(form.active_minutes)));
      if (form.calories !== "") payload.calories = Math.max(0, Math.round(Number(form.calories)));
      const { error } = await supabase
        .from("activity_readings")
        .upsert(payload, { onConflict: "patient_id,fecha,source" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro guardado");
      qc.invalidateQueries({ queryKey: ["steps-monitor"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Footprints className="h-6 w-6 text-primary" />
            Monitor de Pasos y Actividad
          </h1>
          <p className="text-sm text-muted-foreground">
            Pasos diarios, minutos activos y calorías. Se sincroniza desde tu smartwatch
            (Xiaomi/Mi Fitness) vía Health Connect o Apple Health.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dispositivos">
            <Bluetooth className="h-4 w-4 mr-1" />
            Dispositivos compatibles
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hoy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-4xl font-bold">{todaySteps.toLocaleString("es-MX")}</div>
            <div className="text-sm text-muted-foreground">
              Meta: {stepsGoal.toLocaleString("es-MX")} · {pct}%
            </div>
          </div>
          <Progress value={pct} aria-label="Progreso de pasos" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {today?.act ?? 0} min activos</span>
            <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {today?.cal ?? 0} kcal</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total 7 días</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpi.total7.toLocaleString("es-MX")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Promedio 30 días</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{Math.round(kpi.avg30).toLocaleString("es-MX")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mejor día</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpi.best.toLocaleString("es-MX")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Racha en meta</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpi.streak} d</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pasos · últimos 30 días</CardTitle>
          <Badge variant="outline">Meta {stepsGoal.toLocaleString("es-MX")}</Badge>
        </CardHeader>
        <CardContent>
          <DailySeriesChart
            data={stepsSeries}
            unit="pasos"
            color="hsl(var(--primary))"
            goal={stepsGoal}
            emptyLabel={isLoading ? "Cargando…" : "Aún no hay registros de pasos."}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Minutos activos</CardTitle></CardHeader>
          <CardContent>
            <DailySeriesChart
              data={activeSeries}
              unit="min"
              color="hsl(150 60% 45%)"
              goal={goals?.active_minutes_goal ?? null}
              height={200}
              emptyLabel="Sin minutos activos."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Calorías</CardTitle></CardHeader>
          <CardContent>
            <DailySeriesChart
              data={caloriesSeries}
              unit="kcal"
              color="hsl(20 80% 55%)"
              goal={goals?.calories_goal ?? null}
              height={200}
              emptyLabel="Sin calorías registradas."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registrar manualmente</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5 items-end">
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
              <Label htmlFor="steps">Pasos</Label>
              <Input
                id="steps"
                type="number"
                min={0}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="act">Min activos</Label>
              <Input
                id="act"
                type="number"
                min={0}
                value={form.active_minutes}
                onChange={(e) =>
                  setForm({ ...form, active_minutes: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="cal">Calorías</Label>
              <Input
                id="cal"
                type="number"
                min={0}
                value={form.calories}
                onChange={(e) =>
                  setForm({ ...form, calories: e.target.value === "" ? "" : Number(e.target.value) })
                }
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