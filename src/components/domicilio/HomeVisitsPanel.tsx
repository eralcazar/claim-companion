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
import { Home, MapPin, Plus, Clock } from "lucide-react";
import { useHomeVisits, useCreateHomeVisit, useUpdateHomeVisit } from "@/hooks/useHomeVisits";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AddressPicker, MiniMap, type AddressValue } from "./AddressPicker";

const URGENCIAS = [
  { value: "baja", label: "Baja", color: "secondary" as const },
  { value: "media", label: "Media", color: "default" as const },
  { value: "alta", label: "Alta", color: "destructive" as const },
];
const ESTADOS = ["pendiente", "aceptada", "en_camino", "completada", "cancelada"];

interface Props { mode: "paciente" | "medico"; userId: string }

export function HomeVisitsPanel({ mode, userId }: Props) {
  const { data: visits = [] } = useHomeVisits(mode === "paciente" ? { patientId: userId } : { soloPendientes: false });
  const create = useCreateHomeVisit();
  const update = useUpdateHomeVisit();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold flex items-center gap-2"><Home className="h-5 w-5" />
          {mode === "paciente" ? "Médico a domicilio" : "Solicitudes a domicilio"}
        </h3>
        {mode === "paciente" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Solicitar</Button></DialogTrigger>
            <RequestForm onSubmit={async (p) => { await create.mutateAsync(p); setOpen(false); }} />
          </Dialog>
        )}
      </div>

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
              {mode === "medico" && (
                <CardContent className="pt-0 flex gap-2 flex-wrap">
                  <Select value={v.estado} onValueChange={(estado) => update.mutate({ id: v.id, estado, doctor_id: userId })}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RequestForm({ onSubmit }: { onSubmit: (p: any) => Promise<void> }) {
  const { user } = useAuth();
  const [motivo, setMotivo] = useState("");
  const [address, setAddress] = useState<AddressValue>({ direccion: "", lat: null, lng: null });
  const [urgencia, setUrgencia] = useState("media");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
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
        <div><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter>
        <Button disabled={!motivo || !address.direccion} onClick={() => onSubmit({
          motivo,
          direccion: address.direccion,
          lat: address.lat,
          lng: address.lng,
          urgencia,
          fecha_preferida: fecha ? new Date(fecha).toISOString() : null,
          notas: notas || null,
          patient_id: user?.id,
        })}>Enviar</Button>
      </DialogFooter>
    </DialogContent>
  );
}