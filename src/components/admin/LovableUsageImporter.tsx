import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { log_id: string; credits: number; cost_cents: number };

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const idxLog = header.findIndex((h) => /log[_ ]?id|request[_ ]?id/.test(h));
  const idxCredits = header.findIndex((h) => /credit/.test(h));
  const idxCost = header.findIndex((h) => /cost|price|amount|usd|mxn/.test(h));
  if (idxLog < 0) throw new Error("No se encontró columna log_id / request_id.");
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/("([^"]|"")*"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
    const log = cols[idxLog];
    if (!log) continue;
    const credits = idxCredits >= 0 ? Number(cols[idxCredits].replace(/[^0-9.\-]/g, "")) : 0;
    const costUnits = idxCost >= 0 ? Number(cols[idxCost].replace(/[^0-9.\-]/g, "")) : 0;
    // El CSV de Lovable expresa el costo en la moneda del workspace (USD o MXN). Convertimos a centavos.
    const cost_cents = Math.round(costUnits * 100);
    rows.push({ log_id: log, credits: isFinite(credits) ? credits : 0, cost_cents: isFinite(cost_cents) ? cost_cents : 0 });
  }
  return rows;
}

export function LovableUsageImporter() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; miss: number; total: number } | null>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error("El archivo no contiene filas.");
      let ok = 0;
      let miss = 0;
      // Serializamos para no reventar el rate limit; el CSV suele traer < 5k filas.
      for (const r of rows) {
        const { data, error } = await supabase.rpc("upsert_gateway_real_cost", {
          _gateway_log_id: r.log_id,
          _credits: r.credits,
          _cost_cents: r.cost_cents,
        });
        if (error) {
          miss++;
          continue;
        }
        if ((data as number) > 0) ok++;
        else miss++;
      }
      setResult({ ok, miss, total: rows.length });
      toast.success(`Importadas ${ok} filas de ${rows.length}. Sin coincidencia: ${miss}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al importar CSV");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Importar costos reales desde Lovable (CSV)</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Descarga el CSV de uso desde <em>Workspace → Usage → Export</em> en Lovable y súbelo aquí. Se buscan las
          columnas <code>log_id</code> (o <code>request_id</code>), <code>credits</code> y <code>cost</code>. Las
          filas se emparejan con las peticiones locales por <code>gateway_log_id</code>.
        </p>
        <div>
          <Label htmlFor="csv-file" className="text-xs">Archivo CSV</Label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="block w-full text-sm mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:cursor-pointer"
          />
        </div>
        {busy && <p className="text-xs text-muted-foreground">Procesando…</p>}
        {result && (
          <div className="text-xs flex items-center gap-2">
            {result.miss === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <span>
              Emparejadas {result.ok}/{result.total}. {result.miss > 0 && `Sin match: ${result.miss} (posiblemente peticiones de otros workspaces o antes de habilitar el tracking).`}
            </span>
          </div>
        )}
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://lovable.dev/settings/workspace"
            target="_blank"
            rel="noreferrer"
          >
            Abrir Workspace → Usage
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}