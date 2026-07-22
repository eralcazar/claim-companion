import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Search, Dumbbell, MapPin } from "lucide-react";
import { useExerciseCatalog, useCreateWorkout, type ExerciseCatalog, type NewWorkoutPayload } from "@/hooks/useExercises";

type Draft = {
  exercise: ExerciseCatalog;
  sets: Array<{ reps?: number; weight_kg?: number; distance_m?: number; duration_sec?: number; rest_sec?: number }>;
};

export function RegisterWorkoutDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [environment, setEnvironment] = useState<"gym" | "calle" | "casa">("gym");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationLabel, setLocationLabel] = useState("");
  const [durationMin, setDurationMin] = useState<string>("");
  const [rpe, setRpe] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [warmup, setWarmup] = useState("");
  const [discomforts, setDiscomforts] = useState("");
  const [sessionRest, setSessionRest] = useState<string>("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const { data: catalog = [] } = useExerciseCatalog();
  const create = useCreateWorkout();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      const envOk = c.environment === "ambos" || c.environment === environment;
      const qOk = !q || c.name.toLowerCase().includes(q) || (c.muscle_group ?? "").toLowerCase().includes(q);
      return envOk && qOk;
    });
  }, [catalog, environment, search]);

  function addExercise(ex: ExerciseCatalog) {
    if (drafts.find((d) => d.exercise.id === ex.id)) return;
    setDrafts((d) => [...d, { exercise: ex, sets: [{}] }]);
  }
  function removeExercise(id: string) {
    setDrafts((d) => d.filter((x) => x.exercise.id !== id));
  }
  function addSet(exId: string) {
    setDrafts((d) => d.map((x) => (x.exercise.id === exId ? { ...x, sets: [...x.sets, {}] } : x)));
  }
  function updateSet(exId: string, i: number, patch: Partial<Draft["sets"][number]>) {
    setDrafts((d) => d.map((x) => (x.exercise.id === exId ? { ...x, sets: x.sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) } : x)));
  }
  function removeSet(exId: string, i: number) {
    setDrafts((d) => d.map((x) => (x.exercise.id === exId ? { ...x, sets: x.sets.filter((_, idx) => idx !== i) } : x)));
  }

  function reset() {
    setStep(1); setEnvironment("gym"); setFecha(new Date().toISOString().slice(0, 10));
    setLocationLabel(""); setDurationMin(""); setRpe(""); setNotes("");
    setWarmup(""); setDiscomforts(""); setSessionRest("");
    setSearch(""); setDrafts([]);
  }

  async function submit() {
    const payload: NewWorkoutPayload = {
      fecha, environment,
      location_label: locationLabel || undefined,
      duration_min: durationMin ? Number(durationMin) : undefined,
      rpe: rpe ? Number(rpe) : undefined,
      notes: notes || undefined,
      warmup_notes: warmup || undefined,
      discomforts: discomforts || undefined,
      session_rest_sec: sessionRest ? Number(sessionRest) : undefined,
      items: drafts.map((d) => ({
        exercise_id: d.exercise.id,
        sets: d.sets.map((s, i) => ({ set_number: i + 1, ...s })),
      })),
    };
    await create.mutateAsync(payload);
    setOpen(false); reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="lg" className="gap-2"><Plus className="h-4 w-4" /> Registrar entrenamiento</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5" /> Nuevo entrenamiento — Paso {step} de 4</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Entorno</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["gym", "calle", "casa"] as const).map((e) => (
                  <Button key={e} variant={environment === e ? "default" : "outline"} onClick={() => setEnvironment(e)} className="capitalize">
                    {e}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <Label>Ubicación (opcional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Parque, gym X..." value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar ejercicio..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {filtered.map((ex) => {
                const added = !!drafts.find((d) => d.exercise.id === ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    disabled={added}
                    className={`text-left rounded-md border p-2 text-sm transition ${added ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
                  >
                    <div className="font-medium">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">{ex.muscle_group} · {ex.equipment}</div>
                  </button>
                );
              })}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Seleccionados ({drafts.length})</div>
              <div className="flex flex-wrap gap-1">
                {drafts.map((d) => (
                  <Badge key={d.exercise.id} variant="secondary" className="gap-1">
                    {d.exercise.name}
                    <button onClick={() => removeExercise(d.exercise.id)}><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {drafts.map((d) => (
              <Card key={d.exercise.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{d.exercise.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{d.exercise.metric_type.replace("_", "+")}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeExercise(d.exercise.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {d.sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-6 text-muted-foreground">#{i + 1}</span>
                      {(d.exercise.metric_type === "reps_weight" || d.exercise.metric_type === "reps_only") && (
                        <Input type="number" placeholder="Reps" value={s.reps ?? ""} onChange={(e) => updateSet(d.exercise.id, i, { reps: Number(e.target.value) || undefined })} />
                      )}
                      {d.exercise.metric_type === "reps_weight" && (
                        <Input type="number" step="0.5" placeholder="kg" value={s.weight_kg ?? ""} onChange={(e) => updateSet(d.exercise.id, i, { weight_kg: Number(e.target.value) || undefined })} />
                      )}
                      {d.exercise.metric_type === "distance_time" && (
                        <>
                          <Input type="number" placeholder="metros" value={s.distance_m ?? ""} onChange={(e) => updateSet(d.exercise.id, i, { distance_m: Number(e.target.value) || undefined })} />
                          <Input type="number" placeholder="seg" value={s.duration_sec ?? ""} onChange={(e) => updateSet(d.exercise.id, i, { duration_sec: Number(e.target.value) || undefined })} />
                        </>
                      )}
                      {d.exercise.metric_type === "time_only" && (
                        <Input type="number" placeholder="seg" value={s.duration_sec ?? ""} onChange={(e) => updateSet(d.exercise.id, i, { duration_sec: Number(e.target.value) || undefined })} />
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeSet(d.exercise.id, i)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => addSet(d.exercise.id)} className="gap-1"><Plus className="h-3 w-3" /> Set</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              Estos datos ayudan al Coach IA a decidir si subir carga, mantener o priorizar recuperación.
            </div>
            <div>
              <Label>Calentamiento realizado</Label>
              <Textarea rows={2} value={warmup} onChange={(e) => setWarmup(e.target.value)} placeholder="Ej: 5' bicicleta + movilidad de hombro" />
            </div>
            <div>
              <Label>Molestias o dolor (opcional)</Label>
              <Textarea rows={2} value={discomforts} onChange={(e) => setDiscomforts(e.target.value)} placeholder="Ej: molestia leve en rodilla derecha al bajar" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Duración (min)</Label>
                <Input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
              </div>
              <div>
                <Label>RPE global (1-10)</Label>
                <Input type="number" min="1" max="10" value={rpe} onChange={(e) => setRpe(e.target.value)} />
              </div>
              <div>
                <Label>Descanso prom. (seg)</Label>
                <Input type="number" value={sessionRest} onChange={(e) => setSessionRest(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notas generales</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)}>Atrás</Button>}
          {step < 4 && <Button onClick={() => setStep((s) => (s + 1) as any)} disabled={step === 2 && drafts.length === 0}>Siguiente</Button>}
          {step === 4 && <Button onClick={submit} disabled={create.isPending || drafts.length === 0}>{create.isPending ? "Guardando..." : "Guardar entrenamiento"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
