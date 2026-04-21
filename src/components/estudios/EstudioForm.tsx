import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PatientSelect } from "@/components/appointments/PatientSelect";
import { useCreateEstudio, useUpdateEstudio } from "@/hooks/useEstudios";
import { useAuth } from "@/contexts/AuthContext";

const TIPOS = [
  "sangre","orina","heces","cultivo","citologia","radiografia","ecografia","tomografia",
  "resonancia","mamografia","endoscopia","electrocardiograma","electroencefalograma",
  "espirometria","audiometria","test_esfuerzo","biopsia","test_alergia","densitometria","otro",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: any;
  defaultPatientId?: string;
  defaultAppointmentId?: string;
  defaultDoctorId?: string;
}

export function EstudioForm({ open, onOpenChange, initial, defaultPatientId, defaultAppointmentId, defaultDoctorId }: Props) {
  const { user, roles } = useAuth();
  const isMedico = roles.includes("medico");
  const create = useCreateEstudio();
  const update = useUpdateEstudio();
  const [form, setForm] = useState<any>({
    patient_id: defaultPatientId ?? "",
    appointment_id: defaultAppointmentId ?? null,
    tipo_estudio: "sangre",
    descripcion: "",
    cantidad: 1,
    indicacion: "",
    observaciones: "",
    preparacion: "",
    laboratorio_sugerido: "",
    prioridad: "normal",
    ayuno_obligatorio: false,
    horas_ayuno: "",
    estado: "solicitado",
  });

  useEffect(() => {
    if (initial) setForm({ ...initial, horas_ayuno: initial.horas_ayuno ?? "" });
    else setForm((f: any) => ({ ...f, patient_id: defaultPatientId ?? f.patient_id, appointment_id: defaultAppointmentId ?? f.appointment_id }));
  }, [initial, defaultPatientId, defaultAppointmentId, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.patient_id || !form.tipo_estudio) return;
    const doctorId = isMedico ? user!.id : (defaultDoctorId || form.doctor_id || user!.id);
    const payload: any = {
      patient_id: form.patient_id,
      appointment_id: form.appointment_id || null,
      doctor_id: doctorId,
      tipo_estudio: form.tipo_estudio,
      descripcion: form.descripcion || null,
      cantidad: Number(form.cantidad) || 1,
      indicacion: form.indicacion || null,
      observaciones: form.observaciones || null,
      preparacion: form.preparacion || null,
      laboratorio_sugerido: form.laboratorio_sugerido || null,
      prioridad: form.prioridad,
      ayuno_obligatorio: form.ayuno_obligatorio,
      horas_ayuno: form.ayuno_obligatorio && form.horas_ayuno !== "" ? Number(form.horas_ayuno) : null,
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
          <DialogTitle>{initial ? "Editar estudio" : "Nuevo estudio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!defaultPatientId && (
            <div>
              <Label>Paciente *</Label>
              <PatientSelect value={form.patient_id} onChange={(id) => set("patient_id", id)} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Tipo de estudio *</Label>
              <Select value={form.tipo_estudio} onValueChange={(v) => set("tipo_estudio", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" min="1" value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Ej: Hemograma completo" />
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select value={form.prioridad} onValueChange={(v) => set("prioridad", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Laboratorio sugerido</Label>
              <Input value={form.laboratorio_sugerido} onChange={(e) => set("laboratorio_sugerido", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.ayuno_obligatorio} onCheckedChange={(v) => set("ayuno_obligatorio", v)} />
              <Label>Ayuno obligatorio</Label>
            </div>
            {form.ayuno_obligatorio && (
              <div>
                <Label>Horas de ayuno</Label>
                <Input type="number" min="1" value={form.horas_ayuno} onChange={(e) => set("horas_ayuno", e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <Label>Indicación</Label>
            <Textarea value={form.indicacion} onChange={(e) => set("indicacion", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Preparación</Label>
            <Textarea value={form.preparacion} onChange={(e) => set("preparacion", e.target.value)} rows={2} placeholder="Instrucciones previas al estudio" />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending || !form.patient_id}>
            {initial ? "Guardar cambios" : "Crear estudio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
