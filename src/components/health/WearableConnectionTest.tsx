import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Moon,
  Play,
  RefreshCw,
  ShieldAlert,
  Wind,
  XCircle,
} from "lucide-react";
import {
  checkHealthAvailability,
  getPlatform,
  readSamples,
  requestHealthPermissions,
  type HealthMetric,
} from "@/lib/health";

type StepStatus = "pending" | "running" | "ok" | "warn" | "error";

type MetricStep = {
  key: HealthMetric;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: StepStatus;
  count?: number;
  sample?: string;
  hint?: string;
};

const METRICS: Omit<MetricStep, "status">[] = [
  { key: "heart_rate", label: "Frecuencia cardíaca (FC)", icon: HeartPulse },
  { key: "steps", label: "Pasos / actividad", icon: Activity },
  { key: "sleep", label: "Sueño", icon: Moon },
  { key: "spo2", label: "SpO₂ (oxigenación)", icon: Wind },
];

const METRIC_HINT: Record<string, string> = {
  heart_rate:
    "Abre la app del reloj (Mi Fitness / Zepp / Health / Fitbit) y forzá una sincronización. Confirmá que la lectura de FC aparece en Health Connect o Apple Salud antes de reintentar.",
  steps:
    "Revisá que la app del reloj tenga permiso de 'Actividad física' y esté escribiendo Pasos en Health Connect (Android) o Apple Salud (iOS).",
  sleep:
    "El sueño solo aparece si usaste el reloj durante la noche y la app del fabricante lo subió. En Health Connect verificá permiso de 'Sueño'.",
  spo2:
    "No todos los relojes económicos exponen SpO₂ a Health Connect. Activá 'Medición manual de SpO₂' en la app del reloj y forzá una lectura.",
};

export function WearableConnectionTest() {
  const platform = getPlatform();
  const [running, setRunning] = useState(false);
  const [permStatus, setPermStatus] = useState<StepStatus>("pending");
  const [availStatus, setAvailStatus] = useState<StepStatus>("pending");
  const [steps, setSteps] = useState<MetricStep[]>(
    METRICS.map((m) => ({ ...m, status: "pending" }))
  );
  const [finalError, setFinalError] = useState<string | null>(null);

  const platformLabel =
    platform === "ios" ? "Apple HealthKit" : platform === "android" ? "Google Health Connect" : "Web (no disponible)";

  const setStep = (key: HealthMetric, patch: Partial<MetricStep>) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const run = async () => {
    setRunning(true);
    setFinalError(null);
    setSteps(METRICS.map((m) => ({ ...m, status: "pending" })));
    setPermStatus("running");
    setAvailStatus("running");

    try {
      const available = await checkHealthAvailability();
      setAvailStatus(available ? "ok" : "error");
      if (!available) {
        setFinalError(
          platform === "web"
            ? "Health Connect / Apple Salud solo están disponibles en la app móvil de CareCentral. Instalá la app en tu teléfono y volvé a probar."
            : "El sistema no expone Health Connect / Apple Salud. Verificá que Health Connect esté instalado y actualizado (Play Store)."
        );
        setRunning(false);
        return;
      }

      const granted = await requestHealthPermissions();
      setPermStatus(granted ? "ok" : "error");
      if (!granted) {
        setFinalError(
          "No se otorgaron permisos. Abrí Ajustes → Health Connect (o Salud) → CareCentral y activá lectura de Frecuencia cardíaca, Pasos, Sueño y SpO₂."
        );
        setRunning(false);
        return;
      }

      const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const to = new Date();

      for (const m of METRICS) {
        setStep(m.key, { status: "running" });
        try {
          const samples = await readSamples(m.key, from, to);
          if (samples.length === 0) {
            setStep(m.key, {
              status: "warn",
              count: 0,
              hint: METRIC_HINT[m.key],
            });
          } else {
            const last = samples[samples.length - 1];
            setStep(m.key, {
              status: "ok",
              count: samples.length,
              sample: `Última: ${Math.round(last.value)}${
                m.key === "spo2" ? "%" : m.key === "heart_rate" ? " lpm" : ""
              } · ${new Date(last.measured_at).toLocaleDateString("es-MX")}`,
            });
          }
        } catch (err: any) {
          setStep(m.key, {
            status: "error",
            hint: err?.message ?? "Error leyendo esta métrica.",
          });
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const StatusBadge = ({ s }: { s: StepStatus }) => {
    if (s === "ok") return <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> Detectado</Badge>;
    if (s === "warn") return <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/40"><ShieldAlert className="h-3 w-3" /> Sin datos</Badge>;
    if (s === "error") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
    if (s === "running") return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Probando…</Badge>;
    return <Badge variant="outline">Pendiente</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" /> Prueba paso a paso: reloj / smartband
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verificá permisos y qué métricas de tu wearable (FC, pasos, sueño, SpO₂) llegan a{" "}
          <span className="font-medium">{platformLabel}</span> y por tanto a CareCentral.
        </p>

        <Button onClick={run} disabled={running} className="w-full">
          {running ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Probando…</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-1" /> Iniciar prueba</>
          )}
        </Button>

        <ol className="space-y-2">
          <li className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">1</span>
              Salud disponible en el dispositivo
            </span>
            <StatusBadge s={availStatus} />
          </li>
          <li className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
              Permisos de lectura otorgados
            </span>
            <StatusBadge s={permStatus} />
          </li>
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <li key={s.key} className="rounded-md border p-2 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{3 + idx}</span>
                    <Icon className="h-4 w-4 text-muted-foreground" /> {s.label}
                  </span>
                  <StatusBadge s={s.status} />
                </div>
                {s.status === "ok" && s.sample && (
                  <div className="text-xs text-muted-foreground pl-8">
                    {s.count} muestras · {s.sample}
                  </div>
                )}
                {(s.status === "warn" || s.status === "error") && s.hint && (
                  <div className="text-xs text-muted-foreground pl-8">{s.hint}</div>
                )}
              </li>
            );
          })}
        </ol>

        {finalError && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>No se pudo completar la prueba</AlertTitle>
            <AlertDescription className="text-xs">{finalError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}