import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

const TABLES = [
  { table: "heart_rate_readings", time: "measured_at", label: "Frecuencia cardíaca", cols: ["bpm"] },
  { table: "spo2_readings", time: "taken_at", label: "SpO₂", cols: ["spo2"] },
  { table: "blood_pressure_readings", time: "taken_at", label: "Presión arterial", cols: ["systolic", "diastolic"] },
  { table: "temperature_readings", time: "taken_at", label: "Temperatura", cols: ["temperature_c"] },
  { table: "glucose_readings", time: "taken_at", label: "Glucosa", cols: ["glucose_mg_dl"] },
  { table: "activity_readings", time: "fecha", label: "Actividad / Sueño", cols: ["steps", "active_minutes", "sleep_minutes"] },
] as const;

export function ImportedReadingsPdfExport() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;

  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(format(monthAgo, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [device, setDevice] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const devicesQ = useQuery({
    queryKey: ["exp-devices", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const names = new Set<string>();
      for (const t of TABLES) {
        const { data } = await supabase
          .from(t.table as any)
          .select("device_name")
          .eq("patient_id", patientId!)
          .not("device_name", "is", null)
          .limit(500);
        (data as any[])?.forEach((r) => r.device_name && names.add(r.device_name));
      }
      return Array.from(names).sort();
    },
  });

  const handleExport = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const fromISO = new Date(from).toISOString();
      const toISO = new Date(to + "T23:59:59").toISOString();

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", patientId)
        .maybeSingle();

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Historial de lecturas importadas", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Paciente: ${(profile as any)?.full_name ?? "—"}`, 14, 25);
      doc.text(`Rango: ${from} → ${to}`, 14, 30);
      doc.text(`Dispositivo: ${device === "all" ? "Todos" : device}`, 14, 35);
      doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 40);

      let cursorY = 48;
      let grandTotal = 0;

      for (const t of TABLES) {
        let q = supabase
          .from(t.table as any)
          .select(`${t.time}, source, device_name, ${t.cols.join(", ")}`)
          .eq("patient_id", patientId)
          .gte(t.time, t.time === "fecha" ? from : fromISO)
          .lte(t.time, t.time === "fecha" ? to : toISO)
          .order(t.time, { ascending: true });
        if (device !== "all") q = q.eq("device_name", device);
        const { data } = await q;
        const rows = (data as any[]) ?? [];
        if (!rows.length) continue;
        grandTotal += rows.length;

        doc.setFontSize(12);
        doc.setTextColor(20);
        if (cursorY > 260) { doc.addPage(); cursorY = 20; }
        doc.text(`${t.label} (${rows.length})`, 14, cursorY);

        autoTable(doc, {
          startY: cursorY + 3,
          head: [["Fecha", ...t.cols, "Fuente", "Dispositivo"]],
          body: rows.map((r) => [
            typeof r[t.time] === "string" && r[t.time].length > 10
              ? format(new Date(r[t.time]), "dd/MM/yyyy HH:mm")
              : r[t.time],
            ...t.cols.map((c) => r[c] ?? "—"),
            r.source ?? "manual",
            r.device_name ?? "—",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [20, 184, 166] },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 8;
      }

      if (grandTotal === 0) {
        toast.info("No hay lecturas para el rango/dispositivo seleccionados");
        return;
      }

      doc.setFontSize(9);
      doc.setTextColor(120);
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.text(`CareCentral · Página ${i}/${pages}`, 14, 290);
      }

      doc.save(`lecturas_${from}_${to}.pdf`);
      toast.success(`PDF listo (${grandTotal} lecturas)`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Exportar lecturas importadas a PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Genera un PDF listo para compartir con tu médico o aseguradora, filtrado por rango de fechas y dispositivo.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Dispositivo</Label>
            <Select value={device} onValueChange={setDevice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(devicesQ.data ?? []).map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          <FileDown className="h-4 w-4" />
          {loading ? "Generando..." : "Descargar PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}