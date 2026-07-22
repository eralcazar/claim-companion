import Papa from "papaparse";

export type RawRow = Record<string, any>;

export const CANONICAL_FIELDS = [
  "fecha",
  "environment",
  "exercise",
  "set_number",
  "reps",
  "weight_kg",
  "distance_m",
  "duration_sec",
  "rpe",
  "rest_sec",
  "notes",
] as const;
export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

// Common aliases -> canonical
const ALIASES: Record<string, CanonicalField> = {
  date: "fecha", día: "fecha", dia: "fecha",
  entorno: "environment", ambiente: "environment", place: "environment",
  ejercicio: "exercise", nombre: "exercise", movement: "exercise",
  set: "set_number", serie: "set_number", n: "set_number",
  repeticiones: "reps", rep: "reps",
  peso: "weight_kg", kg: "weight_kg", weight: "weight_kg",
  distancia: "distance_m", metros: "distance_m", meters: "distance_m",
  duracion: "duration_sec", duración: "duration_sec", segundos: "duration_sec", seconds: "duration_sec",
  esfuerzo: "rpe",
  descanso: "rest_sec", rest: "rest_sec",
  notas: "notes", note: "notes", comentario: "notes",
};

export function autoMap(headers: string[]): Record<string, CanonicalField | ""> {
  const map: Record<string, CanonicalField | ""> = {};
  for (const h of headers) {
    const norm = h.trim().toLowerCase();
    if ((CANONICAL_FIELDS as readonly string[]).includes(norm)) {
      map[h] = norm as CanonicalField;
    } else if (ALIASES[norm]) {
      map[h] = ALIASES[norm];
    } else {
      map[h] = "";
    }
  }
  return map;
}

export type ParsedFile = { headers: string[]; rows: RawRow[]; format: "csv" | "json" };

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const isJson = file.name.toLowerCase().endsWith(".json");
  if (isJson) {
    const txt = await file.text();
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed)) throw new Error("El JSON debe ser un arreglo de objetos");
    const headers = Array.from(
      parsed.reduce<Set<string>>((s, r) => { Object.keys(r ?? {}).forEach((k) => s.add(k)); return s; }, new Set()),
    );
    return { headers, rows: parsed as RawRow[], format: "json" };
  }
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        resolve({ headers, rows: res.data as RawRow[], format: "csv" });
      },
      error: (e) => reject(e),
    });
  });
}

export function applyMapping(rows: RawRow[], mapping: Record<string, CanonicalField | "">): RawRow[] {
  return rows.map((r) => {
    const out: RawRow = {};
    for (const [src, dst] of Object.entries(mapping)) {
      if (!dst) continue;
      out[dst] = r[src];
    }
    return out;
  });
}

export type RowError = { row: number; field?: string; reason: string; raw: RawRow };

export function validateRows(rows: RawRow[], findExerciseId: (name: string) => string | null): {
  ok: Array<{ index: number; row: RawRow; exercise_id: string }>;
  errors: RowError[];
} {
  const ok: Array<{ index: number; row: RawRow; exercise_id: string }> = [];
  const errors: RowError[] = [];
  rows.forEach((r, i) => {
    const rowNum = i + 1;
    if (!r.fecha) return errors.push({ row: rowNum, field: "fecha", reason: "Fecha requerida", raw: r });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha))) return errors.push({ row: rowNum, field: "fecha", reason: "Formato AAAA-MM-DD", raw: r });
    if (!r.exercise) return errors.push({ row: rowNum, field: "exercise", reason: "Ejercicio requerido", raw: r });
    const exId = findExerciseId(String(r.exercise));
    if (!exId) return errors.push({ row: rowNum, field: "exercise", reason: `No coincide con catálogo: "${r.exercise}"`, raw: r });
    if (r.environment && !["gym", "calle", "casa"].includes(String(r.environment)))
      return errors.push({ row: rowNum, field: "environment", reason: "Debe ser gym|calle|casa", raw: r });
    const numeric = ["reps", "weight_kg", "distance_m", "duration_sec", "rpe", "rest_sec", "set_number"];
    for (const f of numeric) {
      if (r[f] != null && r[f] !== "" && Number.isNaN(Number(r[f]))) {
        return errors.push({ row: rowNum, field: f, reason: `Valor no numérico: ${r[f]}`, raw: r });
      }
    }
    ok.push({ index: i, row: r, exercise_id: exId });
  });
  return { ok, errors };
}