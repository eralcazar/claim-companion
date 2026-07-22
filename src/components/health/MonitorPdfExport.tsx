import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

export type KpiItem = { label: string; value: string };
export type SeriesRow = { fecha: string; value: number; source?: string | null; device?: string | null };

interface Props {
  title: string;
  subtitle?: string;
  unit: string;
  kpis: KpiItem[];
  data: SeriesRow[];
  patientLabel?: string;
  fileName?: string;
  goal?: number | null;
}

/**
 * Exporta a PDF el resumen de un monitor (sueño, pasos, pulso...) con KPIs
 * y la tabla de valores diarios (últimos 30 registros o rango solicitado).
 */
export function MonitorPdfExport({
  title,
  subtitle,
  unit,
  kpis,
  data,
  patientLabel,
  fileName,
  goal,
}: Props) {
  const handleExport = () => {
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleString("es-MX");

      doc.setFontSize(16);
      doc.text(title, 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(90);
      if (subtitle) doc.text(subtitle, 14, 25);
      doc.text(`Generado: ${now}`, 14, subtitle ? 31 : 25);
      if (patientLabel) doc.text(`Paciente: ${patientLabel}`, 14, subtitle ? 37 : 31);

      const startY = subtitle ? (patientLabel ? 44 : 38) : (patientLabel ? 38 : 32);

      // KPIs
      autoTable(doc, {
        startY,
        head: [["Indicador", "Valor"]],
        body: kpis.map((k) => [k.label, k.value]),
        theme: "grid",
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 10 },
      });

      // Serie diaria
      const afterKpi = (doc as any).lastAutoTable?.finalY ?? startY + 40;
      autoTable(doc, {
        startY: afterKpi + 8,
        head: [["Fecha", `Valor (${unit})`, "Fuente", "Dispositivo"]],
        body: data.map((r) => [
          new Date(r.fecha + "T00:00:00").toLocaleDateString("es-MX"),
          r.value.toLocaleString("es-MX"),
          r.source ?? "—",
          r.device ?? "—",
        ]),
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 },
      });

      if (goal != null) {
        const y = (doc as any).lastAutoTable?.finalY ?? 100;
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(`Meta diaria: ${goal.toLocaleString("es-MX")} ${unit}`, 14, y + 8);
      }

      doc.save(fileName ?? `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF generado");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar PDF");
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={!data.length}>
      <FileDown className="h-4 w-4 mr-1" />
      Descargar PDF
    </Button>
  );
}