import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

const TABLES = [
  { table: "heart_rate_readings", time: "measured_at", label: "Frecuencia cardíaca", cols: ["bpm"] },
  { table: "spo2_readings", time: "taken_at", label: "SpO2", cols: ["spo2"] },
  { table: "blood_pressure_readings", time: "taken_at", label: "Presión arterial", cols: ["systolic", "diastolic"] },
  { table: "temperature_readings", time: "taken_at", label: "Temperatura", cols: ["temperature_c"] },
  { table: "glucose_readings", time: "taken_at", label: "Glucosa", cols: ["glucose_mg_dl"] },
  { table: "activity_readings", time: "fecha", label: "Actividad", cols: ["steps", "active_minutes", "sleep_minutes"] },
] as const;

function csvEscape(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function ImportedReadingsCsvExport() {
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
    queryKey: ["csv-devices", patientId],
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

      const header = ["metrica", "fecha", "valor1", "valor2", "valor3", "unidad", "fuente", "dispositivo"];
      const lines: string[] = [header.join(",")];
      let total = 0;

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
        for (const r of rows) {
          lines.push([
            t.label,
            r[t.time],
            r[t.cols[0]] ?? "",
            t.cols[1] ? r[t.cols[1]] ?? "" : "",
            t.cols[2] ? r[t.cols[2]] ?? "" : "",
            t.cols[0],
            r.source ?? "manual",
            r.device_name ?? "",
          ].map(csvEscape).join(","));
          total++;
        }
      }

      if (total === 0) {
        toast.info("No hay lecturas para el rango/dispositivo seleccionados");
        return;
      }

      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lecturas_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`CSV listo (${total} lecturas)`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-primary" /> Exportar lecturas a CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Descarga un CSV compatible con Excel/Sheets, filtrado por rango y dispositivo.
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
        <Button onClick={handleExport} disabled={loading} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          {loading ? "Generando..." : "Descargar CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}