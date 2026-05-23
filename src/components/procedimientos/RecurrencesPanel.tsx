import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Download, Pencil, Power, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProcedureRecurrences, useUpsertRecurrence, useDeleteRecurrence } from "@/hooks/useProcedureRecurrences";
import { useProcedureSessions, useUpsertSession, materializeSessions } from "@/hooks/useProcedureSessions";
import { WEEKDAYS_ES, buildRRule, describeRRule, expandRecurrence } from "@/lib/rrule";
import { downloadICS } from "@/lib/icsExport";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORIAS = [
  { value: "hemodialisis", label: "Hemodiálisis" },
  { value: "quimioterapia", label: "Quimioterapia" },
  { value: "rehabilitacion", label: "Rehabilitación" },
  { value: "dialisis_peritoneal", label: "Diálisis peritoneal" },
  { value: "infusion", label: "Infusión" },
  { value: "otro", label: "Otro" },
];

interface Props { patientId: string }

export function RecurrencesPanel({ patientId }: Props) {
  const { user } = useAuth();
  const { data: recurrences = [] } = useProcedureRecurrences(patientId);
  const { data: sessions = [], refetch: refetchSessions } = useProcedureSessions(patientId);
  const upsertRec = useUpsertRecurrence();
  const delRec = useDeleteRecurrence();
  const upsertSession = useUpsertSession();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [sessionDialog, setSessionDialog] = useState<any | null>(null);

  // materializar sesiones próximas 4 semanas
  useEffect(() => {
    if (!patientId || !user || recurrences.length === 0) return;
    materializeSessions(patientId, user.id, recurrences, expandRecurrence, 4)
      .then((n) => { if (n > 0) refetchSessions(); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, user?.id, recurrences.length]);

  const exportAllICS = () => {
    const events = recurrences.filter((r: any) => r.vigente).map((r: any) => ({
      uid: r.id,
      summary: r.nombre,
      description: r.notas ?? "",
      location: r.ubicacion ?? "",
      start: combineDateTime(r.fecha_inicio, r.hora_inicio),
      durationMin: r.duracion_min ?? 60,
      rrule: r.rrule,
    }));
    if (events.length) downloadICS("procedimientos-recurrentes", events);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-heading font-semibold">Procedimientos recurrentes</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportAllICS} disabled={!recurrences.length}>
            <Download className="h-4 w-4 mr-2" />Calendario .ics
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nueva recurrencia</Button>
            </DialogTrigger>
            <RecurrenceForm
              key={editing?.id ?? "new"}
              patientId={patientId}
              initial={editing}
              onSubmit={async (payload) => { await upsertRec.mutateAsync(payload); setOpen(false); setEditing(null); }}
            />
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {recurrences.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Sin procedimientos recurrentes. Crea uno (ej. hemodiálisis L-M-V).</CardContent></Card>
        )}
        {recurrences.map((r: any) => (
          <Card key={r.id} className={!r.vigente ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{r.nombre}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{CATEGORIAS.find((c) => c.value === r.categoria)?.label ?? r.categoria}</Badge>
                    <span>{describeRRule(r.rrule)}</span>
                    <span>· {r.hora_inicio?.slice(0, 5)} ({r.duracion_min} min)</span>
                    {r.ubicacion && <span>· {r.ubicacion}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  {r.vigente && (
                    <Button size="icon" variant="ghost" onClick={() => delRec.mutate(r.id)} title="Desactivar">
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="pt-4">
        <h3 className="text-lg font-heading font-semibold flex items-center gap-2"><Activity className="h-5 w-5" />Sesiones</h3>
        <p className="text-xs text-muted-foreground mb-3">Las próximas se generan automáticamente. Registra cómo te fue después de cada una.</p>
        <div className="grid gap-2">
          {sessions.length === 0 && (
            <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">Sin sesiones aún.</CardContent></Card>
          )}
          {sessions.slice(0, 30).map((s: any) => {
            const date = new Date(s.scheduled_at);
            const pasada = date < new Date();
            const sinReporte = pasada && !s.como_me_fue && s.status === "programada";
            return (
              <Card key={s.id}>
                <CardContent className="py-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm">
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(date, "EEE d MMM, HH:mm", { locale: es })}
                      <Badge variant={s.status === "completada" ? "default" : s.status === "cancelada" ? "destructive" : sinReporte ? "secondary" : "outline"} className="text-[10px]">
                        {sinReporte ? "Sin reporte" : s.status}
                      </Badge>
                    </div>
                    {s.como_me_fue && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.como_me_fue}</div>}
                  </div>
                  <Button size="sm" variant={sinReporte ? "default" : "outline"} onClick={() => setSessionDialog(s)}>
                    {s.como_me_fue ? "Editar" : "Registrar evolución"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!sessionDialog} onOpenChange={(o) => !o && setSessionDialog(null)}>
        {sessionDialog && (
          <SessionForm
            session={sessionDialog}
            onSubmit={async (payload) => { await upsertSession.mutateAsync({ ...payload, id: sessionDialog.id, patient_id: patientId }); setSessionDialog(null); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function combineDateTime(fecha: string, hora: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function RecurrenceForm({ patientId, initial, onSubmit }: { patientId: string; initial: any | null; onSubmit: (p: any) => Promise<void> }) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "hemodialisis");
  const [freq, setFreq] = useState<"WEEKLY" | "DAILY">("WEEKLY");
  const [byday, setByday] = useState<number[]>(initial ? parseBydayFromRule(initial.rrule) : [1, 3, 5]);
  const [hora, setHora] = useState(initial?.hora_inicio?.slice(0, 5) ?? "08:00");
  const [duracion, setDuracion] = useState<number>(initial?.duracion_min ?? 240);
  const [fechaInicio, setFechaInicio] = useState(initial?.fecha_inicio ?? new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(initial?.fecha_fin ?? "");
  const [ubicacion, setUbicacion] = useState(initial?.ubicacion ?? "");
  const [notas, setNotas] = useState(initial?.notas ?? "");

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    const rrule = buildRRule({ freq, byday: freq === "WEEKLY" ? byday : [], interval: 1 });
    await onSubmit({
      ...(initial?.id ? { id: initial.id } : {}),
      patient_id: patientId,
      nombre, categoria, rrule, hora_inicio: hora, duracion_min: duracion,
      fecha_inicio: fechaInicio, fecha_fin: fechaFin || null,
      ubicacion: ubicacion || null, notas: notas || null,
      vigente: true,
    });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Editar recurrencia" : "Nueva recurrencia"}</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Hemodiálisis" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Categoría</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Frecuencia</Label>
            <Select value={freq} onValueChange={(v: any) => setFreq(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="WEEKLY">Semanal</SelectItem><SelectItem value="DAILY">Diaria</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {freq === "WEEKLY" && (
          <div>
            <Label>Días</Label>
            <div className="flex gap-1 mt-1">
              {WEEKDAYS_ES.map((d) => {
                const on = byday.includes(d.idx);
                return (
                  <button key={d.idx} type="button"
                    onClick={() => setByday(on ? byday.filter((x) => x !== d.idx) : [...byday, d.idx])}
                    className={`h-9 w-9 rounded-full text-sm font-semibold border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Hora inicio</Label><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
          <div><Label>Duración (min)</Label><Input type="number" min={5} value={duracion} onChange={(e) => setDuracion(parseInt(e.target.value) || 0)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Fecha inicio</Label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
          <div><Label>Fecha fin (opc)</Label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
        </div>
        <div><Label>Sede / ubicación</Label><Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Clínica..." /></div>
        <div><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter><Button onClick={handleSubmit}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}

function SessionForm({ session, onSubmit }: { session: any; onSubmit: (p: any) => Promise<void> }) {
  const [status, setStatus] = useState(session.status ?? "completada");
  const [como, setComo] = useState(session.como_me_fue ?? "");
  const [sintomas, setSintomas] = useState(session.sintomas ?? "");
  const [pesoPre, setPesoPre] = useState(session.peso_pre_kg ?? "");
  const [pesoPost, setPesoPost] = useState(session.peso_post_kg ?? "");
  const [presionPre, setPresionPre] = useState(session.presion_pre ?? "");
  const [presionPost, setPresionPost] = useState(session.presion_post ?? "");
  const [complic, setComplic] = useState(session.complicaciones ?? "");

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Registrar evolución</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div><Label>Estado</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="programada">Programada</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>¿Cómo me fue?</Label><Textarea value={como} onChange={(e) => setComo(e.target.value)} rows={3} placeholder="Sentí cansancio leve, sin mareos..." /></div>
        <div><Label>Síntomas</Label><Input value={sintomas} onChange={(e) => setSintomas(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Peso pre (kg)</Label><Input type="number" step="0.1" value={pesoPre} onChange={(e) => setPesoPre(e.target.value)} /></div>
          <div><Label>Peso post (kg)</Label><Input type="number" step="0.1" value={pesoPost} onChange={(e) => setPesoPost(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>TA pre</Label><Input value={presionPre} onChange={(e) => setPresionPre(e.target.value)} placeholder="120/80" /></div>
          <div><Label>TA post</Label><Input value={presionPost} onChange={(e) => setPresionPost(e.target.value)} placeholder="115/75" /></div>
        </div>
        <div><Label>Complicaciones</Label><Textarea value={complic} onChange={(e) => setComplic(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({
          status,
          como_me_fue: como || null,
          sintomas: sintomas || null,
          peso_pre_kg: pesoPre ? Number(pesoPre) : null,
          peso_post_kg: pesoPost ? Number(pesoPost) : null,
          presion_pre: presionPre || null,
          presion_post: presionPost || null,
          complicaciones: complic || null,
        })}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function parseBydayFromRule(rrule: string): number[] {
  const m = rrule.match(/BYDAY=([^;]+)/i);
  if (!m) return [];
  const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return m[1].split(",").map((d) => map[d.toUpperCase()]).filter((n) => n !== undefined);
}