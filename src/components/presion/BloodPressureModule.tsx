import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, Download, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  classifyBP,
  useBloodPressureReadings,
  useCreateBloodPressure,
  useDeleteBloodPressure,
  useUpdateBloodPressure,
  type BloodPressureReading,
} from "@/hooks/useBloodPressure";
import { useAuth } from "@/contexts/AuthContext";
import { exportBloodPressureToCSV } from "@/lib/exportBloodPressureCSV";
import { toast } from "sonner";
import { BpRemindersCard } from "./BpRemindersCard";

interface Props {
  patientId: string;
  patientName: string;
  /** Si false oculta acciones de creación/edición/borrado. */
  canEdit?: boolean;
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 16);
}

function nowLocalInput(): string {
  return toLocalDatetimeInput(new Date().toISOString());
}

export function BloodPressureModule({ patientId, patientName, canEdit = true }: Props) {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const { data: readings = [], isLoading } = useBloodPressureReadings(patientId);
  const createMut = useCreateBloodPressure();
  const updateMut = useUpdateBloodPressure();
  const deleteMut = useDeleteBloodPressure();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BloodPressureReading | null>(null);
  const [deleting, setDeleting] = useState<BloodPressureReading | null>(null);

  // form state
  const [form, setForm] = useState({
    taken_at: nowLocalInput(),
    systolic: "",
    diastolic: "",
    pulse: "",
    position: "",
    arm: "",
    notes: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      taken_at: nowLocalInput(),
      systolic: "",
      diastolic: "",
      pulse: "",
      position: "",
      arm: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (r: BloodPressureReading) => {
    setEditing(r);
    setForm({
      taken_at: toLocalDatetimeInput(r.taken_at),
      systolic: String(r.systolic),
      diastolic: String(r.diastolic),
      pulse: r.pulse != null ? String(r.pulse) : "",
      position: r.position ?? "",
      arm: r.arm ?? "",
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    const sys = Number(form.systolic);
    const dia = Number(form.diastolic);
    const pul = form.pulse.trim() === "" ? null : Number(form.pulse);

    if (!Number.isFinite(sys) || sys < 50 || sys > 260) {
      toast.error("Sistólica debe estar entre 50 y 260 mmHg");
      return;
    }
    if (!Number.isFinite(dia) || dia < 30 || dia > 200) {
      toast.error("Diastólica debe estar entre 30 y 200 mmHg");
      return;
    }
    if (sys <= dia) {
      toast.error("La sistólica debe ser mayor que la diastólica");
      return;
    }
    if (pul != null && (!Number.isFinite(pul) || pul < 20 || pul > 250)) {
      toast.error("Pulso debe estar entre 20 y 250 lpm");
      return;
    }

    const payload = {
      patient_id: patientId,
      taken_at: new Date(form.taken_at).toISOString(),
      systolic: sys,
      diastolic: dia,
      pulse: pul,
      position: form.position.trim() || null,
      arm: form.arm.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const summary = useMemo(() => {
    if (readings.length === 0) {
      return { last: null as BloodPressureReading | null, avg7: null as { sys: number; dia: number } | null, monthCount: 0 };
    }
    const last = readings[0];
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 86400000);
    const last7 = readings.filter((r) => new Date(r.taken_at) >= sevenAgo);
    const avg7 = last7.length
      ? {
          sys: Math.round(last7.reduce((a, r) => a + r.systolic, 0) / last7.length),
          dia: Math.round(last7.reduce((a, r) => a + r.diastolic, 0) / last7.length),
        }
      : null;
    const monthCount = readings.filter((r) => {
      const d = new Date(r.taken_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { last, avg7, monthCount };
  }, [readings]);

  const chartData = useMemo(() => {
    return [...readings]
      .sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
      .map((r) => ({
        fecha: format(new Date(r.taken_at), "dd/MM HH:mm", { locale: es }),
        sistolica: r.systolic,
        diastolica: r.diastolic,
        pulso: r.pulse ?? null,
      }));
  }, [readings]);

  const handleExport = () => {
    if (readings.length === 0) {
      toast.info("No hay tomas para exportar");
      return;
    }
    const { blob, filename } = exportBloodPressureToCSV(readings, patientName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canRowEdit = (r: BloodPressureReading) =>
    canEdit && (r.created_by === user?.id || isAdmin);

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Presión arterial</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={readings.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Exportar CSV
          </Button>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva toma
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar toma" : "Nueva toma de presión"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bp-taken">Fecha y hora</Label>
                    <Input
                      id="bp-taken"
                      type="datetime-local"
                      value={form.taken_at}
                      onChange={(e) => setForm((f) => ({ ...f, taken_at: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="bp-sys">Sistólica</Label>
                      <Input
                        id="bp-sys"
                        inputMode="numeric"
                        value={form.systolic}
                        onChange={(e) => setForm((f) => ({ ...f, systolic: e.target.value }))}
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bp-dia">Diastólica</Label>
                      <Input
                        id="bp-dia"
                        inputMode="numeric"
                        value={form.diastolic}
                        onChange={(e) => setForm((f) => ({ ...f, diastolic: e.target.value }))}
                        placeholder="80"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bp-pul">Pulso</Label>
                      <Input
                        id="bp-pul"
                        inputMode="numeric"
                        value={form.pulse}
                        onChange={(e) => setForm((f) => ({ ...f, pulse: e.target.value }))}
                        placeholder="72"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="bp-pos">Posición</Label>
                      <Select
                        value={form.position || "_none"}
                        onValueChange={(v) => setForm((f) => ({ ...f, position: v === "_none" ? "" : v }))}
                      >
                        <SelectTrigger id="bp-pos">
                          <SelectValue placeholder="Posición" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Sin especificar —</SelectItem>
                          <SelectItem value="sentado">Sentado</SelectItem>
                          <SelectItem value="parado">Parado</SelectItem>
                          <SelectItem value="acostado">Acostado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bp-arm">Brazo</Label>
                      <Select
                        value={form.arm || "_none"}
                        onValueChange={(v) => setForm((f) => ({ ...f, arm: v === "_none" ? "" : v }))}
                      >
                        <SelectTrigger id="bp-arm">
                          <SelectValue placeholder="Brazo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Sin especificar —</SelectItem>
                          <SelectItem value="izquierdo">Izquierdo</SelectItem>
                          <SelectItem value="derecho">Derecho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bp-notes">Notas</Label>
                    <Textarea
                      id="bp-notes"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Observaciones, contexto…"
                      maxLength={500}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
                    {editing ? "Guardar" : "Registrar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Última toma</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.last ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold">
                  {summary.last.systolic}/{summary.last.diastolic}
                </span>
                <span className="text-xs text-muted-foreground">mmHg</span>
                <Badge className={classifyBP(summary.last.systolic, summary.last.diastolic).className}>
                  {classifyBP(summary.last.systolic, summary.last.diastolic).label}
                </Badge>
                <p className="text-xs text-muted-foreground w-full">
                  {format(new Date(summary.last.taken_at), "PPp", { locale: es })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin tomas</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Promedio últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.avg7 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {summary.avg7.sys}/{summary.avg7.dia}
                </span>
                <span className="text-xs text-muted-foreground">mmHg</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Tomas este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.monthCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolución</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin tomas registradas todavía.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pulso" fill="hsl(var(--muted-foreground))" name="Pulso" opacity={0.4} />
                  <Line
                    type="monotone"
                    dataKey="sistolica"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    name="Sistólica"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolica"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Diastólica"
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Cargando…</p>
          ) : readings.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Sin tomas registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Sis</TableHead>
                  <TableHead className="text-right">Dia</TableHead>
                  <TableHead className="text-right">FC</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Notas</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((r) => {
                  const cat = classifyBP(r.systolic, r.diastolic);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {format(new Date(r.taken_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right font-medium">{r.systolic}</TableCell>
                      <TableCell className="text-right font-medium">{r.diastolic}</TableCell>
                      <TableCell className="text-right">{r.pulse ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={cat.className}>{cat.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.notes ?? ""}
                      </TableCell>
                      <TableCell>
                        {canRowEdit(r) && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => setDeleting(r)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar toma</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de presión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await deleteMut.mutateAsync({ id: deleting.id, patient_id: deleting.patient_id });
                  setDeleting(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}