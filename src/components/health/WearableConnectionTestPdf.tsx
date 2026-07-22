import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import type { ConnectionTest, ConnectionTestMetric } from "@/hooks/useConnectionTestHistory";

const METRIC_LABEL: Record<string, string> = {
  heart_rate: "Frecuencia cardiaca",
  steps: "Pasos / actividad",
  sleep: "Sueno",
  spo2: "SpO2 (oxigenacion)",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "Detectado",
  warn: "Sin datos",
  error: "Error",
};

export function generateConnectionTestPdf(test: ConnectionTest & { metrics?: ConnectionTestMetric[] }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(16);
  doc.text("CareCentral - Prueba de conexion con wearable", 40, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Fecha: ${new Date(test.tested_at).toLocaleString("es-MX")}`, 40, y); y += 14;
  doc.text(`Plataforma: ${test.platform ?? "-"}`, 40, y); y += 14;
  doc.text(`Disponibilidad: ${test.availability ? "OK" : "No disponible"}`, 40, y); y += 14;
  doc.text(`Resultado global: ${test.overall_status.toUpperCase()}`, 40, y); y += 14;
  doc.text(`Origen: ${test.trigger ?? "manual"}`, 40, y); y += 20;

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("Detalle por metrica", 40, y);
  y += 8;
  doc.setDrawColor(200);
  doc.line(40, y, W - 40, y);
  y += 14;
  doc.setFontSize(10);

  const rows = test.metrics ?? [];
  if (rows.length === 0) {
    doc.setTextColor(120);
    doc.text("Sin metricas registradas.", 40, y);
    y += 14;
  } else {
    for (const m of rows) {
      if (y > 760) { doc.addPage(); y = 40; }
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(METRIC_LABEL[m.metric] ?? m.metric, 40, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90);
      doc.text(STATUS_LABEL[m.status] ?? m.status, W - 120, y);
      y += 12;
      const info: string[] = [];
      info.push(`Muestras: ${m.samples_count}`);
      if (m.last_value != null) info.push(`Ultimo valor: ${m.last_value}`);
      if (m.last_at) info.push(`Ultima: ${new Date(m.last_at).toLocaleString("es-MX")}`);
      if (m.error_code) info.push(`Codigo: ${m.error_code}`);
      doc.setTextColor(110);
      doc.text(info.join(" - "), 50, y, { maxWidth: W - 90 });
      y += 12;
      if (m.error_message) {
        const lines = doc.splitTextToSize(`Error: ${m.error_message}`, W - 90);
        doc.text(lines, 50, y);
        y += lines.length * 11;
      }
      y += 6;
    }
  }

  y += 10;
  if (y > 720) { doc.addPage(); y = 40; }
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("Para soporte", 40, y);
  y += 8;
  doc.line(40, y, W - 40, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`ID de prueba: ${test.id}`, 40, y); y += 12;
  if (test.run_id) { doc.text(`ID de corrida (extendida): ${test.run_id}`, 40, y); y += 12; }
  doc.text(`Duracion: ${test.duration_ms ?? "-"} ms`, 40, y); y += 12;
  doc.text(`Navegador: ${typeof navigator !== "undefined" ? navigator.userAgent : "-"}`, 40, y, { maxWidth: W - 80 });

  const fname = `carecentral-prueba-conexion-${new Date(test.tested_at).toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}

export function DownloadConnectionTestPdfButton({ test, size = "sm", variant = "outline", label = "Descargar PDF" }: {
  test: ConnectionTest;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}) {
  return (
    <Button size={size} variant={variant} onClick={() => generateConnectionTestPdf(test)}>
      <FileDown className="h-4 w-4 mr-1" /> {label}
    </Button>
  );
}