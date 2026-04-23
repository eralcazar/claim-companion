import type { BloodPressureReading } from "@/hooks/useBloodPressure";
import { classifyBP } from "@/hooks/useBloodPressure";

function escape(value: any): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(values: any[]): string {
  return values.map(escape).join(",");
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "paciente"
  );
}

export function exportBloodPressureToCSV(
  readings: BloodPressureReading[],
  pacienteNombre: string,
): { blob: Blob; filename: string } {
  const lines: string[] = [];

  lines.push(row(["Paciente", pacienteNombre]));
  lines.push(row(["Generado", fmtDateTime(new Date().toISOString())]));
  lines.push(row(["Total tomas", readings.length]));
  lines.push("");

  lines.push(row(["DETALLE"]));
  lines.push(
    row([
      "Fecha y hora",
      "Sistólica (mmHg)",
      "Diastólica (mmHg)",
      "Pulso (lpm)",
      "Categoría",
      "Posición",
      "Brazo",
      "Notas",
    ]),
  );

  // ordered chronologically ascending in CSV for easier analysis
  const sorted = [...readings].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
  );

  for (const r of sorted) {
    const cat = classifyBP(r.systolic, r.diastolic);
    lines.push(
      row([
        fmtDateTime(r.taken_at),
        r.systolic,
        r.diastolic,
        r.pulse ?? "",
        cat.label,
        r.position ?? "",
        r.arm ?? "",
        r.notes ?? "",
      ]),
    );
  }

  const csv = "\ufeff" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const filename = `presion_${slug(pacienteNombre)}_${ymd}.csv`;

  return { blob, filename };
}