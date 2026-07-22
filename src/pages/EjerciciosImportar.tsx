import { useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useExerciseCatalog } from "@/hooks/useExercises";
import { toast } from "sonner";

type Row = {
  fecha: string;
  environment: string;
  exercise: string;
  set_number?: string | number;
  reps?: string | number;
  weight_kg?: string | number;
  distance_m?: string | number;
  duration_sec?: string | number;
  rpe?: string | number;
  rest_sec?: string | number;
  notes?: string;
};

const TEMPLATE = `fecha,environment,exercise,set_number,reps,weight_kg,distance_m,duration_sec,rpe,rest_sec,notes
2026-07-20,gym,Sentadilla con barra,1,8,60,,,7,120,
2026-07-20,gym,Sentadilla con barra,2,8,62.5,,,8,120,
2026-07-20,calle,Trote continuo,1,,,3000,900,6,,
`;

export default function EjerciciosImportar() {
  const { user } = useAuth();
  const { data: catalog = [] } = useExerciseCatalog();
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<{ row: number; reason: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState<string>("");

  function handleFile(file: File) {
    setFilename(file.name);
    setErrors([]);
    if (file.name.endsWith(".json")) {
      file.text().then((txt) => {
        try {
          const parsed = JSON.parse(txt);
          if (!Array.isArray(parsed)) throw new Error("El JSON debe ser un arreglo");
          setRows(parsed);
        } catch (e: any) {
          toast.error(e.message ?? "JSON inválido");
        }
      });
      return;
    }
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
      error: (e) => toast.error(e.message),
    });
  }

  function findExerciseId(name: string): string | null {
    const n = name.trim().toLowerCase();
    const hit = catalog.find((c) => c.name.toLowerCase() === n || c.slug.toLowerCase() === n);
    return hit?.id ?? null;
  }

  async function importAll() {
    if (!user) return;
    setBusy(true);
    const errs: { row: number; reason: string }[] = [];
    let ok = 0;

    // Agrupar por fecha+environment
    const groups = new Map<string, Row[]>();
    rows.forEach((r, i) => {
      if (!r.fecha || !r.exercise) {
        errs.push({ row: i + 1, reason: "Faltan fecha o exercise" });
        return;
      }
      const key = `${r.fecha}__${r.environment || "gym"}`;
      const arr = groups.get(key) ?? [];
      arr.push(r);
      groups.set(key, arr);
    });

    for (const [key, groupRows] of groups.entries()) {
      const [fecha, env] = key.split("__");
      const { data: sess, error: se } = await supabase.from("exercise_session_logs" as any).insert({
        patient_id: user.id,
        fecha,
        environment: (["gym","calle","casa"].includes(env) ? env : "gym") as any,
      }).select("id").single();
      if (se) { errs.push({ row: 0, reason: `Sesión ${fecha}: ${se.message}` }); continue; }

      const setRows: any[] = [];
      for (const r of groupRows) {
        const exId = findExerciseId(r.exercise);
        if (!exId) { errs.push({ row: rows.indexOf(r) + 1, reason: `Ejercicio no encontrado: ${r.exercise}` }); continue; }
        setRows.push({
          session_log_id: (sess as any).id,
          exercise_id: exId,
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
        ok++;
      }
      if (setRows.length) {
        const { error: sErr } = await supabase.from("exercise_set_logs" as any).insert(setRows);
        if (sErr) errs.push({ row: 0, reason: `Sets ${fecha}: ${sErr.message}` });
      }
    }

    await supabase.from("workout_import_batches" as any).insert({
      patient_id: user.id,
      filename,
      rows_ok: ok,
      rows_error: errs.length,
      errors: errs.slice(0, 50),
    });

    setErrors(errs);
    setBusy(false);
    toast.success(`Importación: ${ok} sets ok, ${errs.length} errores`);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla_entrenamientos.csv";
    a.click();
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/ejercicios"><ArrowLeft className="h-4 w-4 mr-1" /> Ejercicios</Link></Button>
      <div>
        <h1 className="text-2xl font-bold">Importar entrenamientos</h1>
        <p className="text-sm text-muted-foreground">Cargá tus registros históricos en CSV o JSON. Se agrupan por fecha y entorno.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">1) Descargá la plantilla</CardTitle>
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1"><FileDown className="h-4 w-4" /> CSV modelo</Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Columnas: <code>fecha, environment, exercise, set_number, reps, weight_kg, distance_m, duration_sec, rpe, rest_sec, notes</code>.
          El nombre en <code>exercise</code> debe coincidir con el catálogo (visible en “Ejercicios”).
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2) Subí tu archivo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {rows.length > 0 && (
            <div className="text-sm">Filas leídas: <Badge>{rows.length}</Badge></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3) Importar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button disabled={!rows.length || busy} onClick={importAll} className="gap-1">
            <Upload className="h-4 w-4" /> {busy ? "Importando..." : "Importar"}
          </Button>
          {errors.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-1 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> Errores ({errors.length})</div>
              {errors.slice(0, 20).map((e, i) => (
                <div key={i} className="text-xs text-muted-foreground">Fila {e.row || "-"}: {e.reason}</div>
              ))}
            </div>
          )}
          {rows.length > 0 && errors.length === 0 && !busy && (
            <div className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Todo listo para importar.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}