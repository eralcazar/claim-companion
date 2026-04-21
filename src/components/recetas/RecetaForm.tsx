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

const FREQ_OPTS = [
  ["cada_4h","Cada 4 horas"],["cada_6h","Cada 6 horas"],["cada_8h","Cada 8 horas"],
  ["cada_12h","Cada 12 horas"],["cada_24h","Cada 24 horas"],["cada_48h","Cada 48 horas"],
  ["semanal","Semanal"],["otro","Otra"],
] as const;

const VIAS = ["oral","inyectable","tópica","inhalatoria","oftálmica","ótica","sublingual","rectal"];
const UNIDADES = ["mg","ml","g","UI","mcg","tabletas","cápsulas","gotas","puff"];

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
    medicamento_nombre: "",
    dosis: "",
    unidad_dosis: "mg",
    cantidad: "",
    via_administracion: "oral",
    dias_a_tomar: "",
    frecuencia: "cada_8h",
    frecuencia_horas: "",
    indicacion: "",
    observaciones: "",
    marca_comercial: "",
    es_generico: false,
    precio_aproximado: "",
    estado: "activa",
  });

  useEffect(() => {
    if (initial) setForm({ ...initial, dosis: initial.dosis ?? "", cantidad: initial.cantidad ?? "", dias_a_tomar: initial.dias_a_tomar ?? "", frecuencia_horas: initial.frecuencia_horas ?? "", precio_aproximado: initial.precio_aproximado ?? "" });
    else setForm((f: any) => ({ ...f, patient_id: defaultPatientId ?? f.patient_id, appointment_id: defaultAppointmentId ?? f.appointment_id }));
  }, [initial, defaultPatientId, defaultAppointmentId, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.patient_id || !form.medicamento_nombre) return;
    if (form.frecuencia === "otro" && (!form.frecuencia_horas || Number(form.frecuencia_horas) <= 0)) return;
    const doctorId = isMedico ? user!.id : (defaultDoctorId || form.doctor_id || user!.id);
    const payload: any = {
      patient_id: form.patient_id,
      appointment_id: form.appointment_id || null,
      doctor_id: doctorId,
      medicamento_nombre: form.medicamento_nombre,
      dosis: form.dosis === "" ? null : Number(form.dosis),
      unidad_dosis: form.unidad_dosis || null,
      cantidad: form.cantidad === "" ? null : Number(form.cantidad),
      via_administracion: form.via_administracion || null,
      dias_a_tomar: form.dias_a_tomar === "" ? null : Number(form.dias_a_tomar),
      frecuencia: form.frecuencia,
      frecuencia_horas: form.frecuencia === "otro" ? Number(form.frecuencia_horas) : null,
      indicacion: form.indicacion || null,
      observaciones: form.observaciones || null,
      marca_comercial: form.marca_comercial || null,
      es_generico: form.es_generico,
      precio_aproximado: form.precio_aproximado === "" ? null : Number(form.precio_aproximado),
      estado: form.estado,
    };
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, ...payload });
    } else {
      payload.created_by = user!.id;
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar receta" : "Nueva receta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!defaultPatientId && (
            <div>
              <Label>Paciente *</Label>
              <PatientSelect value={form.patient_id} onChange={(id) => set("patient_id", id)} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Medicamento *</Label>
              <Input value={form.medicamento_nombre} onChange={(e) => set("medicamento_nombre", e.target.value)} placeholder="Ej: Paracetamol" />
            </div>
            <div>
              <Label>Marca comercial</Label>
              <Input value={form.marca_comercial} onChange={(e) => set("marca_comercial", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.es_generico} onCheckedChange={(v) => set("es_generico", v)} />
              <Label>Genérico</Label>
            </div>
            <div>
              <Label>Dosis</Label>
              <Input type="number" step="0.01" value={form.dosis} onChange={(e) => set("dosis", e.target.value)} />
            </div>
            <div>
              <Label>Unidad</Label>
              <Select value={form.unidad_dosis} onValueChange={(v) => set("unidad_dosis", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad por toma</Label>
              <Input type="number" value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)} />
            </div>
            <div>
              <Label>Vía de administración</Label>
              <Select value={form.via_administracion} onValueChange={(v) => set("via_administracion", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VIAS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frecuencia *</Label>
              <Select value={form.frecuencia} onValueChange={(v) => set("frecuencia", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQ_OPTS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.frecuencia === "otro" && (
              <div>
                <Label>Cada cuántas horas *</Label>
                <Input type="number" min="1" value={form.frecuencia_horas} onChange={(e) => set("frecuencia_horas", e.target.value)} />
              </div>
            )}
            <div>
              <Label>Días a tomar</Label>
              <Input type="number" value={form.dias_a_tomar} onChange={(e) => set("dias_a_tomar", e.target.value)} />
            </div>
            <div>
              <Label>Precio aproximado</Label>
              <Input type="number" step="0.01" value={form.precio_aproximado} onChange={(e) => set("precio_aproximado", e.target.value)} />
            </div>
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
          </div>
          <div>
            <Label>Indicación</Label>
            <Textarea value={form.indicacion} onChange={(e) => set("indicacion", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending || !form.patient_id || !form.medicamento_nombre}>
            {initial ? "Guardar cambios" : "Crear receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
