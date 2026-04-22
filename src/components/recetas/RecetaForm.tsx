import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PatientSelect } from "@/components/appointments/PatientSelect";
import { useCreateReceta, useUpdateReceta } from "@/hooks/useRecetas";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pill } from "lucide-react";

const FREQ_OPTS = [
  ["cada_4h","Cada 4 horas"],["cada_6h","Cada 6 horas"],["cada_8h","Cada 8 horas"],
  ["cada_12h","Cada 12 horas"],["cada_24h","Cada 24 horas"],["cada_48h","Cada 48 horas"],
  ["semanal","Semanal"],["otro","Otra"],
] as const;

const VIAS = ["oral","inyectable","tópica","inhalatoria","oftálmica","ótica","sublingual","rectal"];
const UNIDADES = ["mg","ml","g","UI","mcg","tabletas","cápsulas","gotas","puff"];

const blankItem = () => ({
  medicamento_nombre: "",
  marca_comercial: "",
  es_generico: false,
  dosis: "",
  unidad_dosis: "mg",
  cantidad: "",
  via_administracion: "oral",
  frecuencia: "cada_8h",
  frecuencia_horas: "",
  dias_a_tomar: "",
  precio_aproximado: "",
  indicacion: "",
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: any;
  defaultPatientId?: string;
  defaultAppointmentId?: string;
  defaultDoctorId?: string;
}

export function RecetaForm({ open, onOpenChange, initial, defaultPatientId, defaultAppointmentId, defaultDoctorId }: Props) {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isMedico = roles.includes("medico");
  const create = useCreateReceta();
  const update = useUpdateReceta();
  const [form, setForm] = useState<any>({
    patient_id: defaultPatientId ?? "",
    appointment_id: defaultAppointmentId ?? null,
    indicacion: "",
    observaciones: "",
    estado: "activa",
  });
  const [items, setItems] = useState<any[]>([blankItem()]);

  useEffect(() => {
    if (initial) {
      setForm({
        patient_id: initial.patient_id,
        appointment_id: initial.appointment_id,
        indicacion: initial.indicacion ?? "",
        observaciones: initial.observaciones ?? "",
        estado: initial.estado ?? "activa",
        doctor_id: initial.doctor_id,
      });
      const existing = Array.isArray(initial.items) && initial.items.length > 0
        ? initial.items.map((it: any) => ({
            ...it,
            dosis: it.dosis ?? "",
            cantidad: it.cantidad ?? "",
            dias_a_tomar: it.dias_a_tomar ?? "",
            frecuencia_horas: it.frecuencia_horas ?? "",
            precio_aproximado: it.precio_aproximado ?? "",
            marca_comercial: it.marca_comercial ?? "",
            indicacion: it.indicacion ?? "",
          }))
        : [{
            ...blankItem(),
            medicamento_nombre: initial.medicamento_nombre ?? "",
            marca_comercial: initial.marca_comercial ?? "",
            es_generico: !!initial.es_generico,
            dosis: initial.dosis ?? "",
            unidad_dosis: initial.unidad_dosis ?? "mg",
            cantidad: initial.cantidad ?? "",
            via_administracion: initial.via_administracion ?? "oral",
            frecuencia: initial.frecuencia ?? "cada_8h",
            frecuencia_horas: initial.frecuencia_horas ?? "",
            dias_a_tomar: initial.dias_a_tomar ?? "",
            precio_aproximado: initial.precio_aproximado ?? "",
          }];
      setItems(existing);
    } else {
      setForm((f: any) => ({
        ...f,
        patient_id: defaultPatientId ?? f.patient_id,
        appointment_id: defaultAppointmentId ?? f.appointment_id,
      }));
      setItems([blankItem()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, defaultPatientId, defaultAppointmentId, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setItem = (idx: number, k: string, v: any) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  const addItem = () => setItems((arr) => [...arr, blankItem()]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const itemsValid = items.length > 0 && items.every((it) => {
    if (!it.medicamento_nombre?.trim()) return false;
    if (it.frecuencia === "otro" && (!it.frecuencia_horas || Number(it.frecuencia_horas) <= 0)) return false;
    return true;
  });
  const canSubmit = !!form.patient_id && itemsValid;

  const submit = async () => {
    if (!canSubmit) return;
    const doctorId = isMedico ? user!.id : (defaultDoctorId || form.doctor_id || user!.id);
    const header: any = {
      patient_id: form.patient_id,
      appointment_id: form.appointment_id || null,
      doctor_id: doctorId,
      indicacion: form.indicacion || null,
      observaciones: form.observaciones || null,
      estado: form.estado,
    };
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, ...header, items });
    } else {
      header.created_by = user!.id;
      await create.mutateAsync({ ...header, items });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar receta" : "Nueva receta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {!defaultPatientId && (
            <div>
              <Label>Paciente *</Label>
              <PatientSelect value={form.patient_id} onChange={(id) => set("patient_id", id)} />
            </div>
          )}
          <div>
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Medicamentos ({items.length})</h3>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Pill className="h-4 w-4 text-primary" />
                    Medicamento #{idx + 1}{it.medicamento_nombre ? ` — ${it.medicamento_nombre}` : ""}
                  </div>
                  {items.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <Label>Medicamento *</Label>
                    <Input value={it.medicamento_nombre} onChange={(e) => setItem(idx, "medicamento_nombre", e.target.value)} placeholder="Ej: Paracetamol" />
                  </div>
                  <div>
                    <Label>Marca comercial</Label>
                    <Input value={it.marca_comercial} onChange={(e) => setItem(idx, "marca_comercial", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={it.es_generico} onCheckedChange={(v) => setItem(idx, "es_generico", v)} />
                    <Label>Genérico</Label>
                  </div>
                  <div>
                    <Label>Dosis</Label>
                    <Input type="number" step="0.01" value={it.dosis} onChange={(e) => setItem(idx, "dosis", e.target.value)} />
                  </div>
                  <div>
                    <Label>Unidad</Label>
                    <Select value={it.unidad_dosis} onValueChange={(v) => setItem(idx, "unidad_dosis", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cantidad por toma</Label>
                    <Input type="number" value={it.cantidad} onChange={(e) => setItem(idx, "cantidad", e.target.value)} />
                  </div>
                  <div>
                    <Label>Vía de administración</Label>
                    <Select value={it.via_administracion} onValueChange={(v) => setItem(idx, "via_administracion", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VIAS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frecuencia *</Label>
                    <Select value={it.frecuencia} onValueChange={(v) => setItem(idx, "frecuencia", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FREQ_OPTS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {it.frecuencia === "otro" && (
                    <div>
                      <Label>Cada cuántas horas *</Label>
                      <Input type="number" min="1" value={it.frecuencia_horas} onChange={(e) => setItem(idx, "frecuencia_horas", e.target.value)} />
                    </div>
                  )}
                  <div>
                    <Label>Días a tomar</Label>
                    <Input type="number" value={it.dias_a_tomar} onChange={(e) => setItem(idx, "dias_a_tomar", e.target.value)} />
                  </div>
                  <div>
                    <Label>Precio aproximado</Label>
                    <Input type="number" step="0.01" value={it.precio_aproximado} onChange={(e) => setItem(idx, "precio_aproximado", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Indicación específica</Label>
                    <Textarea value={it.indicacion} onChange={(e) => setItem(idx, "indicacion", e.target.value)} rows={2} />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-1" />Agregar medicamento
            </Button>
          </div>

          <div>
            <Label>Indicación general</Label>
            <Textarea value={form.indicacion} onChange={(e) => set("indicacion", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending || !canSubmit}>
            {initial ? "Guardar cambios" : "Crear receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
