import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar, Trash2, MapPin, Bell, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";
import { useDoctors } from "@/hooks/useDoctors";
import { AddressAutocomplete } from "@/components/appointments/AddressAutocomplete";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { PatientSelect } from "@/components/appointments/PatientSelect";

type AppointmentType = Database["public"]["Enums"]["appointment_type"];

const MANUAL_DOCTOR = "__manual__";
const NO_DOCTOR = "__none__";
const REMINDER_OPTIONS = [
  { v: 15, label: "15 minutos antes" },
  { v: 30, label: "30 minutos antes" },
  { v: 60, label: "1 hora antes" },
  { v: 120, label: "2 horas antes" },
  { v: 1440, label: "1 día antes" },
];

export default function Appointments() {
  const { user, roles } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: doctors } = useDoctors();

  const isMedico = roles.includes("medico");

  // Current user's display name (for read-only field)
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-name", effectiveUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, first_name, paternal_surname, email")
        .eq("user_id", effectiveUserId!)
        .maybeSingle();
      const p: any = data ?? {};
      return (
        p.full_name?.trim() ||
        [p.first_name, p.paternal_surname].filter(Boolean).join(" ") ||
        p.email ||
        ""
      );
    },
    enabled: !!effectiveUserId,
  });

  const initialForm = {
    appointment_date: "",
    appointment_type: "consulta" as AppointmentType,
    notes: "",
    doctor_id: NO_DOCTOR as string,
    doctor_name_manual: "",
    address: "",
    address_lat: null as number | null,
    address_lng: null as number | null,
    reminder_enabled: false,
    reminder_minutes_before: 60,
    patient_id: null as string | null,
    patient_name: "",
  };
  const [form, setForm] = useState(initialForm);

  // Preset patient/doctor based on role when opening fresh
  useEffect(() => {
    if (!open || editingId) return;
    if (isMedico) {
      setForm((f) => ({
        ...f,
        doctor_id: user?.id ?? NO_DOCTOR,
      }));
    } else if (effectiveUserId) {
      setForm((f) => ({
        ...f,
        patient_id: effectiveUserId,
        patient_name: myProfile ?? "",
      }));
    }
  }, [open, editingId, isMedico, effectiveUserId, user?.id, myProfile]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const openEdit = (apt: any) => {
    const dt = new Date(apt.appointment_date);
    const tzOffset = dt.getTimezoneOffset() * 60000;
    const localISO = new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
    setForm({
      appointment_date: localISO,
      appointment_type: apt.appointment_type,
      notes: apt.notes ?? "",
      doctor_id: apt.doctor_id ?? (apt.doctor_name_manual ? MANUAL_DOCTOR : NO_DOCTOR),
      doctor_name_manual: apt.doctor_name_manual ?? "",
      address: apt.address ?? "",
      address_lat: apt.address_lat ?? null,
      address_lng: apt.address_lng ?? null,
      reminder_enabled: !!apt.reminder_enabled,
      reminder_minutes_before: apt.reminder_minutes_before ?? 60,
      patient_id: apt.user_id ?? null,
      patient_name: apt._patientName ?? "",
    });
    setEditingId(apt.id);
    setOpen(true);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) resetForm();
  };

  const buildPayload = () => {
    const payload: any = {
      appointment_date: form.appointment_date,
      appointment_type: form.appointment_type,
      notes: form.notes,
      address: form.address || null,
      address_lat: form.address_lat,
      address_lng: form.address_lng,
      reminder_enabled: form.reminder_enabled,
      reminder_minutes_before: form.reminder_enabled ? form.reminder_minutes_before : null,
      doctor_id: null,
      doctor_name_manual: null,
    };
    if (isMedico) {
      payload.doctor_id = user?.id ?? null;
    } else if (form.doctor_id === MANUAL_DOCTOR) {
      payload.doctor_name_manual = form.doctor_name_manual || null;
    } else if (form.doctor_id !== NO_DOCTOR) {
      payload.doctor_id = form.doctor_id;
    }
    return payload;
  };

  // Fetch appointments — for medicos, union of own + as-doctor
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", effectiveUserId, isMedico],
    queryFn: async () => {
      const queries = [
        supabase
          .from("appointments")
          .select("*")
          .eq("user_id", effectiveUserId!)
          .order("appointment_date", { ascending: true }),
      ];
      if (isMedico && user?.id) {
        queries.push(
          supabase
            .from("appointments")
            .select("*")
            .eq("doctor_id", user.id)
            .order("appointment_date", { ascending: true }),
        );
      }
      const results = await Promise.all(queries);
      const map = new Map<string, any>();
      for (const r of results) {
        for (const a of r.data ?? []) map.set(a.id, a);
      }
      const list = Array.from(map.values()).sort(
        (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime(),
      );

      // Enrich with patient names (for medico view)
      const userIds = Array.from(new Set(list.map((a) => a.user_id)));
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, paternal_surname, email")
          .in("user_id", userIds);
        const nameMap = new Map<string, string>();
        for (const p of (profs ?? []) as any[]) {
          nameMap.set(
            p.user_id,
            p.full_name?.trim() ||
              [p.first_name, p.paternal_surname].filter(Boolean).join(" ") ||
              p.email ||
              "Paciente",
          );
        }
        for (const a of list) (a as any)._patientName = nameMap.get(a.user_id) ?? "";
      }
      return list;
    },
    enabled: !!effectiveUserId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const targetUserId = isMedico ? form.patient_id : effectiveUserId;
      if (!targetUserId) throw new Error("Falta paciente");
      const payload = { ...buildPayload(), user_id: targetUserId };
      const { error } = await supabase.from("appointments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      toast.success("Cita creada");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.message || "Error al crear cita"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("No editing id");
      const payload = { ...buildPayload(), reminder_sent_at: null };
      const { error } = await supabase.from("appointments").update(payload).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      toast.success("Cita actualizada");
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Error al actualizar cita"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      toast.success("Cita eliminada");
    },
  });

  const typeLabels: Record<string, string> = {
    consulta: "Consulta",
    estudio: "Estudio",
    procedimiento: "Procedimiento",
  };

  const now = new Date();
  const upcoming = appointments?.filter((a) => new Date(a.appointment_date) >= now) ?? [];
  const past = appointments?.filter((a) => new Date(a.appointment_date) < now) ?? [];

  const myDoctorName = useMemo(() => myProfile || "Tú", [myProfile]);
  const canSubmit =
    !!form.appointment_date && (isMedico ? !!form.patient_id : !!effectiveUserId);

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Agenda</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Cita" : "Nueva Cita"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Patient field */}
              <div className="space-y-2">
                <Label>Paciente</Label>
                {isMedico && !editingId ? (
                  <PatientSelect
                    value={form.patient_id}
                    onChange={(id, name) => setForm({ ...form, patient_id: id, patient_name: name })}
                  />
                ) : (
                  <Input value={form.patient_name || myDoctorName} disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.appointment_type} onValueChange={(v) => setForm({ ...form, appointment_type: v as AppointmentType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="estudio">Estudio</SelectItem>
                    <SelectItem value="procedimiento">Procedimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor field */}
              <div className="space-y-2">
                <Label>Médico</Label>
                {isMedico ? (
                  <Input value={myDoctorName} disabled />
                ) : (
                  <>
                    <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DOCTOR}>Sin asignar</SelectItem>
                        {(doctors ?? []).map((d) => (
                          <SelectItem key={d.user_id} value={d.user_id}>{d.full_name}</SelectItem>
                        ))}
                        <SelectItem value={MANUAL_DOCTOR}>Otro / no listado</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.doctor_id === MANUAL_DOCTOR && (
                      <Input
                        placeholder="Nombre del médico"
                        value={form.doctor_name_manual}
                        onChange={(e) => setForm({ ...form, doctor_name_manual: e.target.value })}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Dirección de la consulta</Label>
                <AddressAutocomplete
                  value={form.address}
                  lat={form.address_lat}
                  lng={form.address_lng}
                  onChange={(v) => setForm({ ...form, address: v.address, address_lat: v.lat, address_lng: v.lng })}
                />
              </div>
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Activar recordatorio
                  </Label>
                  <Switch
                    checked={form.reminder_enabled}
                    onCheckedChange={(v) => setForm({ ...form, reminder_enabled: v })}
                  />
                </div>
                {form.reminder_enabled && (
                  <Select
                    value={String(form.reminder_minutes_before)}
                    onValueChange={(v) => setForm({ ...form, reminder_minutes_before: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map((o) => (
                        <SelectItem key={o.v} value={String(o.v)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas opcionales..." />
              </div>
              <Button
                className="w-full"
                onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
                disabled={createMutation.isPending || updateMutation.isPending || !canSubmit}
              >
                {editingId
                  ? updateMutation.isPending ? "Actualizando..." : "Actualizar"
                  : createMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <>
          <div>
            <h2 className="font-heading text-lg font-semibold mb-3">Próximas</h2>
            {upcoming.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Sin citas próximas</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((apt) => (
                  <Card key={apt.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setDetail(apt)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{typeLabels[apt.appointment_type]}</p>
                          {isMedico && (apt as any)._patientName && (
                            <p className="text-xs text-foreground/80">{(apt as any)._patientName}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                          </p>
                          {apt.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> <span className="truncate max-w-[180px]">{apt.address}</span>
                            </p>
                          )}
                          {apt.notes && <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {apt.user_id === effectiveUserId && (
                          <>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(apt); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(apt.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="font-heading text-lg font-semibold mb-3 text-muted-foreground">Pasadas</h2>
              <div className="space-y-3 opacity-60">
                {past.map((apt) => (
                  <Card key={apt.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setDetail(apt)}>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">{typeLabels[apt.appointment_type]}</p>
                      {isMedico && (apt as any)._patientName && (
                        <p className="text-xs text-foreground/80">{(apt as any)._patientName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AppointmentDetailDialog
        appointment={detail}
        patientName={(detail as any)?._patientName}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        canEdit={detail?.user_id === effectiveUserId}
        onEdit={openEdit}
        canEditDoctorObservations={isMedico && detail?.doctor_id === user?.id}
      />
    </div>
  );
}
