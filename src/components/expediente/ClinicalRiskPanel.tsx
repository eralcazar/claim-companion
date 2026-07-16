import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const defaultFrom = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const defaultTo = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [kinds, setKinds] = useState<string[]>(["Presión", "SpO₂", "Temperatura", "Glucosa"]);
  const [severity, setSeverity] = useState<"all" | "warning" | "critical">("all");

  const toggleKind = (k: string) =>
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const q = useQuery({
    queryKey: ["clinical_risk", patientId, from, to],
    enabled: !!patientId,
    queryFn: async () => {
      const since = `${from}T00:00:00.000Z`;
      const until = `${to}T23:59:59.999Z`;
      const [bp, spo2, temp, glu] = await Promise.all([
        supabase.from("blood_pressure_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since).lte("taken_at", until),
        supabase.from("spo2_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since).lte("taken_at", until),
        supabase.from("temperature_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since).lte("taken_at", until),
        supabase.from("glucose_readings" as any).select("*").eq("patient_id", patientId).gte("taken_at", since).lte("taken_at", until),
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

  const rawItems = q.data ?? [];
  const items = useMemo(
    () => rawItems.filter((i) => kinds.includes(i.kind) && (severity === "all" || i.severity === severity)),
    [rawItems, kinds, severity],
  );
  const counts = useMemo(() => ({
    critical: items.filter((i) => i.severity === "critical").length,
    warning: items.filter((i) => i.severity === "warning").length,
    pending: items.filter((i) => i.status === "pendiente").length,
  }), [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Lecturas con criterio de riesgo</h3>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>Severidad</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Sólo críticas</SelectItem>
                <SelectItem value="warning">Sólo advertencias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Tipos</Label>
            <div className="flex flex-wrap gap-2">
              {["Presión", "SpO₂", "Temperatura", "Glucosa"].map((k) => (
                <label key={k} className="flex items-center gap-1 text-xs cursor-pointer">
                  <Checkbox checked={kinds.includes(k)} onCheckedChange={() => toggleKind(k)} />
                  {k}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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