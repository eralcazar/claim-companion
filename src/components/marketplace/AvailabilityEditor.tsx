import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock } from "lucide-react";
import {
  useAvailability,
  useDeleteAvailability,
  useSaveAvailability,
  type AvailabilitySlot,
} from "@/hooks/useAvailability";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MODALIDADES = [
  { v: "presencial", l: "Presencial" },
  { v: "video", l: "Video" },
  { v: "domicilio", l: "Domicilio" },
];

export function AvailabilityEditor({ profile }: { profile: any }) {
  const { data: rows = [] } = useAvailability(profile.id);
  const save = useSaveAvailability();
  const del = useDeleteAvailability();
  const [editing, setEditing] = useState<Partial<AvailabilitySlot> | null>(null);

  const empty: Partial<AvailabilitySlot> = {
    professional_id: profile.id,
    weekday: 1,
    start_time: "09:00",
    end_time: "13:00",
    slot_minutes: 30,
    modalidad: "presencial",
    activo: true,
    location_id: profile.professional_locations?.[0]?.id ?? null,
  };

  const locations = profile.professional_locations ?? [];

  const grouped = new Map<number, AvailabilitySlot[]>();
  for (const r of rows) {
    const arr = grouped.get(r.weekday) ?? [];
    arr.push(r);
    grouped.set(r.weekday, arr);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Disponibilidad semanal</CardTitle>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing({ ...empty })}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo horario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar" : "Nuevo"} horario</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Día de la semana</Label>
                  <Select
                    value={String(editing.weekday ?? 1)}
                    onValueChange={(v) => setEditing({ ...editing, weekday: Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIAS.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Inicio</Label>
                  <Input
                    type="time"
                    value={editing.start_time ?? "09:00"}
                    onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fin</Label>
                  <Input
                    type="time"
                    value={editing.end_time ?? "13:00"}
                    onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duración por cita (min)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={240}
                    value={editing.slot_minutes ?? 30}
                    onChange={(e) => setEditing({ ...editing, slot_minutes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Modalidad</Label>
                  <Select
                    value={editing.modalidad ?? "presencial"}
                    onValueChange={(v) => setEditing({ ...editing, modalidad: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODALIDADES.map((m) => (
                        <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {locations.length > 0 && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Consultorio</Label>
                    <Select
                      value={editing.location_id ?? "__none__"}
                      onValueChange={(v) => setEditing({ ...editing, location_id: v === "__none__" ? null : v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sin ubicación específica —</SelectItem>
                        {locations.map((l: any) => (
                          <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!editing) return;
                  save.mutate(editing as any, { onSuccess: () => setEditing(null) });
                }}
                disabled={save.isPending}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aún no defines horarios. Los pacientes no podrán reservar sin al menos un horario.
          </p>
        )}
        {DIAS.map((d, i) => {
          const slots = grouped.get(i) ?? [];
          if (slots.length === 0) return null;
          return (
            <div key={i} className="rounded-md border p-3">
              <p className="text-sm font-medium">{d}</p>
              <div className="mt-2 space-y-1">
                {slots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
                      <Badge variant="secondary" className="text-[10px]">{s.slot_minutes} min</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{s.modalidad}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Editar</Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => del.mutate({ id: s.id, professional_id: s.professional_id })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}