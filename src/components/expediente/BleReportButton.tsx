import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Descarga un PDF con las lecturas BLE validadas del paciente para la aseguradora. */
export function BleReportButton({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ble-report-pdf", {
        body: { patient_id: patientId },
      });
      if (error) throw error;
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(await (data as Blob).arrayBuffer());
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lecturas-ble-${(patientName ?? patientId).replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Reporte descargado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Descargar PDF de lecturas para aseguradora
    </Button>
  );
}