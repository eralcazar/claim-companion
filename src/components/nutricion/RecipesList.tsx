import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Globe, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecipes, useDeleteRecipe, type NutritionRecipe, type RecipeSource } from "@/hooks/useRecipes";
import { RecipeEditor } from "./RecipeEditor";
import { RecipesExport } from "./RecipesExport";

const SOURCE_LABEL: Record<RecipeSource, string> = {
  nutriologa: "Nutrióloga",
  medlineplus: "MedlinePlus (NIH)",
  web: "Web",
  libro: "Libro/Revista",
  manual_paciente: "Paciente",
};

export function RecipesList({ patientId }: { patientId: string }) {
  const { data: recipes = [], isLoading } = useRecipes(patientId);
  const del = useDeleteRecipe();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<NutritionRecipe> | undefined>(undefined);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<"all" | RecipeSource>("all");

  const filtered = useMemo(
    () => (filter === "all" ? recipes : recipes.filter((r) => r.source_type === filter)),
    [recipes, filter],
  );

  async function importFromMedlinePlus() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("medlineplus-recipe-import", { body: { url: importUrl.trim() } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setEditing(data as any);
      setEditorOpen(true);
      toast.success("Draft importado — revisá los ingredientes antes de guardar");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo importar");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <RecipesExport patientId={patientId} patientName={patientId.slice(0, 8)} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Importar desde MedlinePlus (español)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-2">
          <Input
            className="flex-1"
            placeholder="https://medlineplus.gov/spanish/recetas/..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
          <Button onClick={importFromMedlinePlus} disabled={importing || !importUrl.trim()} className="gap-1">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Importar
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por origen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              {(Object.keys(SOURCE_LABEL) as RecipeSource[]).map((k) => (
                <SelectItem key={k} value={k}>{SOURCE_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> Nueva receta
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.servings} porc · {Math.round(r.total_kcal / Math.max(1, r.servings))} kcal/porción
                  </div>
                </div>
                <Badge variant="outline">{SOURCE_LABEL[r.source_type]}</Badge>
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-4 gap-1">
                <span>C: {r.total_carbs_g}g</span>
                <span>P: {r.total_protein_g}g</span>
                <span>G: {r.total_fat_g}g</span>
                <span>Fibra: {r.total_fiber_g}g</span>
              </div>
              {r.source_url && (
                <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  Fuente <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {r.source_author && <div className="text-xs text-muted-foreground">Autor: {r.source_author}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(r); setEditorOpen(true); }} className="gap-1">
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)} className="gap-1 text-destructive">
                  <Trash2 className="h-3 w-3" /> Eliminar
                </Button>
              </div>
              {r.attribution && (
                <div className="text-[10px] italic text-muted-foreground border-t pt-1">{r.attribution}</div>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="p-6 text-sm text-muted-foreground text-center">
            No hay recetas. Creá una manualmente o importá desde MedlinePlus.
          </CardContent></Card>
        )}
      </div>

      <RecipeEditor open={editorOpen} onOpenChange={setEditorOpen} initial={editing} />
    </div>
  );
}