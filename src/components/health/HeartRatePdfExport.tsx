import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { classifyHR } from "@/hooks/useHeartRate";

type Props = {
  fromISO: string;
  toISO: string;
};

/** Exporta a PDF el historial de frecuencia cardiaca con citas asociadas. */
export function HeartRatePdfExport({ fromISO, toISO }: Props) {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [hrRes, apptRes, profRes] = await Promise.all([
        supabase
          .from("heart_rate_readings")
          .select("bpm, measured_at, context, source, device_name, notes")
          .eq("patient_id", patientId)
          .gte("measured_at", fromISO)
          .lte("measured_at", toISO)
          .order("measured_at", { ascending: true }),
        supabase
          .from("appointments")
          .select("title, appointment_date, doctor_name_manual, location, status")
          .eq("user_id", patientId)
          .gte("appointment_date", fromISO)
          .lte("appointment_date", toISO)
          .order("appointment_date", { ascending: true }),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", patientId)
          .maybeSingle(),
      ]);

      if (hrRes.error) throw hrRes.error;
      if (apptRes.error) throw apptRes.error;

      const hr = hrRes.data ?? [];
      const appts = apptRes.data ?? [];
      const prof = profRes.data ?? null;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.text("Historial de Frecuencia Cardiaca", pageW / 2, 40, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(
        `Paciente: ${prof?.full_name ?? "—"}   ·   ${prof?.email ?? ""}`,
        pageW / 2,
        58,
        { align: "center" },
      );
      doc.text(
        `Rango: ${new Date(fromISO).toLocaleDateString("es-MX")} — ${new Date(toISO).toLocaleDateString("es-MX")}`,
        pageW / 2,
        72,
        { align: "center" },
      );
      doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, pageW / 2, 86, {
        align: "center",
      });
      doc.setTextColor(0);

      // Summary stats
      const bpms = hr.map((r) => r.bpm).filter((n) => typeof n === "number");
      const avg = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0;
      const min = bpms.length ? Math.min(...bpms) : 0;
      const max = bpms.length ? Math.max(...bpms) : 0;

      doc.setFontSize(11);
      doc.text(
        `Registros: ${hr.length}   ·   Promedio: ${avg} bpm   ·   Mín: ${min}   ·   Máx: ${max}`,
        40,
        110,
      );

      // Appointments table
      autoTable(doc, {
        startY: 128,
        head: [["Fecha", "Cita", "Profesional", "Estado"]],
        body: appts.map((a: any) => [
          new Date(a.appointment_date).toLocaleString("es-MX"),
          a.title ?? "Cita",
          a.doctor_name_manual ?? "—",
          a.status ?? "—",
        ]),
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 9 },
        margin: { left: 40, right: 40 },
        didDrawPage: (d) => {
          if (d.pageNumber === 1) {
            doc.setFontSize(11);
            doc.text("Citas en el rango", 40, 122);
          }
        },
      });

      // HR readings table + link to nearby appointment
      const windowMs = 24 * 3600 * 1000;
      const rowsHR = hr.map((r: any) => {
        const at = new Date(r.measured_at).getTime();
        const nearby = appts.find(
          (a: any) => Math.abs(new Date(a.appointment_date).getTime() - at) <= windowMs,
        );
        const cls = classifyHR(r.bpm);
        return [
          new Date(r.measured_at).toLocaleString("es-MX"),
          String(r.bpm),
          cls.label,
          r.context ?? "—",
          r.source ?? "—",
          nearby ? `${nearby.title ?? "Cita"} (${new Date(nearby.appointment_date).toLocaleDateString("es-MX")})` : "—",
        ];
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 24,
        head: [["Fecha/Hora", "BPM", "Clasificación", "Contexto", "Origen", "Cita asociada (±24h)"]],
        body: rowsHR,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            `CareCentral · Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 20,
            { align: "center" },
          );
          doc.setTextColor(0);
        },
      });

      const fname = `frecuencia_cardiaca_${new Date(fromISO)
        .toISOString()
        .slice(0, 10)}_${new Date(toISO).toISOString().slice(0, 10)}.pdf`;
      doc.save(fname);
      toast.success("PDF generado");
    } catch (err: any) {
      toast.error(err?.message ?? "Error al generar PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <FileDown className={`h-4 w-4 mr-1 ${loading ? "animate-pulse" : ""}`} />
      {loading ? "Generando..." : "Exportar PDF"}
    </Button>
  );
}