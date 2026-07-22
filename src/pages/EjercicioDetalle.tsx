import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, Calendar as CalendarIcon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ExerciseCoachCard } from "@/components/ejercicios/ExerciseCoachCard";
import { useExerciseCatalog, useSetsByExercise, estimate1RM } from "@/hooks/useExercises";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Metric = "max_weight" | "volume" | "reps" | "one_rm" | "distance" | "duration";

export default function EjercicioDetalle() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { data: catalog = [] } = useExerciseCatalog();
  const { data: sets = [] } = useSetsByExercise(exerciseId);
  const exercise = catalog.find((c) => c.id === exerciseId);

  const availableMetrics: Metric[] = useMemo(() => {
    if (!exercise) return ["reps"];
    switch (exercise.metric_type) {
      case "reps_weight": return ["max_weight", "one_rm", "volume", "reps"];
      case "distance_time": return ["distance", "duration"];
      case "time_only": return ["duration"];
      case "reps_only": return ["reps"];
    }
  }, [exercise]);
  const [metric, setMetric] = useState<Metric>("max_weight");
  const [range, setRange] = useState(90);

  // group by day
  const chartData = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - range);
    const map = new Map<string, { fecha: string; max_weight: number; volume: number; reps: number; one_rm: number; distance: number; duration: number }>();
    for (const s of sets) {
      const fecha = (s as any).session?.fecha ?? s.created_at.slice(0, 10);
      if (new Date(fecha) < since) continue;
      const row = map.get(fecha) ?? { fecha, max_weight: 0, volume: 0, reps: 0, one_rm: 0, distance: 0, duration: 0 };
      const w = s.weight_kg ?? 0, r = s.reps ?? 0;
      row.max_weight = Math.max(row.max_weight, w);
      row.volume += w * r;
      row.reps += r;
      row.one_rm = Math.max(row.one_rm, estimate1RM(w, r));
      row.distance = Math.max(row.distance, (s.distance_m ?? 0) / 1000);
      row.duration = Math.max(row.duration, (s.duration_sec ?? 0) / 60);
      map.set(fecha, row);
    }
    return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [sets, range]);

  const best = useMemo(() => {
    let bestVal = 0, bestLabel = "-";
    for (const s of sets) {
      const est = estimate1RM(s.weight_kg ?? 0, s.reps ?? 0);
      if (est > bestVal) { bestVal = est; bestLabel = `${s.weight_kg}kg × ${s.reps}`; }
    }
    return { bestVal, bestLabel };
  }, [sets]);

  // sessions history table
  const sessions = useMemo(() => {
    const g = new Map<string, { fecha: string; sets: typeof sets; sessionId: string }>();
    for (const s of sets) {
      const key = s.session_log_id;
      const fecha = (s as any).session?.fecha ?? s.created_at.slice(0, 10);
      const rec = g.get(key) ?? { fecha, sets: [] as any, sessionId: key };
      (rec.sets as any).push(s);
      g.set(key, rec);
    }
    return Array.from(g.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [sets]);

  const metricLabel: Record<Metric, string> = {
    max_weight: "Peso máx (kg)",
    one_rm: "1RM estimado (kg)",
    volume: "Volumen (kg·rep)",
    reps: "Reps totales",
    distance: "Distancia (km)",
    duration: "Duración (min)",
  };

  const recentForCoach = sets.slice(-10).map((s) => ({
    fecha: (s as any).session?.fecha,
    reps: s.reps, weight_kg: s.weight_kg, distance_m: s.distance_m, duration_sec: s.duration_sec,
  }));

  if (!exercise) {
    return <div className="p-6"><Button asChild variant="ghost"><Link to="/ejercicios"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link></Button><p className="mt-4">Ejercicio no encontrado.</p></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/ejercicios"><ArrowLeft className="h-4 w-4 mr-1" /> Ejercicios</Link></Button>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent/5">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{exercise.name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">{exercise.category}</Badge>
              {exercise.muscle_group && <Badge variant="outline">{exercise.muscle_group}</Badge>}
              {exercise.equipment && <Badge variant="outline">{exercise.equipment}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Trophy className="h-3 w-3" /> Mejor marca (1RM est.)</div>
            <div className="text-3xl font-bold text-primary">{best.bestVal || "-"}</div>
            <div className="text-xs text-muted-foreground">{best.bestLabel}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Progreso</CardTitle>
          <div className="flex gap-2">
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableMetrics.map((m) => <SelectItem key={m} value={m}>{metricLabel[m]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
                <SelectItem value="365">1 año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Sin datos en el rango elegido.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="fecha" tickFormatter={(v) => format(parseISO(v), "d MMM", { locale: es })} />
                <YAxis />
                <Tooltip labelFormatter={(v) => format(parseISO(v as string), "PPP", { locale: es })} />
                <Line type="monotone" dataKey={metric} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <h2 className="text-lg font-semibold">Historial por sesión</h2>
          {sessions.length === 0 && <div className="text-sm text-muted-foreground">Sin sesiones registradas.</div>}
          {sessions.map((s) => {
            const bestSet = (s.sets as any[]).reduce((b, x) => estimate1RM(x.weight_kg ?? 0, x.reps ?? 0) > estimate1RM(b?.weight_kg ?? 0, b?.reps ?? 0) ? x : b, s.sets[0]);
            const vol = (s.sets as any[]).reduce((a, x) => a + (x.weight_kg ?? 0) * (x.reps ?? 0), 0);
            return (
              <Card key={s.sessionId}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {format(parseISO(s.fecha), "PPP", { locale: es })}</div>
                      <div className="text-xs text-muted-foreground">
                        {(s.sets as any[]).length} sets · mejor: {bestSet?.weight_kg ?? "-"}kg × {bestSet?.reps ?? "-"} · volumen {vol}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(s.sets as any[]).map((x, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {x.weight_kg ? `${x.weight_kg}kg×${x.reps ?? "-"}` : x.distance_m ? `${x.distance_m}m` : x.duration_sec ? `${x.duration_sec}s` : `${x.reps ?? 0} reps`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div>
          <ExerciseCoachCard exerciseName={exercise.name} category={exercise.category} recentSets={recentForCoach} />
        </div>
      </div>
    </div>
  );
}
