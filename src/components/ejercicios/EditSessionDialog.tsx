import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useExerciseCatalog, useUpdateWorkout, type SessionLog, type SetLog } from "@/hooks/useExercises";

type SetRow = { reps?: number; weight_kg?: number; distance_m?: number; duration_sec?: number; rest_sec?: number; rpe?: number };

export function EditSessionDialog({
  open, onOpenChange, session, sets,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  session: SessionLog | null;
  sets: SetLog[];
}) {
  const { data: catalog = [] } = useExerciseCatalog();
  const update = useUpdateWorkout();

  const [fecha, setFecha] = useState("");
  const [environment, setEnvironment] = useState<"gym" | "calle" | "casa">("gym");
  const [durationMin, setDurationMin] = useState("");
  const [rpe, setRpe] = useState("");
  const [sessionRest, setSessionRest] = useState("");
  const [warmup, setWarmup] = useState("");
  const [discomforts, setDiscomforts] = useState("");
  const [notes, setNotes] = useState("");
  const [groups, setGroups] = useState<Record<string, SetRow[]>>({});

  useEffect(() => {
    if (!session) return;
    setFecha(session.fecha);
    setEnvironment(session.environment);
    setDurationMin(session.duration_min?.toString() ?? "");
    setRpe(session.rpe?.toString() ?? "");
    setSessionRest(session.session_rest_sec?.toString() ?? "");
    setWarmup(session.warmup_notes ?? "");
    setDiscomforts(session.discomforts ?? "");
    setNotes(session.notes ?? "");
    const g: Record<string, SetRow[]> = {};
    for (const s of sets.filter((x) => x.session_log_id === session.id).sort((a, b) => a.set_number - b.set_number)) {
      (g[s.exercise_id] ??= []).push({
        reps: s.reps ?? undefined, weight_kg: s.weight_kg ?? undefined,
        distance_m: s.distance_m ?? undefined, duration_sec: s.duration_sec ?? undefined,
        rest_sec: s.rest_sec ?? undefined, rpe: s.rpe ?? undefined,
      });
    }
    setGroups(g);
  }, [session, sets]);

  const catById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  function updateSet(exId: string, i: number, patch: Partial<SetRow>) {
    setGroups((g) => ({ ...g, [exId]: g[exId].map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }
  function addSet(exId: string) {
    setGroups((g) => ({ ...g, [exId]: [...(g[exId] ?? []), {}] }));
  }
  function removeSet(exId: string, i: number) {
    setGroups((g) => ({ ...g, [exId]: g[exId].filter((_, idx) => idx !== i) }));
  }

  async function save() {
    if (!session) return;
    await update.mutateAsync({
      session_id: session.id,
      fecha, environment,
      duration_min: durationMin ? Number(durationMin) : undefined,
      rpe: rpe ? Number(rpe) : undefined,
      notes: notes || undefined,
      warmup_notes: warmup || undefined,
      discomforts: discomforts || undefined,
      session_rest_sec: sessionRest ? Number(sessionRest) : undefined,
      items: Object.entries(groups).map(([exercise_id, srs]) => ({
        exercise_id,
        sets: srs.map((s, i) => ({ set_number: i + 1, ...s })),
      })),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar sesión</DialogTitle></DialogHeader>
        {session && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
              <div>
                <Label>Entorno</Label>
                <div className="flex gap-1 mt-1">
                  {(["gym", "calle", "casa"] as const).map((e) => (
                    <Button key={e} size="sm" variant={environment === e ? "default" : "outline"} onClick={() => setEnvironment(e)} className="capitalize flex-1">{e}</Button>
                  ))}
                </div>
              </div>
            </div>

            {Object.entries(groups).map(([exId, srs]) => {
              const ex = catById.get(exId);
              return (
                <Card key={exId}>
                  <CardContent className="p-3 space-y-2">
                    <div className="font-semibold">{ex?.name ?? exId}</div>
                    {srs.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs w-6 text-muted-foreground">#{i + 1}</span>
                        <Input type="number" placeholder="Reps" value={s.reps ?? ""} onChange={(e) => updateSet(exId, i, { reps: Number(e.target.value) || undefined })} />
                        <Input type="number" step="0.5" placeholder="kg" value={s.weight_kg ?? ""} onChange={(e) => updateSet(exId, i, { weight_kg: Number(e.target.value) || undefined })} />
                        <Input type="number" placeholder="m" value={s.distance_m ?? ""} onChange={(e) => updateSet(exId, i, { distance_m: Number(e.target.value) || undefined })} />
                        <Input type="number" placeholder="seg" value={s.duration_sec ?? ""} onChange={(e) => updateSet(exId, i, { duration_sec: Number(e.target.value) || undefined })} />
                        <Input type="number" placeholder="RPE" min={1} max={10} value={s.rpe ?? ""} onChange={(e) => updateSet(exId, i, { rpe: Number(e.target.value) || undefined })} />
                        <Button size="icon" variant="ghost" onClick={() => removeSet(exId, i)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addSet(exId)} className="gap-1"><Plus className="h-3 w-3" /> Set</Button>
                  </CardContent>
                </Card>
              );
            })}

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Duración (min)</Label><Input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} /></div>
              <div><Label>RPE global</Label><Input type="number" min={1} max={10} value={rpe} onChange={(e) => setRpe(e.target.value)} /></div>
              <div><Label>Descanso prom. (seg)</Label><Input type="number" value={sessionRest} onChange={(e) => setSessionRest(e.target.value)} /></div>
            </div>
            <div><Label>Calentamiento</Label><Textarea rows={2} value={warmup} onChange={(e) => setWarmup(e.target.value)} /></div>
            <div><Label>Molestias</Label><Textarea rows={2} value={discomforts} onChange={(e) => setDiscomforts(e.target.value)} /></div>
            <div><Label>Notas</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={update.isPending}>{update.isPending ? "Guardando..." : "Guardar y recalcular IA"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}