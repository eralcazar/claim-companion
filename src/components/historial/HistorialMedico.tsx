import { useState } from "react";
import {
  useConditions, useUpsertCondition, useDeleteCondition,
  useFamilyHistory, useUpsertFamily, useDeleteFamily,
  useAllergies, useUpsertAllergy, useDeleteAllergy,
  useLifestyle, useUpsertLifestyle,
  type MHCondition, type MHFamily, type MHAllergy, type MHLifestyle, type MHVaccine,
} from "@/hooks/useMedicalHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, AlertTriangle, HeartPulse, Users, Activity, Syringe } from "lucide-react";

interface Props {
  patientId: string;
  canEdit?: boolean;
}

export function HistorialMedico({ patientId, canEdit = true }: Props) {
  return (
    <Tabs defaultValue="personales" className="w-full">
      <TabsList className="grid grid-cols-4 w-full h-auto gap-1">
        <TabsTrigger value="personales" className="gap-1.5 flex-col sm:flex-row py-2 text-xs sm:text-sm">
          <HeartPulse className="h-4 w-4" /><span className="truncate">Personales</span>
        </TabsTrigger>
        <TabsTrigger value="familiares" className="gap-1.5 flex-col sm:flex-row py-2 text-xs sm:text-sm">
          <Users className="h-4 w-4" /><span className="truncate">Familiares</span>
        </TabsTrigger>
        <TabsTrigger value="alergias" className="gap-1.5 flex-col sm:flex-row py-2 text-xs sm:text-sm">
          <AlertTriangle className="h-4 w-4" /><span className="truncate">Alergias</span>
        </TabsTrigger>
        <TabsTrigger value="estilo" className="gap-1.5 flex-col sm:flex-row py-2 text-xs sm:text-sm">
          <Activity className="h-4 w-4" /><span className="truncate">Estilo de vida</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="personales" className="mt-4"><ConditionsSection patientId={patientId} canEdit={canEdit} /></TabsContent>
      <TabsContent value="familiares" className="mt-4"><FamilySection patientId={patientId} canEdit={canEdit} /></TabsContent>
      <TabsContent value="alergias" className="mt-4"><AllergiesSection patientId={patientId} canEdit={canEdit} /></TabsContent>
      <TabsContent value="estilo" className="mt-4"><LifestyleSection patientId={patientId} canEdit={canEdit} /></TabsContent>
    </Tabs>
  );
}

// ============ Conditions ============
function ConditionsSection({ patientId, canEdit }: Props) {
  const { data = [], isLoading } = useConditions(patientId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MHCondition | null>(null);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Antecedentes personales</CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">Sin registros.</p>}
        {data.map((c) => (
          <div key={c.id} className="flex items-start justify-between border rounded-lg p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{c.nombre}</span>
                <Badge variant="outline">{tipoLabel(c.tipo)}</Badge>
                <Badge className={estadoClass(c.estado)}>{estadoLabel(c.estado)}</Badge>
                {c.diagnosticado_en && <span className="text-xs text-muted-foreground">Desde {c.diagnosticado_en}</span>}
              </div>
              {c.notas && <p className="text-sm text-muted-foreground">{c.notas}</p>}
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <DeleteBtn onConfirm={() => useDeleteConditionWrapper(c.id, patientId)} />
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <ConditionDialog open={open} onOpenChange={setOpen} patientId={patientId} editing={editing} />
    </Card>
  );
}

function useDeleteConditionWrapper(id: string, patient_id: string) {
  // helper bridging delete hook call inside event handler
  const m = useDeleteCondition();
  m.mutate({ id, patient_id });
}

function ConditionDialog({ open, onOpenChange, patientId, editing }: { open: boolean; onOpenChange: (v: boolean) => void; patientId: string; editing: MHCondition | null }) {
  const upsert = useUpsertCondition();
  const [form, setForm] = useState<Partial<MHCondition>>({});
  // reset when opening
  useStateOnOpen(open, () => setForm(editing ?? { tipo: "cronica", estado: "activa", nombre: "" }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} antecedente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Diabetes tipo 2, apendicectomía…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo ?? "cronica"} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cronica">Crónica</SelectItem>
                  <SelectItem value="cirugia">Cirugía</SelectItem>
                  <SelectItem value="hospitalizacion">Hospitalización</SelectItem>
                  <SelectItem value="otra">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado ?? "activa"} onValueChange={(v) => setForm({ ...form, estado: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="en_control">En control</SelectItem>
                  <SelectItem value="resuelta">Resuelta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Fecha de diagnóstico</Label>
            <Input type="date" value={form.diagnosticado_en ?? ""} onChange={(e) => setForm({ ...form, diagnosticado_en: e.target.value || null })} />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!form.nombre || upsert.isPending}
            onClick={async () => {
              await upsert.mutateAsync({ ...form, patient_id: patientId } as any);
              onOpenChange(false);
            }}
          >Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Family ============
function FamilySection({ patientId, canEdit }: Props) {
  const { data = [], isLoading } = useFamilyHistory(patientId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MHFamily | null>(null);
  const grouped = data.reduce<Record<string, MHFamily[]>>((acc, f) => {
    (acc[f.parentesco] ??= []).push(f); return acc;
  }, {});
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Antecedentes familiares</CardTitle>
        {canEdit && <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>}
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">Sin registros.</p>}
        <Accordion type="multiple" className="w-full">
          {Object.entries(grouped).map(([par, items]) => (
            <AccordionItem key={par} value={par}>
              <AccordionTrigger>{parentescoLabel(par as any)} <Badge variant="secondary" className="ml-2">{items.length}</Badge></AccordionTrigger>
              <AccordionContent className="space-y-2">
                {items.map((f) => (
                  <div key={f.id} className="flex items-start justify-between border rounded-lg p-3">
                    <div>
                      <div className="font-medium">{f.condicion}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        {f.edad_diagnostico != null && <span>Dx a los {f.edad_diagnostico} años</span>}
                        <span>{f.vive ? "Vive" : "Finado"}</span>
                      </div>
                      {f.notas && <p className="text-sm text-muted-foreground mt-1">{f.notas}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <DeleteFamilyBtn id={f.id} patientId={patientId} />
                      </div>
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <FamilyDialog open={open} onOpenChange={setOpen} patientId={patientId} editing={editing} />
    </Card>
  );
}

function DeleteFamilyBtn({ id, patientId }: { id: string; patientId: string }) {
  const del = useDeleteFamily();
  return <Button size="icon" variant="ghost" onClick={() => { if (confirm("¿Eliminar?")) del.mutate({ id, patient_id: patientId }); }}><Trash2 className="h-4 w-4" /></Button>;
}

function FamilyDialog({ open, onOpenChange, patientId, editing }: { open: boolean; onOpenChange: (v: boolean) => void; patientId: string; editing: MHFamily | null }) {
  const upsert = useUpsertFamily();
  const [form, setForm] = useState<Partial<MHFamily>>({});
  useStateOnOpen(open, () => setForm(editing ?? { parentesco: "padre", condicion: "", vive: true }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} antecedente familiar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Parentesco</Label>
            <Select value={form.parentesco ?? "padre"} onValueChange={(v) => setForm({ ...form, parentesco: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["padre","madre","hermano","hermana","abuelo_paterno","abuela_paterna","abuelo_materno","abuela_materna","tio","tia","otro"] as const).map(p => (
                  <SelectItem key={p} value={p}>{parentescoLabel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condición / Enfermedad</Label>
            <Input value={form.condicion ?? ""} onChange={(e) => setForm({ ...form, condicion: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Edad de diagnóstico</Label>
              <Input type="number" min={0} max={130} value={form.edad_diagnostico ?? ""} onChange={(e) => setForm({ ...form, edad_diagnostico: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={form.vive ?? true} onCheckedChange={(v) => setForm({ ...form, vive: v })} />
              <span className="text-sm">{form.vive ?? true ? "Vive" : "Finado"}</span>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!form.condicion || upsert.isPending} onClick={async () => { await upsert.mutateAsync({ ...form, patient_id: patientId } as any); onOpenChange(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Allergies ============
function AllergiesSection({ patientId, canEdit }: Props) {
  const { data = [], isLoading } = useAllergies(patientId);
  const del = useDeleteAllergy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MHAllergy | null>(null);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Alergias e intolerancias</CardTitle>
        {canEdit && <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>}
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">Sin alergias registradas.</p>}
        {data.map((a) => (
          <div key={a.id} className="border rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{a.sustancia}</div>
                <div className="text-xs text-muted-foreground">{tipoAlergiaLabel(a.tipo)}</div>
              </div>
              <Badge className={severidadClass(a.severidad)}>{severidadLabel(a.severidad)}</Badge>
            </div>
            {a.reaccion && <p className="text-sm mt-2"><span className="text-muted-foreground">Reacción: </span>{a.reaccion}</p>}
            {a.notas && <p className="text-sm text-muted-foreground mt-1">{a.notas}</p>}
            {canEdit && (
              <div className="flex gap-1 justify-end mt-2">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("¿Eliminar?")) del.mutate({ id: a.id, patient_id: patientId }); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <AllergyDialog open={open} onOpenChange={setOpen} patientId={patientId} editing={editing} />
    </Card>
  );
}

function AllergyDialog({ open, onOpenChange, patientId, editing }: { open: boolean; onOpenChange: (v: boolean) => void; patientId: string; editing: MHAllergy | null }) {
  const upsert = useUpsertAllergy();
  const [form, setForm] = useState<Partial<MHAllergy>>({});
  useStateOnOpen(open, () => setForm(editing ?? { tipo: "medicamento", severidad: "leve", sustancia: "" }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar" : "Nueva"} alergia</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Sustancia</Label>
            <Input value={form.sustancia ?? ""} onChange={(e) => setForm({ ...form, sustancia: e.target.value })} placeholder="Penicilina, mariscos, polen…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo ?? "medicamento"} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicamento">Medicamento</SelectItem>
                  <SelectItem value="alimento">Alimento</SelectItem>
                  <SelectItem value="ambiental">Ambiental</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severidad</Label>
              <Select value={form.severidad ?? "leve"} onValueChange={(v) => setForm({ ...form, severidad: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="severa">Severa</SelectItem>
                  <SelectItem value="anafilaxia">Anafilaxia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Reacción</Label>
            <Input value={form.reaccion ?? ""} onChange={(e) => setForm({ ...form, reaccion: e.target.value })} placeholder="Urticaria, dificultad para respirar…" />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!form.sustancia || upsert.isPending} onClick={async () => { await upsert.mutateAsync({ ...form, patient_id: patientId } as any); onOpenChange(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Lifestyle ============
function LifestyleSection({ patientId, canEdit }: Props) {
  const { data, isLoading } = useLifestyle(patientId);
  const upsert = useUpsertLifestyle();
  const [form, setForm] = useState<Partial<MHLifestyle>>({});
  const [newVac, setNewVac] = useState<MHVaccine>({ nombre: "", fecha: "" });
  useStateOnOpen(true, () => { /* init once */ });
  // sync when data loads
  if (data && Object.keys(form).length === 0) {
    setForm({ ...data, vacunas: data.vacunas ?? [] });
  } else if (!data && !isLoading && Object.keys(form).length === 0) {
    setForm({ tabaco: "nunca", alcohol: "nunca", ejercicio: "sedentario", vacunas: [] });
  }

  const vacunas: MHVaccine[] = (form.vacunas as MHVaccine[]) ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Estilo de vida y vacunas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tabaco</Label>
            <Select disabled={!canEdit} value={form.tabaco ?? "nunca"} onValueChange={(v) => setForm({ ...form, tabaco: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nunca">Nunca</SelectItem>
                <SelectItem value="exfumador">Exfumador</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
              </SelectContent>
            </Select>
            {form.tabaco === "activo" && (
              <Input disabled={!canEdit} type="number" min={0} placeholder="Cigarros/día" value={form.tabaco_cantidad_dia ?? ""} onChange={(e) => setForm({ ...form, tabaco_cantidad_dia: e.target.value ? Number(e.target.value) : null })} />
            )}
          </div>
          <div className="space-y-2">
            <Label>Alcohol</Label>
            <Select disabled={!canEdit} value={form.alcohol ?? "nunca"} onValueChange={(v) => setForm({ ...form, alcohol: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nunca">Nunca</SelectItem>
                <SelectItem value="ocasional">Ocasional</SelectItem>
                <SelectItem value="frecuente">Frecuente</SelectItem>
              </SelectContent>
            </Select>
            {form.alcohol !== "nunca" && (
              <Input disabled={!canEdit} type="number" min={0} placeholder="Unidades/semana" value={form.alcohol_unidades_semana ?? ""} onChange={(e) => setForm({ ...form, alcohol_unidades_semana: e.target.value ? Number(e.target.value) : null })} />
            )}
          </div>
          <div className="space-y-2">
            <Label>Ejercicio</Label>
            <Select disabled={!canEdit} value={form.ejercicio ?? "sedentario"} onValueChange={(v) => setForm({ ...form, ejercicio: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentario">Sedentario</SelectItem>
                <SelectItem value="ligero">Ligero</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="intenso">Intenso</SelectItem>
              </SelectContent>
            </Select>
            <Input disabled={!canEdit} type="number" min={0} placeholder="Minutos/semana" value={form.ejercicio_minutos_semana ?? ""} onChange={(e) => setForm({ ...form, ejercicio_minutos_semana: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>

        <div>
          <Label>Notas</Label>
          <Textarea disabled={!canEdit} value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" /><Label>Vacunas</Label></div>
          <div className="space-y-1">
            {vacunas.length === 0 && <p className="text-sm text-muted-foreground">Sin vacunas registradas.</p>}
            {vacunas.map((v, i) => (
              <div key={i} className="flex items-center gap-2 border rounded-md px-3 py-1.5">
                <span className="flex-1 text-sm">{v.nombre}</span>
                {v.fecha && <span className="text-xs text-muted-foreground">{v.fecha}</span>}
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, vacunas: vacunas.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Input placeholder="Nombre vacuna" value={newVac.nombre} onChange={(e) => setNewVac({ ...newVac, nombre: e.target.value })} />
              <Input type="date" value={newVac.fecha ?? ""} onChange={(e) => setNewVac({ ...newVac, fecha: e.target.value })} />
              <Button variant="secondary" disabled={!newVac.nombre} onClick={() => { setForm({ ...form, vacunas: [...vacunas, newVac] }); setNewVac({ nombre: "", fecha: "" }); }}>Agregar</Button>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button disabled={upsert.isPending} onClick={() => upsert.mutate({ ...form, patient_id: patientId } as any)}>Guardar cambios</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ helpers ============
function useStateOnOpen(open: boolean, fn: () => void) {
  // run side-effect when `open` flips to true
  const [last, setLast] = useState(false);
  if (open && !last) { setLast(true); fn(); }
  if (!open && last) { setLast(false); }
}

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  return <Button size="icon" variant="ghost" onClick={() => { if (confirm("¿Eliminar?")) onConfirm(); }}><Trash2 className="h-4 w-4" /></Button>;
}

function tipoLabel(t: MHCondition["tipo"]) {
  return { cronica: "Crónica", cirugia: "Cirugía", hospitalizacion: "Hospitalización", otra: "Otra" }[t];
}
function estadoLabel(e: MHCondition["estado"]) {
  return { activa: "Activa", resuelta: "Resuelta", en_control: "En control" }[e];
}
function estadoClass(e: MHCondition["estado"]) {
  return e === "activa" ? "bg-warning text-warning-foreground"
    : e === "en_control" ? "bg-primary/15 text-primary"
    : "bg-success/15 text-success";
}
function parentescoLabel(p: MHFamily["parentesco"]) {
  return ({
    padre: "Padre", madre: "Madre", hermano: "Hermano", hermana: "Hermana",
    abuelo_paterno: "Abuelo paterno", abuela_paterna: "Abuela paterna",
    abuelo_materno: "Abuelo materno", abuela_materna: "Abuela materna",
    tio: "Tío", tia: "Tía", otro: "Otro",
  })[p];
}
function tipoAlergiaLabel(t: MHAllergy["tipo"]) {
  return { medicamento: "Medicamento", alimento: "Alimento", ambiental: "Ambiental", otro: "Otro" }[t];
}
function severidadLabel(s: MHAllergy["severidad"]) {
  return { leve: "Leve", moderada: "Moderada", severa: "Severa", anafilaxia: "Anafilaxia" }[s];
}
function severidadClass(s: MHAllergy["severidad"]) {
  return s === "leve" ? "bg-success/15 text-success"
    : s === "moderada" ? "bg-warning text-warning-foreground"
    : s === "severa" ? "bg-destructive/70 text-destructive-foreground"
    : "bg-destructive text-destructive-foreground";
}