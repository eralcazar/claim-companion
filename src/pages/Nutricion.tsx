import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignedPatients } from "@/hooks/usePatientPersonnel";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Download, Apple } from "lucide-react";
import {
  classifyIMC,
  useNutritionMetrics, useCreateNutritionMetric, useUpdateNutritionMetric, useDeleteNutritionMetric,
  useFoodTraffic, useCreateFoodTraffic, useUpdateFoodTraffic, useDeleteFoodTraffic,
  type NutritionMetric, type FoodTrafficItem,
} from "@/hooks/useNutrition";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const COLOR_META: Record<FoodTrafficItem["color"], { label: string; cls: string; chip: string }> = {
  verde: { label: "Verde — consumo libre", cls: "border-success/30 bg-success/10", chip: "bg-success/20 text-success" },
  amarillo: { label: "Amarillo — moderar", cls: "border-warning/30 bg-warning/10", chip: "bg-warning/20 text-warning-foreground" },
  rojo: { label: "Rojo — evitar", cls: "border-destructive/30 bg-destructive/10", chip: "bg-destructive/20 text-destructive" },
};

function num(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function exportMetricsCSV(metrics: NutritionMetric[], patientName: string) {
  const headers = [
    "fecha", "peso_kg", "peso_seco_kg", "talla_cm", "imc",
    "masa_muscular_kg", "grasa_corporal_pct", "agua_corporal_pct",
    "cintura_cm", "cadera_cm", "notas",
  ];
  const rows = metrics.map((m) => [
    format(parseISO(m.recorded_at), "yyyy-MM-dd HH:mm"),
    m.peso_kg ?? "", m.peso_seco_kg ?? "", m.talla_cm ?? "", m.imc ?? "",
    m.masa_muscular_kg ?? "", m.grasa_corporal_pct ?? "", m.agua_corporal_pct ?? "",
    m.cintura_cm ?? "", m.cadera_cm ?? "",
    (m.notas ?? "").replace(/\n/g, " ").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c)}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nutricion_${patientName}_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============ Métricas Tab ============
function MetricsTab({ patientId, canEditAll }: { patientId: string; canEditAll: boolean }) {
  const { user } = useAuth();
  const { data: metrics = [], isLoading } = useNutritionMetrics(patientId);
  const createM = useCreateNutritionMetric();
  const updateM = useUpdateNutritionMetric();
  const deleteM = useDeleteNutritionMetric();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NutritionMetric | null>(null);

  const latest = metrics[0];
  const imcCat = latest ? classifyIMC(latest.imc) : null;

  const monthCount = useMemo(() => {
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);
    return metrics.filter((m) => new Date(m.recorded_at) >= start).length;
  }, [metrics]);

  const chartData = useMemo(() => {
    return [...metrics]
      .filter((m) => m.peso_kg != null || m.imc != null)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((m) => ({
        fecha: format(parseISO(m.recorded_at), "dd MMM", { locale: es }),
        Peso: m.peso_kg,
        IMC: m.imc,
      }));
  }, [metrics]);

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(m: NutritionMetric) { setEditing(m); setDialogOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nueva medición
          </Button>
          <Button onClick={() => exportMetricsCSV(metrics, "paciente")} size="sm" variant="outline" disabled={metrics.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{metrics.length} mediciones registradas</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Último peso</p>
            <p className="text-2xl font-bold">{latest?.peso_kg != null ? `${latest.peso_kg} kg` : "—"}</p>
            {latest && <p className="text-xs text-muted-foreground mt-1">{format(parseISO(latest.recorded_at), "dd MMM yyyy", { locale: es })}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Último IMC</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{latest?.imc ?? "—"}</p>
              {imcCat && <Badge className={imcCat.className}>{imcCat.label}</Badge>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mediciones este mes</p>
            <p className="text-2xl font-bold">{monthCount}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolución</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="fecha" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="IMC" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
          ) : metrics.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Sin mediciones todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Peso</th>
                    <th className="p-2">IMC</th>
                    <th className="p-2">% Grasa</th>
                    <th className="p-2">Cintura</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => {
                    const cat = classifyIMC(m.imc);
                    const canEdit = canEditAll || m.created_by === user?.id;
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="p-2 whitespace-nowrap">{format(parseISO(m.recorded_at), "dd MMM yyyy HH:mm", { locale: es })}</td>
                        <td className="p-2">{m.peso_kg ?? "—"}</td>
                        <td className="p-2">
                          <span className="inline-flex items-center gap-1">
                            {m.imc ?? "—"}
                            {cat && <Badge className={cn("text-[10px] px-1.5 py-0", cat.className)}>{cat.label}</Badge>}
                          </span>
                        </td>
                        <td className="p-2">{m.grasa_corporal_pct ?? "—"}</td>
                        <td className="p-2">{m.cintura_cm ?? "—"}</td>
                        <td className="p-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => {
                                if (confirm("¿Eliminar esta medición?")) deleteM.mutate(m.id);
                              }}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MetricDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        patientId={patientId}
        onSubmit={async (input) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, patch: input });
          else await createM.mutateAsync({ ...input, patient_id: patientId });
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function MetricDialog({
  open, onOpenChange, editing, patientId, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: NutritionMetric | null; patientId: string;
  onSubmit: (input: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    recorded_at: "", peso_kg: "", peso_seco_kg: "", talla_cm: "",
    grasa_corporal_pct: "", agua_corporal_pct: "", masa_muscular_kg: "",
    cintura_cm: "", cadera_cm: "", notas: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        recorded_at: editing?.recorded_at
          ? format(parseISO(editing.recorded_at), "yyyy-MM-dd'T'HH:mm")
          : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        peso_kg: editing?.peso_kg?.toString() ?? "",
        peso_seco_kg: editing?.peso_seco_kg?.toString() ?? "",
        talla_cm: editing?.talla_cm?.toString() ?? "",
        grasa_corporal_pct: editing?.grasa_corporal_pct?.toString() ?? "",
        agua_corporal_pct: editing?.agua_corporal_pct?.toString() ?? "",
        masa_muscular_kg: editing?.masa_muscular_kg?.toString() ?? "",
        cintura_cm: editing?.cintura_cm?.toString() ?? "",
        cadera_cm: editing?.cadera_cm?.toString() ?? "",
        notas: editing?.notas ?? "",
      });
    }
  }, [open, editing]);

  async function submit() {
    await onSubmit({
      recorded_at: new Date(form.recorded_at).toISOString(),
      peso_kg: num(form.peso_kg),
      peso_seco_kg: num(form.peso_seco_kg),
      talla_cm: num(form.talla_cm),
      grasa_corporal_pct: num(form.grasa_corporal_pct),
      agua_corporal_pct: num(form.agua_corporal_pct),
      masa_muscular_kg: num(form.masa_muscular_kg),
      cintura_cm: num(form.cintura_cm),
      cadera_cm: num(form.cadera_cm),
      notas: form.notas || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Editar medición" : "Nueva medición"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Fecha y hora</Label>
            <Input type="datetime-local" value={form.recorded_at} onChange={(e) => setForm({ ...form, recorded_at: e.target.value })} />
          </div>
          <div><Label>Peso (kg)</Label><Input type="number" step="0.01" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} /></div>
          <div><Label>Peso seco (kg)</Label><Input type="number" step="0.01" value={form.peso_seco_kg} onChange={(e) => setForm({ ...form, peso_seco_kg: e.target.value })} /></div>
          <div><Label>Talla (cm)</Label><Input type="number" step="0.1" value={form.talla_cm} onChange={(e) => setForm({ ...form, talla_cm: e.target.value })} /></div>
          <div><Label>% Grasa</Label><Input type="number" step="0.1" value={form.grasa_corporal_pct} onChange={(e) => setForm({ ...form, grasa_corporal_pct: e.target.value })} /></div>
          <div><Label>% Agua</Label><Input type="number" step="0.1" value={form.agua_corporal_pct} onChange={(e) => setForm({ ...form, agua_corporal_pct: e.target.value })} /></div>
          <div><Label>Masa muscular (kg)</Label><Input type="number" step="0.01" value={form.masa_muscular_kg} onChange={(e) => setForm({ ...form, masa_muscular_kg: e.target.value })} /></div>
          <div><Label>Cintura (cm)</Label><Input type="number" step="0.1" value={form.cintura_cm} onChange={(e) => setForm({ ...form, cintura_cm: e.target.value })} /></div>
          <div><Label>Cadera (cm)</Label><Input type="number" step="0.1" value={form.cadera_cm} onChange={(e) => setForm({ ...form, cadera_cm: e.target.value })} /></div>
          <div className="col-span-2"><Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{editing ? "Guardar" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Semáforo Tab ============
function FoodTrafficTab({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useFoodTraffic(patientId);
  const createI = useCreateFoodTraffic();
  const updateI = useUpdateFoodTraffic();
  const deleteI = useDeleteFoodTraffic();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FoodTrafficItem | null>(null);

  const grouped = useMemo(() => {
    const g: Record<FoodTrafficItem["color"], FoodTrafficItem[]> = { verde: [], amarillo: [], rojo: [] };
    for (const it of items) g[it.color]?.push(it);
    return g;
  }, [items]);

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(it: FoodTrafficItem) { setEditing(it); setDialogOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Catálogo global + personalizado del paciente.</p>
        {canEdit && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Agregar alimento</Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
          <Apple className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Aún no hay alimentos en el semáforo.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(["verde", "amarillo", "rojo"] as const).map((color) => {
            const list = grouped[color];
            if (list.length === 0) return null;
            const meta = COLOR_META[color];
            return (
              <Card key={color} className={cn("border-2", meta.cls)}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{meta.label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {list.map((it) => {
                      const canRow = canEdit && (it.created_by === user?.id);
                      return (
                        <div key={it.id} className="rounded-lg bg-background/60 p-3 border border-border">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{it.alimento}</p>
                              {it.grupo && <p className="text-xs text-muted-foreground">{it.grupo}</p>}
                              {it.patient_id == null && <Badge variant="outline" className="mt-1 text-[10px]">Global</Badge>}
                            </div>
                            {canRow && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => {
                                  if (confirm("¿Eliminar este alimento?")) deleteI.mutate(it.id);
                                }}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            )}
                          </div>
                          {it.notas && <p className="text-xs text-muted-foreground mt-1">{it.notas}</p>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FoodTrafficDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        patientId={patientId}
        onSubmit={async (input) => {
          if (editing) await updateI.mutateAsync({ id: editing.id, patch: input });
          else await createI.mutateAsync(input);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function FoodTrafficDialog({
  open, onOpenChange, editing, patientId, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: FoodTrafficItem | null; patientId: string;
  onSubmit: (input: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    alimento: "", grupo: "", color: "verde" as FoodTrafficItem["color"],
    notas: "", scope: "global" as "global" | "patient",
  });

  useEffect(() => {
    if (open) {
      setForm({
        alimento: editing?.alimento ?? "",
        grupo: editing?.grupo ?? "",
        color: editing?.color ?? "verde",
        notas: editing?.notas ?? "",
        scope: editing?.patient_id ? "patient" : "global",
      });
    }
  }, [open, editing]);

  async function submit() {
    if (!form.alimento.trim()) return;
    await onSubmit({
      alimento: form.alimento.trim(),
      grupo: form.grupo.trim() || null,
      color: form.color,
      notas: form.notas.trim() || null,
      patient_id: form.scope === "patient" ? patientId : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Editar alimento" : "Agregar alimento"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Alimento</Label>
            <Input value={form.alimento} onChange={(e) => setForm({ ...form, alimento: e.target.value })} placeholder="Manzana, refresco…" />
          </div>
          <div><Label>Grupo (opcional)</Label>
            <Input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} placeholder="Frutas, bebidas…" />
          </div>
          <div><Label>Color del semáforo</Label>
            <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verde">Verde — consumo libre</SelectItem>
                <SelectItem value="amarillo">Amarillo — moderar</SelectItem>
                <SelectItem value="rojo">Rojo — evitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Alcance</Label>
            <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (catálogo)</SelectItem>
                <SelectItem value="patient">Solo este paciente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas (opcional)</Label>
            <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{editing ? "Guardar" : "Agregar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Page ============
export default function Nutricion() {
  const { user, roles } = useAuth();
  const [searchParams] = useSearchParams();
  const isPatient = roles.includes("paciente");
  const isPersonnel =
    roles.includes("medico") || roles.includes("enfermero") ||
    roles.includes("nutricionista") || roles.includes("admin") || roles.includes("broker");
  const canEditFood = roles.includes("nutricionista") || roles.includes("admin");
  const canEditAllMetrics = roles.includes("admin");

  const { data: assigned = [] } = useAssignedPatients();

  const patientOptions = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    if (isPatient && user) items.push({ id: user.id, name: "Yo (mis registros)" });
    for (const a of assigned) {
      if (!items.some((it) => it.id === a.patient_id)) {
        items.push({ id: a.patient_id, name: a.patient_name ?? "Paciente" });
      }
    }
    return items;
  }, [isPatient, user, assigned]);

  const initial = searchParams.get("paciente") ||
    (isPatient ? user?.id : patientOptions[0]?.id) || user?.id || "";
  const [selectedPatient, setSelectedPatient] = useState<string>(initial);

  useEffect(() => {
    if (!selectedPatient && patientOptions.length > 0) {
      setSelectedPatient(patientOptions[0].id);
    }
  }, [patientOptions, selectedPatient]);

  const showSelector = isPersonnel && patientOptions.length > 1;

  if (!selectedPatient) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto pb-12">
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No tienes pacientes asignados todavía.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Apple className="h-6 w-6 text-primary" /> Nutrición
          </h1>
          <p className="text-sm text-muted-foreground">Métricas corporales y semáforo de alimentos.</p>
        </div>
        {showSelector && (
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {patientOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="metricas">
        <TabsList>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="semaforo">Semáforo de alimentos</TabsTrigger>
        </TabsList>
        <TabsContent value="metricas" className="mt-4">
          <MetricsTab patientId={selectedPatient} canEditAll={canEditAllMetrics} />
        </TabsContent>
        <TabsContent value="semaforo" className="mt-4">
          <FoodTrafficTab patientId={selectedPatient} canEdit={canEditFood} />
        </TabsContent>
      </Tabs>
    </div>
  );
}