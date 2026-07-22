import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, PlayCircle } from "lucide-react";
import { toast } from "sonner";

type Run = {
  id: string; source: string; started_at: string; ended_at: string | null;
  status: string; added_count: number; updated_count: number; skipped_count: number;
  error_message: string | null; changes: any[];
};

export default function RecipeImportRuns() {
  const qc = useQueryClient();
  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ["recipe_import_runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipe_import_runs" as any)
        .select("*").order("started_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as Run[];
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("medlineplus-recipe-sync", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Sync OK: ${d?.added ?? 0} nuevas, ${d?.updated ?? 0} actualizadas, ${d?.skipped ?? 0} sin cambios`);
      qc.invalidateQueries({ queryKey: ["recipe_import_runs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falló la sincronización"),
  });

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-5xl">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold">Importación de recetas (MedlinePlus)</h1>
          <p className="text-sm text-muted-foreground">Historial de sincronizaciones automáticas y cambios detectados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending} className="gap-1">
            {runNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Ejecutar ahora
          </Button>
        </div>
      </header>

      {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      {runs.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>{new Date(r.started_at).toLocaleString("es-MX")}</span>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "ok" ? "default" : r.status === "error" ? "destructive" : "outline"}>{r.status}</Badge>
                <Badge variant="outline">+{r.added_count} nuevas</Badge>
                <Badge variant="outline">~{r.updated_count} actualizadas</Badge>
                <Badge variant="outline">={r.skipped_count} sin cambios</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.error_message && <p className="text-sm text-destructive mb-2">{r.error_message}</p>}
            <div className="text-xs space-y-1">
              {(r.changes ?? []).slice(0, 40).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant={c.action === "new" ? "default" : c.action === "updated" ? "secondary" : c.action === "error" ? "destructive" : "outline"}>
                    {c.action}
                  </Badge>
                  <span className="truncate">{c.title ?? c.url}</span>
                  {c.error && <span className="text-destructive text-[10px]">{c.error}</span>}
                </div>
              ))}
              {(r.changes ?? []).length > 40 && <div className="text-muted-foreground">…+{r.changes.length - 40} más</div>}
            </div>
          </CardContent>
        </Card>
      ))}
      {!isLoading && !runs.length && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Sin corridas registradas. Tocá "Ejecutar ahora".</CardContent></Card>
      )}
    </div>
  );
}