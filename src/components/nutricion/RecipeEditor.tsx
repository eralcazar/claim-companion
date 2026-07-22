import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { computeMacros, perServing } from "@/lib/nutrition/macros";
import { useIngredientCatalog, useUpsertRecipe, type NutritionRecipe, type RecipeSource } from "@/hooks/useRecipes";

const SOURCES: { v: RecipeSource; label: string }[] = [
  { v: "nutriologa", label: "Nutrióloga" },
  { v: "medlineplus", label: "MedlinePlus (NIH)" },
  { v: "web", label: "Página web" },
  { v: "libro", label: "Libro / revista" },
  { v: "manual_paciente", label: "Yo (paciente)" },
];

const schema = z.object({
  title: z.string().trim().min(2, "Título requerido").max(160),
  servings: z.number().int().min(1).max(50),
  source_type: z.enum(["nutriologa", "medlineplus", "web", "libro", "manual_paciente"]),
  source_author: z.string().max(120).optional().nullable(),
  source_url: z.string().max(500).url("URL inválida").optional().or(z.literal("")),
  steps: z.string().max(4000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
}).superRefine((v, ctx) => {
  if (v.source_type === "nutriologa" && !(v.source_author && v.source_author.trim().length >= 2)) {
    ctx.addIssue({ code: "custom", path: ["source_author"], message: "Nombre de la nutrióloga requerido" });
  }
  if ((v.source_type === "web" || v.source_type === "medlineplus") && !v.source_url) {
    ctx.addIssue({ code: "custom", path: ["source_url"], message: "URL requerida" });
  }
});

type Draft = Partial<NutritionRecipe> & {
  ingredients: NutritionRecipe["ingredients"];
};

export function RecipeEditor({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<NutritionRecipe>;
}) {
  const { data: catalog = [] } = useIngredientCatalog();
  const upsert = useUpsertRecipe();
  const [draft, setDraft] = useState<Draft>({
    title: "", servings: 2, ingredients: [], steps: "", source_type: "manual_paciente",
    source_author: "", source_url: "", notes: "",
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft({
        title: initial?.title ?? "",
        servings: initial?.servings ?? 2,
        ingredients: (initial?.ingredients as any) ?? [],
        steps: initial?.steps ?? "",
        source_type: (initial?.source_type as RecipeSource) ?? "manual_paciente",
        source_author: initial?.source_author ?? "",
        source_url: initial?.source_url ?? "",
        attribution: initial?.attribution ?? null,
        notes: initial?.notes ?? "",
        id: initial?.id,
      });
    }
  }, [open, initial]);

  const totals = useMemo(() => computeMacros(draft.ingredients, catalog), [draft.ingredients, catalog]);
  const perS = useMemo(() => perServing(totals, draft.servings ?? 1), [totals, draft.servings]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog.slice(0, 12);
    return catalog.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [catalog, search]);

  function addIngredient(name: string, id?: string) {
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, { name, ingredient_id: id ?? null, grams: 100 }] }));
    setSearch("");
  }

  function updateIngredient(i: number, patch: Partial<{ name: string; grams: number }>) {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, idx) => idx === i ? { ...ing, ...patch } : ing),
    }));
  }

  function removeIngredient(i: number) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    const parsed = schema.safeParse({
      title: draft.title, servings: Number(draft.servings) || 1,
      source_type: draft.source_type, source_author: draft.source_author || undefined,
      source_url: draft.source_url || undefined, steps: draft.steps || undefined, notes: draft.notes || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }
    if (!draft.ingredients.length) { toast.error("Agregá al menos un ingrediente"); return; }

    await upsert.mutateAsync({
      id: draft.id,
      title: parsed.data.title,
      servings: parsed.data.servings,
      ingredients: draft.ingredients as any,
      steps: parsed.data.steps ?? null,
      notes: parsed.data.notes ?? null,
      source_type: parsed.data.source_type,
      source_author: parsed.data.source_author ?? null,
      source_url: parsed.data.source_url || null,
      attribution: draft.attribution ?? null,
      total_kcal: totals.kcal, total_carbs_g: totals.carbs_g,
      total_protein_g: totals.protein_g, total_fat_g: totals.fat_g, total_fiber_g: totals.fiber_g,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Editar receta" : "Nueva receta"}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Porciones</Label>
                <Input type="number" min={1} value={draft.servings ?? 1}
                  onChange={(e) => setDraft({ ...draft, servings: Number(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>Origen</Label>
                <Select value={draft.source_type} onValueChange={(v) => setDraft({ ...draft, source_type: v as RecipeSource })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {(draft.source_type === "nutriologa" || draft.source_type === "libro") && (
              <div><Label>Autor / referencia</Label>
                <Input value={draft.source_author ?? ""} onChange={(e) => setDraft({ ...draft, source_author: e.target.value })}
                  placeholder={draft.source_type === "nutriologa" ? "Nombre de la nutrióloga" : "Autor / libro / revista"} />
              </div>
            )}
            {(draft.source_type === "web" || draft.source_type === "medlineplus") && (
              <div><Label>URL</Label>
                <Input value={draft.source_url ?? ""} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
                  placeholder="https://..." />
              </div>
            )}

            <div>
              <Label>Ingredientes</Label>
              <div className="flex gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en catálogo o escribir libre" />
                <Button variant="outline" onClick={() => search.trim() && addIngredient(search.trim())}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {search && filteredCatalog.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-background">
                  {filteredCatalog.map((c) => (
                    <button key={c.id} type="button" onClick={() => addIngredient(c.name, c.id)}
                      className="flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-muted">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.kcal_100g} kcal/100g</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 space-y-1">
                {draft.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input className="flex-1" value={ing.name} onChange={(e) => updateIngredient(i, { name: e.target.value })} />
                    <Input className="w-24" type="number" min={0} value={ing.grams}
                      onChange={(e) => updateIngredient(i, { grams: Number(e.target.value) || 0 })} />
                    <span className="text-xs text-muted-foreground">g</span>
                    <Button size="icon" variant="ghost" onClick={() => removeIngredient(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {draft.ingredients.length === 0 && <div className="text-xs text-muted-foreground">Sin ingredientes aún.</div>}
              </div>
            </div>

            <div>
              <Label>Preparación</Label>
              <Textarea rows={5} value={draft.steps ?? ""} onChange={(e) => setDraft({ ...draft, steps: e.target.value })} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Macros</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Row label="Calorías (total)" value={`${totals.kcal} kcal`} />
                <Row label="Carbohidratos" value={`${totals.carbs_g} g`} />
                <Row label="Proteínas" value={`${totals.protein_g} g`} />
                <Row label="Grasas" value={`${totals.fat_g} g`} />
                <Row label="Fibra" value={`${totals.fiber_g} g`} />
                <div className="border-t pt-2 text-xs text-muted-foreground">Por porción ({draft.servings})</div>
                <Row label="kcal" value={perS.kcal} />
                <Row label="C / P / G" value={`${perS.carbs_g} / ${perS.protein_g} / ${perS.fat_g} g`} />
                {totals.unmatched > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-400 mt-1">
                    {totals.unmatched} ingrediente(s) fuera del catálogo — no cuentan
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><b>{value}</b></div>;
}