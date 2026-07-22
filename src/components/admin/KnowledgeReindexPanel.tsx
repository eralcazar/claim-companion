import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Failure = { id: string; title: string; reason: string };

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export function KnowledgeReindexPanel() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failures, setFailures] = useState<Failure[]>([]);

  async function reindex(filterSeedOnly: boolean) {
    setRunning(true);
    setFailures([]);
    setProgress({ done: 0, total: 0 });
    try {
      let q = supabase.from("knowledge_documents").select("id, title, source, status").eq("status", "published");
      if (filterSeedOnly) q = q.eq("source", "internal");
      const { data, error } = await q;
      if (error) throw error;
      const docs = (data ?? []) as Array<{ id: string; title: string }>;
      setProgress({ done: 0, total: docs.length });

      const fails: Failure[] = [];
      const chunkSize = 5;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const batch = docs.slice(i, i + chunkSize);
        const results = await Promise.allSettled(
          batch.map((d) => supabase.functions.invoke("knowledge-embed", { body: { document_id: d.id } })),
        );
        results.forEach((res, idx) => {
          const d = batch[idx];
          if (res.status === "rejected") {
            fails.push({ id: d.id, title: d.title, reason: (res.reason as any)?.message ?? "error desconocido" });
          } else {
            const v = res.value as any;
            if (v.error) fails.push({ id: d.id, title: d.title, reason: v.error.message ?? "invoke error" });
            else if (v.data?.error) fails.push({ id: d.id, title: d.title, reason: v.data.error });
          }
        });
        setProgress((p) => ({ ...p, done: Math.min(p.total, i + batch.length) }));
        setFailures([...fails]);
        await sleep(400);
      }
      toast.success(`Reindex completado: ${docs.length - fails.length}/${docs.length} ok`);
    } catch (e: any) {
      toast.error(e.message ?? "Reindex falló");
    } finally {
      setRunning(false);
    }
  }

  function exportFailures() {
    const csv = ["id,title,reason", ...failures.map((f) =>
      `"${f.id}","${(f.title || "").replace(/"/g, '""')}","${(f.reason || "").replace(/"/g, '""')}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reindex_failures_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Reindex masivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Ejecuta <code>knowledge-embed</code> por lote sobre los documentos publicados. Necesario después de importar o modificar semillas para que la búsqueda semántica y el RAG queden al día.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => reindex(false)} disabled={running} className="gap-1">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reindexar todo (publicados)
          </Button>
          <Button variant="outline" onClick={() => reindex(true)} disabled={running} className="gap-1">
            <Sparkles className="h-4 w-4" /> Solo internos (seed)
          </Button>
          {failures.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportFailures} className="gap-1">
              <FileDown className="h-4 w-4" /> Exportar fallos CSV
            </Button>
          )}
        </div>
        {(running || progress.total > 0) && (
          <div className="space-y-1">
            <Progress value={pct} />
            <div className="text-xs text-muted-foreground">
              {progress.done}/{progress.total} documentos · {pct}%
              {failures.length > 0 && <> · <Badge variant="destructive">{failures.length} fallos</Badge></>}
            </div>
          </div>
        )}
        {failures.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs space-y-0.5">
            {failures.slice(0, 30).map((f) => (
              <div key={f.id}><b>{f.title}</b> — <span className="text-muted-foreground">{f.reason}</span></div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}