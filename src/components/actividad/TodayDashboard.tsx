import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, Flame, Footprints, Gauge, Heart, Moon, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActivityGoals } from "@/hooks/useActivity";
import { useUnifiedReadings } from "@/hooks/useUnifiedReadings";
import { useAuth } from "@/contexts/AuthContext";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function TodayDashboard() {
  const { user } = useAuth();
  const { data: goals } = useActivityGoals();
  const { from, to } = todayRange();
  const { data: readings } = useUnifiedReadings(user?.id, from, to);
  // Ventana de 7 días para BP/SpO2: los tensiómetros no se usan cada hora.
  const from7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: recent } = useUnifiedReadings(user?.id, from7, to, ["blood_pressure", "spo2"]);

  const steps = useMemo(
    () => (readings ?? []).filter((r) => r.kind === "steps").reduce((s, r) => s + r.value, 0),
    [readings],
  );
  const hrValues = useMemo(
    () => (readings ?? []).filter((r) => r.kind === "heart_rate").map((r) => r.value),
    [readings],
  );
  const hrAvg = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0;
  const spo2Values = (readings ?? []).filter((r) => r.kind === "spo2").map((r) => r.value);
  const spo2Avg = spo2Values.length ? Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length) : 0;

  const bpList = (recent ?? []).filter((r) => r.kind === "blood_pressure");
  const lastBp = bpList[bpList.length - 1];
  const lastSpo2 = [...(recent ?? []).filter((r) => r.kind === "spo2")].pop();

  const bpAlert = lastBp && (lastBp.value >= 140 || (lastBp.value2 ?? 0) >= 90);
  const spo2Alert = lastSpo2 && lastSpo2.value < 92;

  const stepsGoal = goals?.steps_goal ?? 8000;
  const stepsPct = Math.min(100, Math.round((steps / stepsGoal) * 100));
  const caloriesEst = Math.round(steps * 0.04);
  const activeMin = Math.round(steps / 100);
  const activeGoal = goals?.active_minutes_goal ?? 30;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" /> Pasos hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold">{steps.toLocaleString("es-MX")}</div>
          <div className="text-xs text-muted-foreground">Meta: {stepsGoal.toLocaleString("es-MX")}</div>
          <Progress value={stepsPct} aria-label="Progreso de pasos" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent" /> Minutos activos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold">{activeMin}</div>
          <div className="text-xs text-muted-foreground">Meta: {activeGoal} min</div>
          <Progress value={Math.min(100, (activeMin / activeGoal) * 100)} aria-label="Progreso minutos activos" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" /> Calorías estimadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{caloriesEst}</div>
          <div className="text-xs text-muted-foreground">Basado en tus pasos</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> Frecuencia cardiaca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{hrAvg || "—"} <span className="text-sm font-normal text-muted-foreground">bpm</span></div>
          <div className="text-xs text-muted-foreground">Promedio del día</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" /> SpO₂
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{spo2Avg || "—"}<span className="text-sm font-normal text-muted-foreground">%</span></div>
          <div className="text-xs text-muted-foreground">
            {lastSpo2
              ? `Última: ${lastSpo2.value}% · ${lastSpo2.source} ${lastSpo2.device_name ? `· ${lastSpo2.device_name}` : ""}`
              : "Promedio del día"}
          </div>
          {spo2Alert && (
            <div className="mt-2 flex items-start gap-1 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              SpO₂ por debajo de 92%. Reposá y considerá contactar a tu médico antes de ejercicio intenso.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> Presión arterial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {lastBp ? `${lastBp.value}/${lastBp.value2}` : "—"}
            <span className="text-sm font-normal text-muted-foreground"> mmHg</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {lastBp
              ? `${new Date(lastBp.measured_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} · ${lastBp.source}`
              : "Sin lecturas en 7 días"}
          </div>
          {lastBp?.source === "ble" && (
            <Badge variant="secondary" className="mt-1 text-[10px]">Dispositivo homologado</Badge>
          )}
          {bpAlert && (
            <div className="mt-2 flex items-start gap-1 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Presión elevada (≥140/90). Evitá ejercicio de alta intensidad y revisá con tu médico.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" /> Sueño
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">—</div>
          <div className="text-xs text-muted-foreground">Meta: {Math.round((goals?.sleep_minutes_goal ?? 420) / 60)} h. Sincroniza con Apple Health o Health Connect.</div>
        </CardContent>
      </Card>
    </div>
  );
}