import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useBulkInsertHeartRate, type HrInsert } from "@/hooks/useHeartRate";
import { toast } from "sonner";

type PreviewRow = { ok: boolean; error?: string; row: HrInsert };

function parseCsv(text: string): PreviewRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase().split(",").map((s) => s.trim());
  const idxTs = header.findIndex((h) => ["timestamp", "fecha", "measured_at", "date"].includes(h));
  const idxBpm = header.findIndex((h) => ["bpm", "hr", "heart_rate", "frecuencia"].includes(h));
  const idxCtx = header.findIndex((h) => ["context", "contexto"].includes(h));
  const idxNotes = header.findIndex((h) => ["notes", "notas"].includes(h));

  const startIdx = idxTs >= 0 && idxBpm >= 0 ? 1 : 0;
  const [tsCol, bpmCol, ctxCol, notesCol] =
    startIdx === 1 ? [idxTs, idxBpm, idxCtx, idxNotes] : [0, 1, 2, 3];

  const out: PreviewRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const rawTs = cols[tsCol];
    const rawBpm = cols[bpmCol];
    const ctx = ctxCol >= 0 ? cols[ctxCol] : undefined;
    const notes = notesCol >= 0 ? cols[notesCol] : undefined;

    const bpm = Number(rawBpm);
    const date = rawTs ? new Date(rawTs) : null;
    const validDate = date && !isNaN(date.getTime());
    const validBpm = Number.isFinite(bpm) && bpm >= 20 && bpm <= 260;

    if (!validDate) {
      out.push({ ok: false, error: `Fila ${i + 1}: fecha inválida`, row: {} as HrInsert });
      continue;
    }
    if (!validBpm) {
      out.push({ ok: false, error: `Fila ${i + 1}: BPM inválido`, row: {} as HrInsert });
      continue;
    }
    const contextNorm = (["reposo", "ejercicio", "post_cita", "otro"] as const).includes(
      (ctx ?? "otro") as any,
    )
      ? ((ctx ?? "otro") as any)
      : "otro";

    out.push({
      ok: true,
      row: {
        bpm: Math.round(bpm),
        measured_at: date!.toISOString(),
        context: contextNorm,
        notes: notes || null,
        source: "csv",
      },
    });
  }
  return out;
}

export function HeartRateCsvImporter() {
  const bulk = useBulkInsertHeartRate();
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const onFile = useCallback(async (f: File) => {
    setFileName(f.name);
    const txt = await f.text();
    const parsed = parseCsv(txt);
    setRows(parsed);
    const invalid = parsed.filter((r) => !r.ok).length;
    if (invalid) toast.warning(`${invalid} fila(s) con errores`);
  }, []);

  const clear = () => {
    setRows([]);
    setFileName("");
  };

  const commit = async () => {
    const valid = rows.filter((r) => r.ok).map((r) => r.row);
    if (!valid.length) {
      toast.error("No hay filas válidas para importar");
      return;
    }
    try {
      const res = await bulk.mutateAsync(valid);
      toast.success(`Se importaron ${res.inserted} lecturas`);
      clear();
    } catch (err: any) {
      toast.error(err?.message ?? "Error al importar");
    }
  };

  const validCount = rows.filter((r) => r.ok).length;
  const invalidCount = rows.length - validCount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Importar CSV de frecuencia cardíaca
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Encabezados aceptados: <code>timestamp,bpm,context,notes</code>. Fecha en formato ISO
          (2026-07-17T09:15). Filas máximas: sin límite (se envían por lotes de 100).
        </p>

        <label
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer hover:bg-muted/40 transition"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">Arrastrá un CSV aquí o hacé clic para elegir</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{fileName}</span>
                <Badge variant="default">{validCount} válidas</Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">{invalidCount} con errores</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clear}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-52 overflow-auto border rounded-md text-xs">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">BPM</th>
                    <th className="text-left p-2">Contexto</th>
                    <th className="text-left p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.ok ? new Date(r.row.measured_at).toLocaleString("es-MX") : "—"}</td>
                      <td className="p-2">{r.ok ? r.row.bpm : "—"}</td>
                      <td className="p-2">{r.ok ? r.row.context : "—"}</td>
                      <td className="p-2">
                        {r.ok ? (
                          <Badge variant="secondary">OK</Badge>
                        ) : (
                          <span className="text-destructive">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <div className="p-2 text-muted-foreground">…y {rows.length - 10} más</div>
              )}
            </div>

            <Button className="w-full" onClick={commit} disabled={bulk.isPending || !validCount}>
              {bulk.isPending ? "Importando..." : `Importar ${validCount} lecturas`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}