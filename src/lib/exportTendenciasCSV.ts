import type { TendenciaIndicador } from "@/hooks/useTendencias";

function escape(value: any): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: any[]): string {
  return values.map(escape).join(",");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "paciente";
}

export interface ExportTendenciasOptions {
  pacienteNombre: string;
  rangoLabel: string;
  modo: "individual" | "comparar";
}

export function exportTendenciasToCSV(
  indicadores: TendenciaIndicador[],
  options: ExportTendenciasOptions,
): { blob: Blob; filename: string } {
  const lines: string[] = [];

  // Meta header
  lines.push(row(["Paciente", options.pacienteNombre]));
  lines.push(row(["Rango", options.rangoLabel]));
  lines.push(row(["Generado", fmtDate(new Date().toISOString())]));
  lines.push(row(["Modo", options.modo === "comparar" ? "Comparar" : "Individual"]));
  lines.push("");

  // Resumen
  lines.push(row(["RESUMEN"]));
  lines.push(
    row([
      "Indicador",
      "Unidad",
      "Ref. mín",
      "Ref. máx",
      "# mediciones",
      "Primera fecha",
      "Última fecha",
      "Último valor",
      "Estado",
    ]),
  );
  for (const ind of indicadores) {
    const ultimo = ind.puntos[ind.puntos.length - 1];
    const primero = ind.puntos[0];
    const estado =
      ultimo?.es_normal == null
        ? "N/A"
        : ultimo.es_normal
          ? "Normal"
          : "Fuera de rango";
    lines.push(
      row([
        ind.nombre,
        ind.unidad ?? "",
        ind.ref_min ?? "",
        ind.ref_max ?? "",
        ind.puntos.length,
        fmtDate(primero?.fecha),
        fmtDate(ultimo?.fecha),
        ultimo?.valor ?? "",
        estado,
      ]),
    );
  }

  lines.push("");

  // Detalle
  lines.push(row(["DETALLE"]));
  lines.push(
    row([
      "Indicador",
      "Fecha",
      "Valor",
      "Unidad",
      "Ref. mín",
      "Ref. máx",
      "Normal",
      "Tipo de estudio",
    ]),
  );
  for (const ind of indicadores) {
    for (const p of ind.puntos) {
      lines.push(
        row([
          ind.nombre,
          fmtDate(p.fecha),
          p.valor,
          p.unidad ?? ind.unidad ?? "",
          p.ref_min ?? ind.ref_min ?? "",
          p.ref_max ?? ind.ref_max ?? "",
          p.es_normal == null ? "N/A" : p.es_normal ? "Sí" : "No",
          p.tipo_estudio ?? "",
        ]),
      );
    }
  }

  const csv = "\ufeff" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const modoSuffix = options.modo === "comparar" ? "_comparar" : "";
  const filename = `tendencias_${slug(options.pacienteNombre)}${modoSuffix}_${ymd}.csv`;

  return { blob, filename };
}