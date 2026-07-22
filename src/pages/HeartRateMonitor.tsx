import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartPulse, RefreshCw, Bluetooth, Pencil } from "lucide-react";
import { ManualHeartRateForm } from "@/components/health/ManualHeartRateForm";
import { HeartRateCsvImporter } from "@/components/health/HeartRateCsvImporter";
import { HeartRatePdfExport } from "@/components/health/HeartRatePdfExport";
import { HrAlertsBanner } from "@/components/health/HrAlertsBanner";
import { HrAlertSettingsCard } from "@/components/health/HrAlertSettingsCard";
import { HealthDevicesPanel } from "@/components/profile/HealthDevicesPanel";
import { UnifiedTimelineChart } from "@/components/health/UnifiedTimelineChart";
import { BleHeartRateConnect } from "@/components/health/BleHeartRateConnect";
import { useUnifiedReadings, SOURCE_LABEL } from "@/hooks/useUnifiedReadings";
import { useHeartRateReadings, classifyHR } from "@/hooks/useHeartRate";

const RANGES = [
  { key: "1", label: "24 h" },
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
] as const;

/**
 * Monitor dedicado de Frecuencia Cardíaca:
 * captura manual, streaming BLE en vivo (perfil GATT 0x180D), importación CSV
 * y visualización con clasificación clínica.
 */
export default function HeartRateMonitor() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  const [rangeDays, setRangeDays] = useState<string>("7");

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
  const hr = useHeartRateReadings(patientId, 500);

  const hrInRange = useMemo(
    () => readings.filter((r) => r.kind === "heart_rate"),
    [readings],
  );

  const stats = useMemo(() => {
    const values = hrInRange
      .map((r) => (typeof r.value === "number" ? r.value : Number.NaN))
      .filter((n) => Number.isFinite(n));
    if (!values.length) return null;
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return {
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }, [hrInRange]);

  const sourcesCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of hrInRange) m.set(r.source, (m.get(r.source) ?? 0) + 1);
    return Array.from(m.entries());
  }, [hrInRange]);

  const recent = (hr.data ?? []).slice(0, 20);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-destructive" />
            Monitor de frecuencia cardíaca
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra tus pulsaciones manualmente o conecta un dispositivo BLE (banda
            pectoral, pulsera o reloj compatible) para ver el pulso en vivo y guardarlo
            en tu expediente.
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

      <HrAlertsBanner readings={readings} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-destructive" /> Tendencia
                </span>
                <HeartRatePdfExport fromISO={fromISO} toISO={toISO} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded border p-2">
                    <div className="text-xs text-muted-foreground">Promedio</div>
                    <div className="text-lg font-bold tabular-nums">{stats.avg}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-xs text-muted-foreground">Mín</div>
                    <div className="text-lg font-bold tabular-nums">{stats.min}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-xs text-muted-foreground">Máx</div>
                    <div className="text-lg font-bold tabular-nums">{stats.max}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-xs text-muted-foreground">Lecturas</div>
                    <div className="text-lg font-bold tabular-nums">{stats.count}</div>
                  </div>
                </div>
              )}
              <UnifiedTimelineChart
                readings={readings}
                kind="heart_rate"
                windowHours={24}
              />
              {sourcesCount.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sourcesCount.map(([src, n]) => (
                    <Badge key={src} variant="outline" className="text-xs">
                      {SOURCE_LABEL[src as keyof typeof SOURCE_LABEL] ?? src}: {n}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="ble">
            <TabsList>
              <TabsTrigger value="ble" className="gap-1">
                <Bluetooth className="h-3.5 w-3.5" /> Dispositivo BLE
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Manual
              </TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="ble" className="pt-3">
              <BleHeartRateConnect />
            </TabsContent>
            <TabsContent value="manual" className="pt-3">
              <ManualHeartRateForm />
            </TabsContent>
            <TabsContent value="csv" className="pt-3">
              <HeartRateCsvImporter />
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimas lecturas</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aún no hay lecturas de frecuencia cardíaca en tu expediente.
                </p>
              ) : (
                <ul className="divide-y">
                  {recent.map((r) => {
                    const c = classifyHR(r.bpm);
                    return (
                      <li key={r.id} className="flex items-center justify-between py-2 text-sm gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold tabular-nums w-14">
                            {r.bpm} bpm
                          </span>
                          <Badge className={c.className}>{c.label}</Badge>
                          {r.source && (
                            <Badge variant="outline" className="text-[10px]">
                              {SOURCE_LABEL[r.source as keyof typeof SOURCE_LABEL] ?? r.source}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(r.measured_at).toLocaleString("es-MX")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <HrAlertSettingsCard />
          <HealthDevicesPanel />
        </aside>
      </div>
    </div>
  );
}