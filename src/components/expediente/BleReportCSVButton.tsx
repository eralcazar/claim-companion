import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = Record<string, unknown>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

/**
 * Descarga las lecturas BLE validadas del paciente en formato CSV para la
 * aseguradora o el broker. Sólo incluye lecturas con requires_review = false.
 */
export function BleReportCSVButton({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const tables = [
        "blood_pressure_readings",
        "spo2_readings",
        "temperature_readings",
        "glucose_readings",
        "heart_rate_readings",
        "activity_readings",
      ] as const;
      const all: Row[] = [];
      for (const t of tables) {
        const { data, error } = await supabase
          .from(t as any)
          .select("*")
          .eq("patient_id", patientId)
          .eq("requires_review", false)
          .order("taken_at", { ascending: false });
        if (error) continue;
        (data ?? []).forEach((r: any) => all.push({ tipo: t.replace("_readings", ""), ...r }));
      }
      if (all.length === 0) {
        toast.info("Sin lecturas validadas para exportar");
        return;
      }
      const blob = new Blob([toCsv(all)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lecturas-ble-${(patientName ?? patientId).replace(/\s+/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${all.length} lecturas`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Descargar CSV de lecturas validadas
    </Button>
  );
}