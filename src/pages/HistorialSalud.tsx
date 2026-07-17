import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartPulse, Activity, Calendar, RefreshCw, Stethoscope } from "lucide-react";
import { HealthDevicesPanel } from "@/components/profile/HealthDevicesPanel";
import { ManualHeartRateForm } from "@/components/health/ManualHeartRateForm";
import { HeartRateCsvImporter } from "@/components/health/HeartRateCsvImporter";
import { UnifiedTimelineChart } from "@/components/health/UnifiedTimelineChart";
import {
  KIND_LABEL,
  SOURCE_LABEL,
  useUnifiedReadings,
  type ReadingKind,
} from "@/hooks/useUnifiedReadings";

const RANGES = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
] as const;

const KINDS: ReadingKind[] = [
  "heart_rate",
  "blood_pressure",
  "spo2",
  "temperature",
  "glucose",
  "steps",
];

export default function HistorialSalud() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  const [rangeDays, setRangeDays] = useState<string>("30");
  const [tab, setTab] = useState<ReadingKind>("heart_rate");

  const { fromISO, toISO } = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.now() - Number(rangeDays) * 24 * 60 * 60 * 1000);
    return { fromISO: from.toISOString(), toISO: to.toISOString() };
  }, [rangeDays]);

  const { data: readings = [], isLoading, refetch } = useUnifiedReadings(
    patientId,
    fromISO,
    toISO,
  );

  const { data: appointments = [] } = useQuery({
    queryKey: ["historial-salud-appointments", patientId, fromISO, toISO],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, title, appointment_date, doctor_name_manual, location, status")
        .eq("user_id", patientId!)
        .gte("appointment_date", fromISO)
        .lte("appointment_date", toISO)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["historial-salud-meds", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, dosage, frequency, active")
        .eq("user_id", patientId!)
        .eq("active", true)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const c: Record<ReadingKind, number> = {
      heart_rate: 0, blood_pressure: 0, spo2: 0, temperature: 0, glucose: 0, steps: 0,
    };
    for (const r of readings) c[r.kind]++;
    return c;
  }, [readings]);

  const sourcesCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of readings.filter((x) => x.kind === tab)) {
      m.set(r.source, (m.get(r.source) ?? 0) + 1);
    }
    return Array.from(m.entries());
  }, [readings, tab]);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Historial de salud
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel unificado de tus lecturas (BLE, Apple Health, Health Connect, manual y CSV)
            junto a tus citas y medicamentos activos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={rangeDays === r.key ? "default" : "outline"}
              onClick={() => setRangeDays(r.key)}
            >
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tendencias</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as ReadingKind)}>
                <TabsList className="flex flex-wrap h-auto">
                  {KINDS.map((k) => (
                    <TabsTrigger key={k} value={k} className="text-xs gap-1">
                      {KIND_LABEL[k]}
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        {counts[k]}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {KINDS.map((k) => (
                  <TabsContent key={k} value={k} className="pt-4">
                    <UnifiedTimelineChart readings={readings} kind={k} />
                    {sourcesCount.length > 0 && k === tab && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {sourcesCount.map(([src, n]) => (
                          <Badge key={src} variant="outline" className="text-xs">
                            {SOURCE_LABEL[src as keyof typeof SOURCE_LABEL] ?? src}: {n}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <ManualHeartRateForm />
            <HeartRateCsvImporter />
          </div>
        </div>

        <aside className="space-y-4">
          <HealthDevicesPanel />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Citas en el rango
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm max-h-64 overflow-auto">
              {appointments.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin citas en este rango.</p>
              )}
              {appointments.map((a: any) => (
                <div key={a.id} className="rounded border p-2">
                  <div className="font-medium truncate">{a.title ?? "Cita"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.appointment_date).toLocaleString("es-MX")}
                  </div>
                  {a.doctor_name_manual && (
                    <div className="text-xs">{a.doctor_name_manual}</div>
                  )}
                  {a.status && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {a.status}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" /> Medicamentos activos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm max-h-56 overflow-auto">
              {medications.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin medicamentos activos.</p>
              )}
              {medications.map((m: any) => (
                <div key={m.id} className="rounded border p-2">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.dosage ?? ""} {m.frequency ? `· ${m.frequency}` : ""}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" /> Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Total de lecturas: <strong>{readings.length}</strong></div>
              <div className="text-xs text-muted-foreground">
                Rango: {new Date(fromISO).toLocaleDateString("es-MX")} —{" "}
                {new Date(toISO).toLocaleDateString("es-MX")}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}