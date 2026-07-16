import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

type RiskItem = {
  kind: string;
  taken_at: string;
  summary: string;
  severity: "warning" | "critical";
  status: "pendiente" | "revisada" | "mitigada";
  id: string;
};

function bpSeverity(sys: number, dia: number): "warning" | "critical" | null {
  if (sys >= 180 || dia >= 120) return "critical";
  if (sys >= 140 || dia >= 90 || sys < 90 || dia < 60) return "warning";
  return null;
}
function spo2Severity(v: number): "warning" | "critical" | null {
  if (v < 88) return "critical";
  if (v < 92) return "warning";
  return null;
}
function tempSeverity(v: number): "warning" | "critical" | null {
  if (v >= 39.5 || v < 35) return "critical";
  if (v >= 38 || v < 36) return "warning";
  return null;
}
function glucoseSeverity(v: number): "warning" | "critical" | null {
  if (v < 55 || v > 300) return "critical";
  if (v < 70 || v > 180) return "warning";
  return null;
}

function statusFromReading(r: any): "pendiente" | "revisada" | "mitigada" {
  if (r.requires_review) return "pendiente";
  if (r.review_notes) return "mitigada";
  return "revisada";
}

/**
 * Panel de alertas clínicas basado en lecturas con criterio de riesgo.
 * Escanea las lecturas recientes (últimos 30 días) y muestra cuáles caen en
 * rangos de advertencia o críticos, junto con su estado de revisión.
 */
export function ClinicalRiskPanel({ patientId }: { patientId: string }) {
  const q = useQuery({
    queryKey: ["clinical_risk", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [bp, spo2, temp, glu] = await Promise.all([
        supabase.from("blood_pressure_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since),
        supabase.from("spo2_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since),
        supabase.from("temperature_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since),
        supabase.from("glucose_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since),
      ]);
      const items: RiskItem[] = [];
      (bp.data ?? []).forEach((r: any) => {
        const sev = bpSeverity(r.systolic, r.diastolic);
        if (sev) items.push({ kind: "Presión", taken_at: r.taken_at, id: r.id, severity: sev, status: statusFromReading(r), summary: `${r.systolic}/${r.diastolic} mmHg` });
      });
      (spo2.data ?? []).forEach((r: any) => {
        const sev = spo2Severity(r.spo2);
        if (sev) items.push({ kind: "SpO₂", taken_at: r.taken_at, id: r.id, severity: sev, status: statusFromReading(r), summary: `${r.spo2}%` });
      });
      (temp.data ?? []).forEach((r: any) => {
        const sev = tempSeverity(r.temperature_c);
        if (sev) items.push({ kind: "Temperatura", taken_at: r.taken_at, id: r.id, severity: sev, status: statusFromReading(r), summary: `${r.temperature_c} °C` });
      });
      (glu.data ?? []).forEach((r: any) => {
        const sev = glucoseSeverity(r.glucose_mg_dl);
        if (sev) items.push({ kind: "Glucosa", taken_at: r.taken_at, id: r.id, severity: sev, status: statusFromReading(r), summary: `${r.glucose_mg_dl} mg/dL` });
      });
      return items.sort((a, b) => (a.taken_at < b.taken_at ? 1 : -1));
    },
  });

  const items = q.data ?? [];
  const counts = useMemo(() => ({
    critical: items.filter((i) => i.severity === "critical").length,
    warning: items.filter((i) => i.severity === "warning").length,
    pending: items.filter((i) => i.status === "pendiente").length,
  }), [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Lecturas con criterio de riesgo (30 días)</h3>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="destructive">Críticas: {counts.critical}</Badge>
        <Badge>Advertencias: {counts.warning}</Badge>
        <Badge variant="secondary">Pendientes: {counts.pending}</Badge>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sin lecturas de riesgo recientes.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <Card key={`${i.kind}-${i.id}`} className={i.severity === "critical" ? "border-destructive" : ""}>
              <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={i.severity === "critical" ? "destructive" : "default"}>{i.kind}</Badge>
                  <span className="font-medium">{i.summary}</span>
                  <span className="text-xs text-muted-foreground">{new Date(i.taken_at).toLocaleString("es-MX")}</span>
                </div>
                <Badge variant={i.status === "pendiente" ? "secondary" : i.status === "mitigada" ? "default" : "outline"}>
                  {i.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}