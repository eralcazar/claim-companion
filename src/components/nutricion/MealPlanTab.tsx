import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Download, FileText } from "lucide-react";
import {
  DIAS, MOMENTO_LABEL, type Momento, type MealPlan, type MealPlanItem,
  useMealPlans, useMealPlanItems, useCreateMealPlan, useUpdateMealPlan, useDeleteMealPlan,
  useUpsertMealPlanItem, useDeleteMealPlanItem, useDuplicateWeek,
} from "@/hooks/useMealPlan";
import { exportMealPlanPdf } from "./MealPlanPdfExport";

const MOMENTOS: Momento[] = ["desayuno", "colacion_am", "comida", "colacion_pm", "cena"];

export function MealPlanTab({ patientId, patientName, canEdit }: { patientId: string; patientName: string; canEdit: boolean }) {
  const { data: plans = [] } = useMealPlans(patientId);
  const createPlan = useCreateMealPlan();
  const updatePlan = useUpdateMealPlan();
  const deletePlan = useDeleteMealPlan();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activePlan = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;
  const planId = activePlan?.id;

  const { data: items = [] } = useMealPlanItems(planId);
  const upsertItem = useUpsertMealPlanItem();
  const deleteItem = useDeleteMealPlanItem();
  const duplicateWeek = useDuplicateWeek();

  const [planDialog, setPlanDialog] = useState<null | Partial<MealPlan>>(null);
  const [cellDialog, setCellDialog] = useState<null | { dia: number; momento: Momento; item?: MealPlanItem }>(null);

  const grid = useMemo(() => {
    const m = new Map<string, MealPlanItem[]>();
    for (const it of items) {
      const k = `${it.dia_semana}-${it.momento}`;
      const list = m.get(k) ?? [];
      list.push(it);
      m.set(k, list);
    }
    return m;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2 items-center">
          {plans.length > 0 && (
            <Select value={activePlan?.id} onValueChange={setSelectedId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecciona plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.titulo} · {p.fecha_inicio}{p.activo ? "" : " (inactivo)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setPlanDialog({})}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo plan
            </Button>
          )}
          {canEdit && activePlan && (
            <>
              <Button size="sm" variant="outline" onClick={() => setPlanDialog(activePlan)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => duplicateWeek.mutate({ planId: activePlan.id, items })}>
                <Copy className="h-4 w-4 mr-1" /> Duplicar semana
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                if (confirm("¿Eliminar plan y sus alimentos?")) deletePlan.mutate(activePlan.id);
              }}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </>
          )}
        </div>
        {activePlan && (
          <Button size="sm" variant="secondary" onClick={() => exportMealPlanPdf(activePlan, items, patientName)}>
            <Download className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        )}
      </div>

      {!activePlan ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Aún no hay planes nutricionales. {canEdit && "Crea uno para comenzar."}
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Título</p>
                <p className="font-semibold">{activePlan.titulo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vigencia</p>
                <p className="text-sm">{activePlan.fecha_inicio} → {activePlan.fecha_fin ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kcal objetivo</p>
                <p className="text-sm">{activePlan.kcal_objetivo ?? "—"} kcal/día</p>
              </div>
              {activePlan.notas && (
                <div className="sm:col-span-3">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="text-sm whitespace-pre-wrap">{activePlan.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Plan semanal</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2 text-left w-28">Momento</th>
                    {DIAS.map((d) => <th key={d} className="p-2 text-left">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MOMENTOS.map((momento) => (
                    <tr key={momento} className="border-t border-border">
                      <td className="p-2 font-medium bg-muted/20">{MOMENTO_LABEL[momento]}</td>
                      {DIAS.map((_, dia) => {
                        const list = grid.get(`${dia}-${momento}`) ?? [];
                        return (
                          <td key={dia} className="p-1 align-top min-w-[140px]">
                            <div className="space-y-1">
                              {list.map((it) => (
                                <button
                                  key={it.id}
                                  className="w-full text-left rounded-md border border-border bg-background/60 p-1.5 hover:border-primary transition"
                                  disabled={!canEdit}
                                  onClick={() => canEdit && setCellDialog({ dia, momento, item: it })}
                                >
                                  <p className="font-medium truncate">{it.alimento}</p>
                                  {(it.porcion || it.unidad) && (
                                    <p className="text-muted-foreground truncate">{[it.porcion, it.unidad].filter(Boolean).join(" ")}</p>
                                  )}
                                  {it.kcal != null && <Badge variant="outline" className="mt-1 text-[10px] px-1 py-0">{it.kcal} kcal</Badge>}
                                  {it.alternativas.length > 0 && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">↔ {it.alternativas.length} alt.</p>
                                  )}
                                </button>
                              ))}
                              {canEdit && (
                                <button
                                  className="w-full rounded-md border border-dashed border-border p-1 text-muted-foreground hover:border-primary hover:text-primary transition"
                                  onClick={() => setCellDialog({ dia, momento })}
                                >
                                  <Plus className="h-3 w-3 inline" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Plan dialog */}
      {planDialog !== null && (
        <PlanDialog
          open
          initial={planDialog as Partial<MealPlan>}
          onClose={() => setPlanDialog(null)}
          onSubmit={async (v) => {
            if ((planDialog as MealPlan).id) {
              const updated = await updatePlan.mutateAsync({ id: (planDialog as MealPlan).id, patch: v });
              setSelectedId(updated.id);
            } else {
              const created = await createPlan.mutateAsync({ ...v, patient_id: patientId });
              setSelectedId(created.id);
            }
            setPlanDialog(null);
          }}
        />
      )}

      {/* Cell dialog */}
      {cellDialog && activePlan && (
        <CellDialog
          open
          data={cellDialog}
          onClose={() => setCellDialog(null)}
          onSubmit={async (v) => {
            await upsertItem.mutateAsync({
              id: cellDialog.item?.id,
              plan_id: activePlan.id,
              dia_semana: cellDialog.dia,
              momento: cellDialog.momento,
              ...v,
            });
            setCellDialog(null);
          }}
          onDelete={cellDialog.item ? async () => {
            await deleteItem.mutateAsync({ id: cellDialog.item!.id, planId: activePlan.id });
            setCellDialog(null);
          } : undefined}
        />
      )}
    </div>
  );
}

function PlanDialog({ open, initial, onClose, onSubmit }: {
  open: boolean; initial: Partial<MealPlan>;
  onClose: () => void;
  onSubmit: (v: Partial<MealPlan>) => Promise<void>;
}) {
  const [f, setF] = useState({
    titulo: initial.titulo ?? "Plan semanal",
    fecha_inicio: initial.fecha_inicio ?? new Date().toISOString().slice(0, 10),
    fecha_fin: initial.fecha_fin ?? "",
    kcal_objetivo: initial.kcal_objetivo?.toString() ?? "",
    notas: initial.notas ?? "",
    activo: initial.activo ?? true,
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial.id ? "Editar plan" : "Nuevo plan"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Inicio</Label><Input type="date" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} /></div>
            <div><Label>Fin</Label><Input type="date" value={f.fecha_fin} onChange={(e) => setF({ ...f, fecha_fin: e.target.value })} /></div>
          </div>
          <div><Label>Kcal objetivo / día</Label><Input type="number" value={f.kcal_objetivo} onChange={(e) => setF({ ...f, kcal_objetivo: e.target.value })} /></div>
          <div><Label>Notas</Label><Textarea rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
            Plan activo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSubmit({
            titulo: f.titulo,
            fecha_inicio: f.fecha_inicio,
            fecha_fin: f.fecha_fin || null,
            kcal_objetivo: f.kcal_objetivo ? Number(f.kcal_objetivo) : null,
            notas: f.notas || null,
            activo: f.activo,
          })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CellDialog({ open, data, onClose, onSubmit, onDelete }: {
  open: boolean;
  data: { dia: number; momento: Momento; item?: MealPlanItem };
  onClose: () => void;
  onSubmit: (v: { alimento: string; porcion: string | null; unidad: string | null; kcal: number | null; alternativas: string[] }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const it = data.item;
  const [f, setF] = useState({
    alimento: it?.alimento ?? "",
    porcion: it?.porcion ?? "",
    unidad: it?.unidad ?? "",
    kcal: it?.kcal?.toString() ?? "",
    alt1: it?.alternativas?.[0] ?? "",
    alt2: it?.alternativas?.[1] ?? "",
    alt3: it?.alternativas?.[2] ?? "",
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{DIAS[data.dia]} · {MOMENTO_LABEL[data.momento]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Alimento</Label><Input value={f.alimento} onChange={(e) => setF({ ...f, alimento: e.target.value })} placeholder="Ej. Avena con fruta" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Porción</Label><Input value={f.porcion} onChange={(e) => setF({ ...f, porcion: e.target.value })} placeholder="1" /></div>
            <div><Label>Unidad</Label><Input value={f.unidad} onChange={(e) => setF({ ...f, unidad: e.target.value })} placeholder="taza" /></div>
            <div><Label>Kcal</Label><Input type="number" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} /></div>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Alternativas (hasta 3)</p>
            <div className="space-y-2">
              <Input value={f.alt1} onChange={(e) => setF({ ...f, alt1: e.target.value })} placeholder="Alt 1: p. ej. Yogur natural con nueces" />
              <Input value={f.alt2} onChange={(e) => setF({ ...f, alt2: e.target.value })} placeholder="Alt 2" />
              <Input value={f.alt3} onChange={(e) => setF({ ...f, alt3: e.target.value })} placeholder="Alt 3" />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {onDelete ? (
            <Button variant="destructive" size="sm" onClick={onDelete}>Eliminar</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!f.alimento.trim()} onClick={() => onSubmit({
              alimento: f.alimento.trim(),
              porcion: f.porcion || null,
              unidad: f.unidad || null,
              kcal: f.kcal ? Number(f.kcal) : null,
              alternativas: [f.alt1, f.alt2, f.alt3].map((s) => s.trim()).filter(Boolean),
            })}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}