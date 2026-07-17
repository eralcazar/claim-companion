import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { classifyAgainstRange, useHrAlertSettings } from "@/hooks/useHrAlerts";
import type { UnifiedReading } from "@/hooks/useUnifiedReadings";

export function HrAlertsBanner({ readings }: { readings: UnifiedReading[] }) {
  const { data: settings } = useHrAlertSettings();

  const outOfRange = useMemo(() => {
    if (!settings || !settings.enabled) return [];
    return readings
      .filter((r) => r.kind === "heart_rate" && typeof r.value === "number")
      .map((r) => ({
        id: r.id,
        bpm: r.value as number,
        measured_at: r.measured_at,
        source: r.source,
        kind: classifyAgainstRange(r.value as number, settings),
      }))
      .filter((r) => r.kind !== "in_range")
      .slice(0, 6);
  }, [readings, settings]);

  if (!settings?.enabled || outOfRange.length === 0) return null;

  const lows = outOfRange.filter((r) => r.kind === "low").length;
  const highs = outOfRange.filter((r) => r.kind === "high").length;

  return (
    <Alert variant="destructive" className="border-destructive/40">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Lecturas fuera de tu rango ({settings.min_bpm}–{settings.max_bpm} lpm)
        <Badge variant="outline">{outOfRange.length}</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <div className="text-xs">
          {highs > 0 && <span>{highs} elevadas</span>}
          {highs > 0 && lows > 0 && <span> · </span>}
          {lows > 0 && <span>{lows} bajas</span>}
        </div>
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {outOfRange.map((r) => (
            <li
              key={r.id}
              className="rounded border border-destructive/30 bg-destructive/5 px-2 py-1 flex items-center justify-between gap-2"
            >
              <span className="font-medium">
                {r.bpm} lpm{" "}
                <Badge
                  variant="outline"
                  className="ml-1 h-4 px-1 text-[10px] uppercase"
                >
                  {r.kind === "high" ? "alta" : "baja"}
                </Badge>
              </span>
              <span className="text-muted-foreground">
                {new Date(r.measured_at).toLocaleString("es-MX", {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}