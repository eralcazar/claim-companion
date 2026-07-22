import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useExerciseCatalog } from "@/hooks/useExercises";
import { toast } from "sonner";
import {
  applyMapping, autoMap, parseImportFile, validateRows,
  type CanonicalField, type RawRow, type RowError,
} from "@/lib/ejercicios/importParsers";
import { ColumnMapper } from "@/components/ejercicios/import/ColumnMapper";
import { ImportReport } from "@/components/ejercicios/import/ImportReport";

const TEMPLATE = `fecha,environment,exercise,set_number,reps,weight_kg,distance_m,duration_sec,rpe,rest_sec,notes
2026-07-20,gym,Sentadilla con barra,1,8,60,,,7,120,
2026-07-20,gym,Sentadilla con barra,2,8,62.5,,,8,120,
2026-07-20,calle,Trote continuo,1,,,3000,900,6,,
`;

export default function EjerciciosImportar() {
  const { user } = useAuth();
  const { data: catalog = [] } = useExerciseCatalog();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, CanonicalField | "">>({});
  const [errors, setErrors] = useState<RowError[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState<string>("");

  const findExerciseId = useMemo(() => (name: string): string | null => {
    const n = name.trim().toLowerCase();
    const hit = catalog.find((c) => c.name.toLowerCase() === n || c.slug.toLowerCase() === n);
    return hit?.id ?? null;
  }, [catalog]);

  async function handleFile(file: File) {
    setFilename(file.name);
    setErrors([]);
    setOkCount(0);
    try {
      const parsed = await parseImportFile(file);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(autoMap(parsed.headers));
      setStep(2);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo leer el archivo");
    }
  }

  async function importAll() {
    if (!user) return;
    const mapped = applyMapping(rawRows, mapping);
    const { ok, errors: valErrs } = validateRows(mapped, findExerciseId);
    setBusy(true);
    const errs: RowError[] = [...valErrs];
    let okRows = 0;

    const groups = new Map<string, Array<{ index: number; row: RawRow; exercise_id: string }>>();
    for (const item of ok) {
      const key = `${item.row.fecha}__${item.row.environment || "gym"}`;
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    }

    for (const [key, groupRows] of groups.entries()) {
      const [fecha, env] = key.split("__");
      const { data: sess, error: se } = await supabase.from("exercise_session_logs" as any).insert({
        patient_id: user.id,
        fecha,
        environment: (["gym","calle","casa"].includes(env) ? env : "gym") as any,
      }).select("id").single();
      if (se) { errs.push({ row: 0, reason: `Sesión ${fecha}: ${se.message}`, raw: {} }); continue; }

      const setRows: any[] = [];
      for (const g of groupRows) {
        const r = g.row;
        setRows.push({
          session_log_id: (sess as any).id,
          exercise_id: g.exercise_id,
          patient_id: user.id,
          set_number: Number(r.set_number ?? 1) || 1,
          reps: r.reps ? Number(r.reps) : null,
          weight_kg: r.weight_kg ? Number(r.weight_kg) : null,
          distance_m: r.distance_m ? Number(r.distance_m) : null,
          duration_sec: r.duration_sec ? Number(r.duration_sec) : null,
          rpe: r.rpe ? Number(r.rpe) : null,
          rest_sec: r.rest_sec ? Number(r.rest_sec) : null,
          notes: r.notes ?? null,
        });
        okRows++;
      }
      if (setRows.length) {
        const { error: sErr } = await supabase.from("exercise_set_logs" as any).insert(setRows);
        if (sErr) errs.push({ row: 0, reason: `Sets ${fecha}: ${sErr.message}`, raw: {} });
      }
    }

    await supabase.from("workout_import_batches" as any).insert({
      patient_id: user.id,
      filename,
      rows_ok: okRows,
      rows_error: errs.length,
      errors: errs.slice(0, 50).map((e) => ({ row: e.row, field: e.field, reason: e.reason })),
    });

    setErrors(errs);
    setOkCount(okRows);
    setBusy(false);
    setStep(3);
    toast.success(`Importación: ${okRows} sets ok, ${errs.length} errores`);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla_entrenamientos.csv";
    a.click();
  }

  function downloadErrors() {
    const header = "row,field,reason\n";
    const body = errors.map((e) => `${e.row},${e.field ?? ""},${JSON.stringify(e.reason)}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `errores_importacion_${filename || "entrenamientos"}.csv`;
    a.click();
  }

  const sample = rawRows[0] ?? {};

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/ejercicios"><ArrowLeft className="h-4 w-4 mr-1" /> Ejercicios</Link></Button>
      <div>
        <h1 className="text-2xl font-bold">Importar entrenamientos — Paso {step} de 3</h1>
        <p className="text-sm text-muted-foreground">1) Subí archivo · 2) Mapeá columnas · 3) Revisá reporte.</p>
      </div>

      {step === 1 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Descargá la plantilla (opcional)</CardTitle>
              <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1"><FileDown className="h-4 w-4" /> CSV modelo</Button>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Podés usar cualquier CSV/JSON: en el siguiente paso vas a mapear tus columnas a los campos internos.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Subí tu archivo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                accept=".csv,.json"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </CardContent>
          </Card>
        </>
      )}

      {step === 2 && (
        <>
          <div className="text-sm">Archivo: <b>{filename}</b> · Filas: <Badge>{rawRows.length}</Badge></div>
          <ColumnMapper headers={headers} mapping={mapping} onChange={setMapping} sample={sample} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
            <Button onClick={importAll} disabled={busy} className="gap-1">
              <Upload className="h-4 w-4" /> {busy ? "Importando..." : "Importar"}
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <ImportReport okCount={okCount} errors={errors} onDownloadErrors={downloadErrors} onFixAndRetry={() => setStep(2)} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Cargar otro archivo</Button>
            <Button asChild><Link to="/ejercicios">Ir a mis ejercicios</Link></Button>
          </div>
        </>
      )}
    </div>
  );
}