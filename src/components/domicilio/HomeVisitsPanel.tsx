import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, MapPin, Plus, Clock, Check, Map as MapIcon, Settings2, Car, X, Flag, History, CalendarClock, Ban } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useHomeVisits, useCreateHomeVisit, useUpdateHomeVisit,
  useAcceptHomeVisit, useSetHomeVisitState, useRespondReschedule,
} from "@/hooks/useHomeVisits";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AddressPicker, MiniMap, type AddressValue } from "./AddressPicker";
import { VisitDetailDialog } from "./VisitDetailDialog";
import { RejectVisitDialog } from "./RejectVisitDialog";
import { SuggestedDoctorsList } from "./SuggestedDoctorsList";
import { RescheduleVisitDialog } from "./RescheduleVisitDialog";

const URGENCIAS = [
  { value: "baja", label: "Baja", color: "secondary" as const },
  { value: "media", label: "Media", color: "default" as const },
  { value: "alta", label: "Alta", color: "destructive" as const },
];
const ESTADOS = ["pendiente", "aceptada", "en_camino", "llegada", "completada", "rechazada", "cancelada"];

interface Props { mode: "paciente" | "medico"; userId: string; isPatient?: boolean; isPro?: boolean }

export function HomeVisitsPanel({ mode, userId, isPatient = true, isPro = false }: Props) {
  const { data: visits = [] } = useHomeVisits(mode === "paciente" ? { patientId: userId } : { soloPendientes: false });
  const create = useCreateHomeVisit();
  const update = useUpdateHomeVisit();
  const accept = useAcceptHomeVisit();
  const setState = useSetHomeVisitState();
  const respondReschedule = useRespondReschedule();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold flex items-center gap-2"><Home className="h-5 w-5" />
          {mode === "paciente" ? "Médico a domicilio" : "Solicitudes a domicilio"}
        </h3>
        <div className="flex gap-2">
          {isPro && (
            <Button asChild size="sm" variant="outline">
              <Link to="/domicilio/cobertura"><Settings2 className="h-4 w-4 mr-1" />Áreas de cobertura</Link>
            </Button>
          )}
          {mode === "paciente" && isPatient && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Solicitar</Button></DialogTrigger>
              <RequestForm onSubmit={async (p) => { await create.mutateAsync(p); setOpen(false); }} />
            </Dialog>
          )}
        </div>
      </div>

      {mode === "paciente" && !isPatient && (
        <Alert>
          <AlertDescription className="text-xs">
            Solo pacientes pueden crear solicitudes a domicilio. Cambia el rol activo a <b>Paciente</b> en tu
            perfil o solicita el alta al administrador.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3">
        {visits.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Sin solicitudes.</CardContent></Card>
        )}
        {visits.map((v: any) => {
          const urg = URGENCIAS.find((u) => u.value === v.urgencia);
          return (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{v.motivo}</CardTitle>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant={urg?.color}>{urg?.label}</Badge>
                      <Badge variant="outline">{v.estado}</Badge>
                      {v.in_coverage === true && <Badge variant="secondary">En cobertura</Badge>}
                      {v.in_coverage === false && <Badge variant="outline">Fuera de cobertura</Badge>}
                      {v.accuracy_m != null && (
                        <span className="text-muted-foreground">± {Math.round(Number(v.accuracy_m))} m</span>
                      )}
                      {v.fecha_preferida && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{format(new Date(v.fecha_preferida), "EEE d MMM HH:mm", { locale: es })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />{v.direccion}
                    </div>
                    {v.notas && <p className="text-xs">{v.notas}</p>}
                    {v.lat != null && v.lng != null && <MiniMap lat={Number(v.lat)} lng={Number(v.lng)} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex gap-2 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => setDetail(v)}>
                  <MapIcon className="h-4 w-4 mr-1" />Ver mapa
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDetail(v)}>
                  <History className="h-4 w-4 mr-1" />Historial
                </Button>
                {v.motivo_rechazo && (
                  <div className="w-full text-xs text-destructive">Rechazada: {v.motivo_rechazo}</div>
                )}
                {v.reschedule_status === "pending" && (
                  <div className="w-full rounded-md border border-dashed p-2 space-y-2">
                    <div className="text-xs font-medium flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Propuesta de reprogramación
                      {v.reschedule_proposed_by === userId && <Badge variant="outline" className="ml-1">enviada</Badge>}
                    </div>
                    {v.reschedule_note && <p className="text-xs text-muted-foreground">{v.reschedule_note}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(v.reschedule_proposals ?? []).map((p: string) => (
                        <div key={p} className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {format(new Date(p), "EEE d MMM HH:mm", { locale: es })}
                          </Badge>
                          {v.reschedule_proposed_by !== userId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => respondReschedule.mutate({ id: v.id, accept: true, chosen: p })}
                            >
                              <Check className="h-3 w-3 mr-1" />Aceptar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {v.reschedule_proposed_by !== userId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        onClick={() => respondReschedule.mutate({ id: v.id, accept: false })}
                      >
                        <X className="h-3 w-3 mr-1" />Rechazar propuesta
                      </Button>
                    )}
                  </div>
                )}
                {["pendiente", "aceptada", "en_camino"].includes(v.estado) && v.reschedule_status !== "pending" && (
                  <Button size="sm" variant="outline" onClick={() => setRescheduleId(v.id)}>
                    <CalendarClock className="h-4 w-4 mr-1" />Reprogramar
                  </Button>
                )}
                {mode === "paciente" && v.patient_id === userId && ["pendiente", "aceptada"].includes(v.estado) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Ban className="h-4 w-4 mr-1" />Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar solicitud?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se notificará al médico asignado y la solicitud quedará marcada como cancelada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={() => setState.mutate({ id: v.id, estado: "cancelada" })}>
                          Sí, cancelar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {mode === "medico" && (
                  <>
                    {v.estado === "pendiente" && (
                      <>
                        <Button size="sm" onClick={() => accept.mutate(v.id)} disabled={accept.isPending}>
                          <Check className="h-4 w-4 mr-1" />Aceptar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectId(v.id)}>
                          <X className="h-4 w-4 mr-1" />Rechazar
                        </Button>
                      </>
                    )}
                    {v.estado === "aceptada" && (
                      <Button size="sm" variant="secondary" onClick={() => setState.mutate({ id: v.id, estado: "en_camino" })}>
                        <Car className="h-4 w-4 mr-1" />En camino
                      </Button>
                    )}
                    {v.estado === "en_camino" && (
                      <Button size="sm" variant="secondary" onClick={() => setState.mutate({ id: v.id, estado: "llegada" })}>
                        <MapPin className="h-4 w-4 mr-1" />Llegué
                      </Button>
                    )}
                    {v.estado === "llegada" && (
                      <Button size="sm" onClick={() => setState.mutate({ id: v.id, estado: "completada" })}>
                        <Flag className="h-4 w-4 mr-1" />Completar
                      </Button>
                    )}
                    <Select value={v.estado} onValueChange={(estado) => update.mutate({ id: v.id, estado, doctor_id: userId })}>
                      <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <VisitDetailDialog
        visit={detail}
        canEdit={
          !!detail &&
          (mode === "paciente"
            ? detail.patient_id === userId
            : detail.doctor_id === userId || detail.estado === "pendiente")
        }
        onClose={() => setDetail(null)}
      />
      <RejectVisitDialog visitId={rejectId} open={!!rejectId} onClose={() => setRejectId(null)} />
      <RescheduleVisitDialog visitId={rescheduleId} open={!!rescheduleId} onClose={() => setRescheduleId(null)} />
    </div>
  );
}

function RequestForm({ onSubmit }: { onSubmit: (p: any) => Promise<void> }) {
  const { user } = useAuth();
  const [motivo, setMotivo] = useState("");
  const [address, setAddress] = useState<AddressValue>({ direccion: "", lat: null, lng: null, accuracy_m: null, location_source: null, in_coverage: null });
  const [urgencia, setUrgencia] = useState("media");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [medicoId, setMedicoId] = useState<string | null>(null);
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Solicitar médico a domicilio</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Motivo</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Fiebre, mareo..." /></div>
        <AddressPicker value={address} onChange={setAddress} />
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Urgencia</Label>
            <Select value={urgencia} onValueChange={setUrgencia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{URGENCIAS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Preferencia (opc.)</Label><Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        </div>
        <div>
          <Label>Médico sugerido (opcional)</Label>
          <SuggestedDoctorsList
            lat={address.lat}
            lng={address.lng}
            selected={medicoId}
            onSelect={setMedicoId}
          />
        </div>
        <div><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter>
        <Button disabled={!motivo || !address.direccion} onClick={() => onSubmit({
          motivo,
          direccion: address.direccion,
          lat: address.lat,
          lng: address.lng,
          accuracy_m: address.accuracy_m ?? null,
          location_source: address.location_source ?? null,
          in_coverage: address.in_coverage ?? null,
          urgencia,
          fecha_preferida: fecha ? new Date(fecha).toISOString() : null,
          notas: notas || null,
          patient_id: user?.id,
          requested_doctor_id: medicoId,
        })}>Enviar</Button>
      </DialogFooter>
    </DialogContent>
  );
}