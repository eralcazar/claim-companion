import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Scissors, Plus, Pencil, Trash2 } from "lucide-react";
import { useSurgeries, useUpsertSurgery, useDeleteSurgery } from "@/hooks/useSurgeries";
import { useAuth } from "@/contexts/AuthContext";

interface Props { patientId: string }

const empty = { fecha: "", nombre: "", hospital: "", cirujano: "", tipo_anestesia: "", complicaciones: "", notas: "", vigente: true } as any;

export function SurgeriesPanel({ patientId }: Props) {
  const { user } = useAuth();
  const { data = [], isLoading } = useSurgeries(patientId);
  const upsert = useUpsertSurgery();
  const del = useDeleteSurgery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const openNew = () => { setForm({ ...empty, patient_id: patientId }); setOpen(true); };
  const openEdit = (s: any) => { setForm({ ...s }); setOpen(true); };

  const submit = async () => {
    if (!form.fecha || !form.nombre?.trim()) return;
    await upsert.mutateAsync({ ...form, patient_id: patientId });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" /> Cirugías e intervenciones</h2>
          <p className="text-xs text-muted-foreground">Historial de procedimientos quirúrgicos.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nueva</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Sin cirugías registradas.</p>
      ) : (
        <div className="space-y-2">
          {data.map((s) => {
            const canEdit = s.created_by === user?.id || patientId === user?.id;
            return (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.nombre}</span>
                      {!s.vigente && <Badge variant="secondary">Histórico</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      {s.hospital && ` · ${s.hospital}`}
                      {s.cirujano && ` · Dr(a). ${s.cirujano}`}
                    </div>
                    {s.tipo_anestesia && <div className="text-xs">Anestesia: {s.tipo_anestesia}</div>}
                    {s.complicaciones && <div className="text-xs text-destructive">⚠ {s.complicaciones}</div>}
                    {s.notas && <p className="text-sm mt-1 whitespace-pre-wrap">{s.notas}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("¿Eliminar cirugía?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar cirugía" : "Nueva cirugía"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha *</Label><Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
              <div><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Apendicectomía" /></div>
              <div><Label>Hospital</Label><Input value={form.hospital ?? ""} onChange={(e) => set("hospital", e.target.value)} /></div>
              <div><Label>Cirujano</Label><Input value={form.cirujano ?? ""} onChange={(e) => set("cirujano", e.target.value)} /></div>
              <div className="col-span-2"><Label>Tipo de anestesia</Label><Input value={form.tipo_anestesia ?? ""} onChange={(e) => set("tipo_anestesia", e.target.value)} placeholder="general / regional / local" /></div>
              <div className="col-span-2"><Label>Complicaciones</Label><Input value={form.complicaciones ?? ""} onChange={(e) => set("complicaciones", e.target.value)} /></div>
              <div className="col-span-2"><Label>Notas</Label><Textarea rows={3} value={form.notas ?? ""} onChange={(e) => set("notas", e.target.value)} /></div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={!!form.vigente} onCheckedChange={(v) => set("vigente", v)} /><Label>Vigente</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={upsert.isPending || !form.fecha || !form.nombre?.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}