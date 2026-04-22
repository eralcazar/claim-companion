import { CSVImportDialog, type CSVValidationResult } from "@/components/admin/CSVImportDialog";
import { useBulkInsertIndicadores } from "@/hooks/useResultadosEstudio";

interface BulkRow {
  nombre_indicador: string;
  valor: number | null;
  unidad: string | null;
  valor_referencia_min: number | null;
  valor_referencia_max: number | null;
  es_normal: boolean | null;
  flagged: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultadoId: string;
  patientId: string;
}

function parseNum(raw: string | undefined): { value: number | null; ok: boolean } {
  const s = (raw ?? "").trim();
  if (s === "") return { value: null, ok: true };
  const n = Number(s.replace(",", "."));
  if (Number.isNaN(n)) return { value: null, ok: false };
  return { value: n, ok: true };
}

export function IndicadoresBulkImportDialog({ open, onOpenChange, resultadoId, patientId }: Props) {
  const bulk = useBulkInsertIndicadores();

  const parseRow = (raw: Record<string, string>, _i: number): CSVValidationResult<BulkRow> => {
    const errors: string[] = [];
    const nombre = (raw.nombre_indicador ?? "").trim();
    if (!nombre) errors.push("nombre_indicador es obligatorio");

    const valor = parseNum(raw.valor);
    if (!valor.ok) errors.push("valor no es numérico");
    const min = parseNum(raw.valor_referencia_min);
    if (!min.ok) errors.push("valor_referencia_min no es numérico");
    const max = parseNum(raw.valor_referencia_max);
    if (!max.ok) errors.push("valor_referencia_max no es numérico");

    if (min.value != null && max.value != null && min.value > max.value) {
      errors.push("min mayor que max");
    }

    if (errors.length) return { ok: false, row: null, errors };

    const es_normal =
      valor.value != null && min.value != null && max.value != null
        ? valor.value >= min.value && valor.value <= max.value
        : null;

    const row: BulkRow = {
      nombre_indicador: nombre,
      valor: valor.value,
      unidad: (raw.unidad ?? "").trim() || null,
      valor_referencia_min: min.value,
      valor_referencia_max: max.value,
      es_normal,
      flagged: es_normal === false,
    };
    return { ok: true, row, errors: [] };
  };

  const onImport = async (rows: BulkRow[]) => {
    await bulk.mutateAsync({ resultado_id: resultadoId, patient_id: patientId, rows });
  };

  return (
    <CSVImportDialog<BulkRow>
      open={open}
      onOpenChange={onOpenChange}
      title="Importar indicadores desde CSV"
      description="Las filas con errores se omitirán. Los campos numéricos usan punto como separador decimal."
      templateHeaders={[
        "nombre_indicador",
        "valor",
        "unidad",
        "valor_referencia_min",
        "valor_referencia_max",
      ]}
      templateExampleRow={["Glucosa", "95", "mg/dL", "70", "100"]}
      templateFilename="layout_indicadores.csv"
      parseRow={parseRow}
      previewColumns={[
        { key: "nombre_indicador", label: "Indicador" },
        { key: "valor", label: "Valor" },
        { key: "unidad", label: "Unidad" },
        { key: "valor_referencia_min", label: "Min" },
        { key: "valor_referencia_max", label: "Max" },
      ]}
      rowToPreview={(r) => ({
        nombre_indicador: r.nombre_indicador,
        valor: r.valor ?? "—",
        unidad: r.unidad ?? "—",
        valor_referencia_min: r.valor_referencia_min ?? "—",
        valor_referencia_max: r.valor_referencia_max ?? "—",
      })}
      onImport={onImport}
      isImporting={bulk.isPending}
    />
  );
}