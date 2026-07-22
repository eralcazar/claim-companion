import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, TrendingUp, Flame, Timer, Trophy, ChevronRight, Trash2, Upload, Sparkles } from "lucide-react";
import { RegisterWorkoutDialog } from "@/components/ejercicios/RegisterWorkoutDialog";
import { TrainingHeatmap } from "@/components/ejercicios/TrainingHeatmap";
import { TrainingCalendar } from "@/components/ejercicios/TrainingCalendar";
import { SessionPdfExport } from "@/components/ejercicios/SessionPdfExport";
import { useSessionLogs, useAllSetLogs, useExerciseCatalog, useDeleteSession, estimate1RM } from "@/hooks/useExercises";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Env = "all" | "gym" | "calle" | "casa";

export default function Ejercicios() {
  const [env, setEnv] = useState<Env>("all");
  const [tab, setTab] = useState<"dashboard" | "calendario">("dashboard");
  const { data: sessions = [] } = useSessionLogs(365);
  const { data: sets = [] } = useAllSetLogs(365);
  const { data: catalog = [] } = useExerciseCatalog();
  const del = useDeleteSession();

  const filteredSessions = useMemo(
    () => (env === "all" ? sessions : sessions.filter((s) => s.environment === env)),
    [sessions, env],
  );

  const kpis = useMemo(() => {
    const now = new Date();
    const monthAgo = new Date(); monthAgo.setDate(now.getDate() - 30);
    const last30 = filteredSessions.filter((s) => new Date(s.fecha) >= monthAgo);
    const sessionIds = new Set(last30.map((s) => s.id));
    const setsMonth = sets.filter((x) => sessionIds.has(x.session_log_id));
    const volume = setsMonth.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
    const time = last30.reduce((a, s) => a + (s.duration_min ?? 0), 0);

    // streak
    const daySet = new Set(filteredSessions.map((s) => s.fecha));
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(now.getDate() - i);
      if (daySet.has(d.toISOString().slice(0, 10))) streak++;
      else if (i > 0) break;
    }
    return { count: last30.length, volume: Math.round(volume), time, streak };
  }, [filteredSessions, sets]);

  // Aggregate per exercise for cards
  const byExercise = useMemo(() => {
    const map = new Map<string, { count: number; best: number; lastDate?: string; sparks: number[] }>();
    const sessionEnv = new Map(sessions.map((s) => [s.id, s.environment]));
    for (const s of sets) {
      if (env !== "all" && sessionEnv.get(s.session_log_id) !== env) continue;
      const rec = map.get(s.exercise_id) ?? { count: 0, best: 0, sparks: [] as number[] };
      rec.count++;
      const metric = s.weight_kg ? estimate1RM(s.weight_kg, s.reps ?? 1) : (s.distance_m ?? s.reps ?? s.duration_sec ?? 0);
      if (metric > rec.best) rec.best = metric;
      rec.sparks.push(metric);
      const sess = sessions.find((x) => x.id === s.session_log_id);
      if (sess && (!rec.lastDate || sess.fecha > rec.lastDate)) rec.lastDate = sess.fecha;
      map.set(s.exercise_id, rec);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v, exercise: catalog.find((c) => c.id === id) }))
      .filter((x) => !!x.exercise)
      .sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? ""));
  }, [sets, sessions, catalog, env]);

  const heatmapDates = filteredSessions.map((s) => s.fecha);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Dumbbell className="h-6 w-6 text-primary" /> Ejercicios</h1>
          <p className="text-sm text-muted-foreground">Registrá tu actividad y mirá tu progreso por ejercicio.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1"><Link to="/ejercicios/plan"><Sparkles className="h-4 w-4" /> Plan IA</Link></Button>
          <Button asChild variant="outline" size="sm" className="gap-1"><Link to="/ejercicios/importar"><Upload className="h-4 w-4" /> Importar</Link></Button>
          <RegisterWorkoutDialog />
        </div>
      </div>

      <Tabs value={env} onValueChange={(v) => setEnv(v as Env)}>
        <TabsList>
          <TabsTrigger value="all">Todo</TabsTrigger>
          <TabsTrigger value="gym">Gimnasio</TabsTrigger>
          <TabsTrigger value="calle">Calle</TabsTrigger>
          <TabsTrigger value="casa">Casa</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="dashboard">Panel</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 pt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Dumbbell className="h-4 w-4" />} label="Sesiones (30d)" value={kpis.count} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Volumen (kg·rep)" value={kpis.volume.toLocaleString()} />
        <KpiCard icon={<Timer className="h-4 w-4" />} label="Minutos" value={kpis.time} />
        <KpiCard icon={<Flame className="h-4 w-4" />} label="Racha" value={`${kpis.streak} días`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Actividad — últimas 26 semanas</CardTitle></CardHeader>
        <CardContent><TrainingHeatmap dates={heatmapDates} /></CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Mis ejercicios</h2>
        {byExercise.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Aún no tenés ejercicios registrados. Tocá "Registrar entrenamiento" para empezar.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {byExercise.map((row) => (
              <Link key={row.id} to={`/ejercicios/${row.id}`}>
                <Card className="hover:border-primary transition cursor-pointer h-full">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{row.exercise!.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {row.exercise!.category} · {row.exercise!.environment}
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1"><Trophy className="h-3 w-3" /> {row.best}</Badge>
                    </div>
                    <Sparkline values={row.sparks} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{row.count} sets</span>
                      {row.lastDate && <span>{format(parseISO(row.lastDate), "d MMM", { locale: es })}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Historial reciente</h2>
        <div className="space-y-2">
          {filteredSessions.slice(0, 10).map((s) => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{format(parseISO(s.fecha), "EEEE d MMM", { locale: es })}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {s.environment}{s.location_label ? ` · ${s.location_label}` : ""}
                    {s.duration_min ? ` · ${s.duration_min} min` : ""}
                    {s.rpe ? ` · RPE ${s.rpe}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary">{sets.filter((x) => x.session_log_id === s.id).length} sets</Badge>
                  <SessionPdfExport
                    session={s}
                    sets={sets.filter((x) => x.session_log_id === s.id)}
                    catalog={catalog}
                    previousSets={sets.filter((x) => {
                      const parent = sessions.find((z) => z.id === x.session_log_id);
                      return parent ? parent.fecha < s.fecha : false;
                    })}
                  />
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSessions.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">Sin sesiones aún.</div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="calendario" className="pt-4">
          <TrainingCalendar sessions={filteredSessions} sets={sets} catalog={catalog} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-8" />;
  const max = Math.max(...values), min = Math.min(...values);
  const range = Math.max(1, max - min);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-full">
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
