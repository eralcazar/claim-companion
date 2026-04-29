import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Calendar, MapPin, Stethoscope, FileText, Pill, FlaskConical,
  User, Video, Plus,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { VideoMeetingBlock } from "@/components/appointments/VideoMeetingBlock";
import { BodyMapEditor } from "@/components/consultorio/BodyMapEditor";
import { AppointmentDocuments } from "@/components/appointments/AppointmentDocuments";
import { useRecetas } from "@/hooks/useRecetas";
import { useEstudios } from "@/hooks/useEstudios";
import { RecetaCard } from "@/components/recetas/RecetaCard";
import { RecetaForm } from "@/components/recetas/RecetaForm";
import { EstudioCard } from "@/components/estudios/EstudioCard";
import { EstudioForm } from "@/components/estudios/EstudioForm";
import { useAssignedPatients } from "@/hooks/usePatientPersonnel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientExpedienteTabs } from "@/components/expediente/PatientExpedienteTabs";
import { FolderOpen } from "lucide-react";

export default function Consultorio() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [obs, setObs] = useState("");
  const [recOpen, setRecOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [freePatientId, setFreePatientId] = useState<string | undefined>(undefined);

  const freeMode = !appointmentId;
  const { data: assignedPatients = [] } = useAssignedPatients("medico");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!freeMode) return;
    const pid = searchParams.get("paciente");
    if (pid && pid !== freePatientId) {
      setFreePatientId(pid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMode, searchParams]);

  // Si no llega ?paciente y el usuario no tiene pacientes asignados (ej. es paciente),
  // autoseleccionar su propio user_id para que vea su propio mapa corporal.
  useEffect(() => {
    if (!freeMode || freePatientId || !user) return;
    const pid = searchParams.get("paciente");
    if (!pid && assignedPatients.length === 0) {
      setFreePatientId(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMode, user, assignedPatients.length]);

  const isSelfView = freeMode && !!user && freePatientId === user.id;

  const { data: appointment, isLoading } = useQuery({
    queryKey: ["consultorio-appointment", appointmentId],
    enabled: !!appointmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const patientId = (appointment as any)?.user_id as string | undefined;
  const isDoctor = !!user && (appointment as any)?.doctor_id === user.id;

  const { data: patient } = useQuery({
    queryKey: ["consultorio-patient", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", patientId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["consultorio-history", patientId, appointmentId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_type, doctor_observations")
        .eq("user_id", patientId!)
        .neq("id", appointmentId!)
        .order("appointment_date", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: activeMeds = [] } = useQuery({
    queryKey: ["consultorio-meds", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("medications")
        .select("id, name, dosage, frequency")
        .eq("user_id", patientId!)
        .eq("active", true);
      return data ?? [];
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["consultorio-policies", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("id, company, policy_number, status")
        .eq("user_id", patientId!)
        .eq("status", "activa");
      return data ?? [];
    },
  });

  const { data: recetas = [] } = useRecetas({ appointmentId });
  const { data: estudios = [] } = useEstudios({ appointmentId });

  useEffect(() => {
    setObs((appointment as any)?.doctor_observations ?? "");
  }, [(appointment as any)?.id, (appointment as any)?.doctor_observations]);

  const saveObs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("appointments")
        .update({ doctor_observations: obs })
        .eq("id", appointmentId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observaciones guardadas");
      qc.invalidateQueries({ queryKey: ["consultorio-appointment"] });
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (freeMode) {
    const selected = assignedPatients.find((p) => p.patient_id === freePatientId);
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />Volver
          </Button>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Consultorio digital
          </h1>
        </div>

        {!isSelfView && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Selecciona un paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={freePatientId} onValueChange={setFreePatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un paciente asignado..." />
                </SelectTrigger>
                <SelectContent>
                  {assignedPatients.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Sin pacientes asignados.</div>
                  ) : (
                    assignedPatients.map((p) => (
                      <SelectItem key={p.patient_id} value={p.patient_id}>
                        {p.patient_name}{p.patient_email ? ` · ${p.patient_email}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selected && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/personal/paciente/${selected.patient_id}`}>Ver expediente completo</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {freePatientId ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Expediente Digital del paciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PatientExpedienteTabs
                  patientId={freePatientId}
                  patientName={selected?.patient_name}
                  impersonate={!isSelfView}
                  canEditBodyMap={!isSelfView}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Selecciona un paciente para abrir su mapa corporal.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (!appointment || !patientId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-center text-muted-foreground">No se encontró la cita.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1" />Volver
        </Button>
      </div>
    );
  }

  const a = appointment as any;
  const p = patient as any;
  const patientName =
    p?.full_name?.trim() ||
    [p?.first_name, p?.paternal_surname].filter(Boolean).join(" ").trim() ||
    p?.email ||
    "Paciente";
  const age = p?.date_of_birth
    ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Volver
        </Button>
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Consultorio
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* Patient column */}
        <div className="lg:col-span-3 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold">{patientName}</p>
              {age != null && <p className="text-muted-foreground text-xs">{age} años</p>}
              {p?.email && <p className="text-xs text-muted-foreground break-all">{p.email}</p>}
              {p?.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
              <Button asChild variant="outline" size="sm" className="w-full mt-2">
                <Link to={`/personal/paciente/${patientId}`}>Ver expediente completo</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pólizas activas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {policies.length === 0 ? (
                <p className="text-muted-foreground">Sin pólizas activas.</p>
              ) : (
                policies.map((pol: any) => (
                  <div key={pol.id} className="flex justify-between">
                    <span>{pol.company}</span>
                    <span className="text-muted-foreground truncate ml-2">{pol.policy_number}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Medicamentos activos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {activeMeds.length === 0 ? (
                <p className="text-muted-foreground">Sin medicamentos activos.</p>
              ) : (
                activeMeds.map((m: any) => (
                  <div key={m.id}>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-muted-foreground">{m.dosage} · {m.frequency}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimas citas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {history.length === 0 ? (
                <p className="text-muted-foreground">Sin historial.</p>
              ) : (
                history.map((h: any) => (
                  <div key={h.id}>
                    <p className="capitalize font-medium">{h.appointment_type}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(h.appointment_date), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center column */}
        <div className="lg:col-span-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Cita actual
                {a.is_telemedicine && (
                  <Badge variant="default" className="ml-1">
                    <Video className="h-3 w-3 mr-1" />Videoconsulta
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{format(new Date(a.appointment_date), "PPP 'a las' p", { locale: es })}</p>
              <p className="capitalize text-muted-foreground">{a.appointment_type}</p>
              {a.address && !a.is_telemedicine && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />{a.address}
                </p>
              )}
              {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
            </CardContent>
          </Card>

          {a.is_telemedicine && a.meeting_url && (
            <VideoMeetingBlock meetingUrl={a.meeting_url} appointmentDate={a.appointment_date} />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4 text-primary" />
                Observaciones del médico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={5}
                disabled={!isDoctor}
                placeholder="Escribe observaciones de la consulta..."
              />
              {isDoctor && (
                <Button
                  size="sm"
                  onClick={() => saveObs.mutate()}
                  disabled={saveObs.isPending || obs === (a.doctor_observations ?? "")}
                >
                  {saveObs.isPending ? "Guardando..." : "Guardar"}
                </Button>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-semibold">Acciones rápidas</p>
              <Button size="sm" variant="outline" className="w-full" disabled={!isDoctor}
                onClick={() => setRecOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Crear receta
              </Button>
              <Button size="sm" variant="outline" className="w-full" disabled={!isDoctor}
                onClick={() => setEstOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Solicitar estudio
              </Button>
            </CardContent>
          </Card>

          <Tabs defaultValue="recetas">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="recetas"><Pill className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="estudios"><FlaskConical className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="docs"><FileText className="h-3 w-3" /></TabsTrigger>
            </TabsList>
            <TabsContent value="recetas" className="space-y-2 mt-2">
              {recetas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin recetas.</p>
              ) : recetas.map((r: any) => <RecetaCard key={r.id} receta={r} />)}
            </TabsContent>
            <TabsContent value="estudios" className="space-y-2 mt-2">
              {estudios.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin estudios.</p>
              ) : estudios.map((e: any) => <EstudioCard key={e.id} estudio={e} />)}
            </TabsContent>
            <TabsContent value="docs" className="mt-2">
              <AppointmentDocuments appointmentId={appointmentId!} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5 text-primary" />
            Expediente Digital del paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PatientExpedienteTabs
            patientId={patientId}
            patientName={patientName}
            impersonate={true}
            canEditBodyMap={isDoctor}
          />
        </CardContent>
      </Card>

      {isDoctor && (
        <>
          <RecetaForm
            open={recOpen}
            onOpenChange={setRecOpen}
            initial={null}
            defaultPatientId={patientId}
            defaultAppointmentId={appointmentId}
            defaultDoctorId={user?.id}
          />
          <EstudioForm
            open={estOpen}
            onOpenChange={setEstOpen}
            initial={null}
            defaultPatientId={patientId}
            defaultAppointmentId={appointmentId}
            defaultDoctorId={user?.id}
          />
        </>
      )}
    </div>
  );
}
