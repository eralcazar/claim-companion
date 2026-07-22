import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trash2, Plus, Dumbbell, Target, Loader2 } from "lucide-react";
import { TodayDashboard } from "@/components/actividad/TodayDashboard";
import { BitacoraTab } from "@/components/actividad/BitacoraTab";
import { DispositivosTab } from "@/components/actividad/DispositivosTab";
import {
  useActivityGoals,
  useUpsertActivityGoals,
  useWorkoutPlans,
  useCreateWorkoutPlan,
  useDeleteWorkoutPlan,
  useActivitySuggestions,
  useGenerateAiCoach,
  useApplySuggestion,
  useWorkoutLogs,
  useLogWorkout,
} from "@/hooks/useActivity";
import { useKariBalance } from "@/hooks/useKariTokens";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Actividad() {
  const { data: goals } = useActivityGoals();
  const upsertGoals = useUpsertActivityGoals();
  const { data: plans } = useWorkoutPlans();
  const createPlan = useCreateWorkoutPlan();
  const deletePlan = useDeleteWorkoutPlan();
  const { data: suggestions } = useActivitySuggestions();
  const generate = useGenerateAiCoach();
  const apply = useApplySuggestion();
  const { data: logs } = useWorkoutLogs(30);
  const logWorkout = useLogWorkout();
  const { data: kari } = useKariBalance();

  const [newPlan, setNewPlan] = useState({
    name: "",
    objective: "mantenimiento",
    level: "principiante",
    days_per_week: 3,
  });
  const [goalDraft, setGoalDraft] = useState<null | {
    steps_goal: number;
    active_minutes_goal: number;
    sleep_minutes_goal: number;
    calories_goal: number;
  }>(null);

  const g = goalDraft ?? {
    steps_goal: goals?.steps_goal ?? 8000,
    active_minutes_goal: goals?.active_minutes_goal ?? 30,
    sleep_minutes_goal: goals?.sleep_minutes_goal ?? 420,
    calories_goal: goals?.calories_goal ?? 2000,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" /> Actividad
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitorea tus pasos, entrena con planes personalizados y recibe sugerencias de IA.
          </p>
        </div>
        <Badge variant="secondary">Tokens Kari: {kari?.balance ?? 0}</Badge>
      </header>

      <Tabs defaultValue="hoy">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="coach">Coach IA</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
          <TabsTrigger value="dispositivos">Dispositivos</TabsTrigger>
        </TabsList>

        <TabsContent value="hoy" className="pt-4">
          <TodayDashboard />
        </TabsContent>

        <TabsContent value="planes" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Crear nuevo plan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <Label>Nombre</Label>
                <Input
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="Ej. Rutina cardio 4 sem"
                />
              </div>
              <div>
                <Label>Objetivo</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newPlan.objective}
                  onChange={(e) => setNewPlan({ ...newPlan, objective: e.target.value })}
                >
                  <option value="perder_peso">Perder peso</option>
                  <option value="tonificar">Tonificar</option>
                  <option value="rehabilitacion">Rehabilitación</option>
                  <option value="cardio">Cardio</option>
                  <option value="fuerza">Fuerza</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="flexibilidad">Flexibilidad</option>
                </select>
              </div>
              <div>
                <Label>Nivel</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newPlan.level}
                  onChange={(e) => setNewPlan({ ...newPlan, level: e.target.value })}
                >
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              <div>
                <Label>Días/sem</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={newPlan.days_per_week}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, days_per_week: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-5">
                <Button
                  onClick={() => {
                    if (!newPlan.name.trim()) return;
                    createPlan.mutate(newPlan, {
                      onSuccess: () =>
                        setNewPlan({
                          name: "",
                          objective: "mantenimiento",
                          level: "principiante",
                          days_per_week: 3,
                        }),
                    });
                  }}
                  disabled={createPlan.isPending || !newPlan.name.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" /> Crear plan
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(plans ?? []).map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary">{p.objective}</Badge>
                      <Badge variant="outline">{p.level}</Badge>
                      <Badge variant="outline">{p.days_per_week} días/sem</Badge>
                      {p.ai_generated && (
                        <Badge className="bg-accent text-accent-foreground">
                          <Sparkles className="h-3 w-3 mr-1" /> IA
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deletePlan.mutate(p.id)}
                    aria-label="Eliminar plan"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      logWorkout.mutate({ plan_id: p.id, completed: true, duration_min: 30 })
                    }
                  >
                    Registrar sesión hoy
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!plans || plans.length === 0) && (
              <p className="text-sm text-muted-foreground md:col-span-2">
                Aún no tienes planes. Crea uno arriba o genera uno con el Coach IA.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="coach" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Coach de actividad con IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kari analiza tus últimos 14 días (pasos, frecuencia cardiaca, SpO₂, presión y
                condiciones activas) y sugiere recomendaciones y un plan de entrenamiento
                personalizado. Consume tokens Kari.
              </p>
              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending || (kari?.balance ?? 0) <= 0}
              >
                {generate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Generar sugerencia
              </Button>
              {(kari?.balance ?? 0) <= 0 && (
                <p className="text-xs text-destructive">
                  Sin tokens Kari. Compra un paquete para continuar.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {(suggestions ?? []).map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {format(new Date(s.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.summary && <p className="text-sm">{s.summary}</p>}
                  {Array.isArray(s.red_flags) && s.red_flags.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
                      <p className="text-xs font-semibold text-destructive mb-1">Banderas rojas</p>
                      <ul className="text-xs space-y-0.5">
                        {s.red_flags.map((r: any, i: number) => (
                          <li key={i}>• {typeof r === "string" ? r : r.message ?? JSON.stringify(r)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(s.recommendations) && s.recommendations.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {s.recommendations.map((r: any, i: number) => (
                        <li key={i} className="rounded-md border p-2 space-y-1">
                          <div className="flex gap-2">
                            <span className="text-primary">›</span>
                            <span className="font-medium">
                              {typeof r === "string" ? r : r.text ?? r.recommendation ?? JSON.stringify(r)}
                            </span>
                            {r?.priority && (
                              <Badge
                                variant={r.priority === "high" ? "destructive" : r.priority === "medium" ? "default" : "outline"}
                                className="ml-auto text-[10px]"
                              >
                                {r.priority}
                              </Badge>
                            )}
                          </div>
                          {r?.reason && <p className="text-xs text-muted-foreground pl-4">{r.reason}</p>}
                          {r?.expected_impact && (
                            <p className="text-xs text-primary pl-4">
                              Impacto esperado: {r.expected_impact.delta_estimate}
                              {r.expected_impact.metric ? ` (${r.expected_impact.metric})` : ""}
                              {r.expected_impact.horizon_weeks ? ` · ${r.expected_impact.horizon_weeks} sem` : ""}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(s as any).thresholds && typeof (s as any).thresholds === "object" && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                      <p className="font-semibold mb-1">Umbrales sugeridos para alertas automáticas</p>
                      <ul className="space-y-0.5">
                        {Object.entries((s as any).thresholds as Record<string, unknown>).map(([k, v]) => (
                          <li key={k}>• {k}: {String(v)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {s.suggested_plan && !s.applied_plan_id && (
                    <Button size="sm" variant="outline" onClick={() => apply.mutate(s)} disabled={apply.isPending}>
                      <Plus className="h-4 w-4 mr-1" /> Aplicar plan sugerido
                    </Button>
                  )}
                  {s.applied_plan_id && <Badge variant="secondary">Plan aplicado</Badge>}
                </CardContent>
              </Card>
            ))}
            {(!suggestions || suggestions.length === 0) && (
              <p className="text-sm text-muted-foreground">
                Aún no has generado sugerencias.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metas" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Mis metas diarias
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Pasos</Label>
                <Input
                  type="number"
                  value={g.steps_goal}
                  onChange={(e) => setGoalDraft({ ...g, steps_goal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Minutos activos</Label>
                <Input
                  type="number"
                  value={g.active_minutes_goal}
                  onChange={(e) => setGoalDraft({ ...g, active_minutes_goal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Sueño (min)</Label>
                <Input
                  type="number"
                  value={g.sleep_minutes_goal}
                  onChange={(e) => setGoalDraft({ ...g, sleep_minutes_goal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Calorías</Label>
                <Input
                  type="number"
                  value={g.calories_goal}
                  onChange={(e) => setGoalDraft({ ...g, calories_goal: Number(e.target.value) })}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={() =>
                    upsertGoals.mutate(g, { onSuccess: () => setGoalDraft(null) })
                  }
                  disabled={upsertGoals.isPending}
                >
                  Guardar metas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimos entrenamientos</CardTitle>
            </CardHeader>
            <CardContent>
              {(logs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no has registrado entrenamientos.</p>
              ) : (
                <ul className="space-y-2">
                  {(logs ?? []).map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between border-b py-2 text-sm"
                    >
                      <span>{format(new Date(l.fecha), "dd MMM yyyy", { locale: es })}</span>
                      <span className="text-muted-foreground">
                        {l.duration_min ? `${l.duration_min} min` : "—"}{" "}
                        {l.rpe ? `· RPE ${l.rpe}` : ""}
                      </span>
                      <Badge variant={l.completed ? "default" : "outline"}>
                        {l.completed ? "Completado" : "Pendiente"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bitacora" className="pt-4">
          <BitacoraTab />
        </TabsContent>

        <TabsContent value="dispositivos" className="pt-4">
          <DispositivosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}