import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, SlidersHorizontal, Loader2 } from "lucide-react";
import { MONITOR_TYPES, useMyThresholds, useUpsertThreshold, useDeleteThreshold, type MonitorThreshold } from "@/hooks/usePatientThresholds";

function num(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function UmbralesMonitor() {
  const { data: rows = [], isLoading } = useMyThresholds();
  const upsert = useUpsertThreshold();
  const del = useDeleteThreshold();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<MonitorThreshold>>({ monitor_type: "heart_rate", active: true, outlier_z: 2.5, min_readings_per_day: 1 });

  function edit(r: MonitorThreshold) {
    setDraft(r);
    setOpen(true);
  }
  function nuevo() {
    setDraft({ monitor_type: "heart_rate", active: true, outlier_z: 2.5, min_readings_per_day: 1 });
    setOpen(true);
  }
  async function save() {
    if (!draft.monitor_type) return;
    await upsert.mutateAsync(draft);
    setOpen(false);
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" /> Umbrales personalizados
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ajustá tus propios rangos clínicos (mínimo/máximo) y la sensibilidad de detección
            de valores atípicos para cada monitor. Podés limitar cada configuración a un rango
            de fechas específico —útil para etapas, embarazos, tratamientos o entrenamientos.
          </p>
        </div>
        <Button onClick={nuevo} className="gap-1"><Plus className="h-4 w-4" /> Nuevo umbral</Button>
      </header>

      {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((r) => {
          const meta = MONITOR_TYPES.find((m) => m.key === r.monitor_type);
          return (
            <Card key={r.id} className={!r.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{meta?.label ?? r.monitor_type}</span>
                  {!r.active && <Badge variant="outline">Inactivo</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  Rango clínico: <b>{r.min_val ?? "—"}</b> a <b>{r.max_val ?? "—"}</b> {meta?.unit}
                </div>
                <div className="text-muted-foreground">
                  Sensibilidad outlier (z): <b>{r.outlier_z ?? 2.5}</b> · lecturas mínimas/día: <b>{r.min_readings_per_day ?? 1}</b>
                </div>
                {(r.date_from || r.date_to) && (
                  <div className="text-xs text-muted-foreground">Vigencia: {r.date_from ?? "—"} → {r.date_to ?? "—"}</div>
                )}
                {r.notes && <div className="text-xs italic">{r.notes}</div>}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => edit(r)} className="gap-1"><Pencil className="h-3 w-3" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)} className="gap-1 text-destructive"><Trash2 className="h-3 w-3" /> Eliminar</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && rows.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="p-6 text-sm text-muted-foreground text-center">
            No tenés umbrales personalizados. Se usan los rangos por defecto de cada monitor.
          </CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{draft.id ? "Editar umbral" : "Nuevo umbral"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de monitor</Label>
              <Select value={draft.monitor_type} onValueChange={(v) => setDraft({ ...draft, monitor_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONITOR_TYPES.map((m) => (<SelectItem key={m.key} value={m.key}>{m.label} ({m.unit})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Mínimo clínico</Label>
                <Input type="number" step="0.1" value={draft.min_val ?? ""} onChange={(e) => setDraft({ ...draft, min_val: num(e.target.value) })} />
              </div>
              <div>
                <Label>Máximo clínico</Label>
                <Input type="number" step="0.1" value={draft.max_val ?? ""} onChange={(e) => setDraft({ ...draft, max_val: num(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Sensibilidad outlier (z)</Label>
                <Input type="number" step="0.1" value={draft.outlier_z ?? 2.5} onChange={(e) => setDraft({ ...draft, outlier_z: num(e.target.value) })} />
                <p className="text-[10px] text-muted-foreground mt-1">Menor = más alertas. 2.5 = estándar.</p>
              </div>
              <div>
                <Label>Lecturas mín./día</Label>
                <Input type="number" value={draft.min_readings_per_day ?? 1} onChange={(e) => setDraft({ ...draft, min_readings_per_day: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Desde (opcional)</Label>
                <Input type="date" value={draft.date_from ?? ""} onChange={(e) => setDraft({ ...draft, date_from: e.target.value || null })} />
              </div>
              <div>
                <Label>Hasta (opcional)</Label>
                <Input type="date" value={draft.date_to ?? ""} onChange={(e) => setDraft({ ...draft, date_to: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Ej: embarazo semana 20-30, ajuste por medicación X" />
            </div>
            <div className="flex items-center gap-2">
              <input id="active" type="checkbox" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              <Label htmlFor="active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}