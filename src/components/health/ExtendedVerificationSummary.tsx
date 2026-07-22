import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, X } from "lucide-react";
import { useConnectionTestHistory } from "@/hooks/useConnectionTestHistory";
import type { ExtendedRun } from "@/hooks/useExtendedVerification";

const METRICS = ["heart_rate", "steps", "sleep", "spo2"] as const;
const LABEL: Record<string, string> = {
  heart_rate: "FC", steps: "Pasos", sleep: "Sueño", spo2: "SpO₂",
};

function fmtCountdown(ms: number) {
  if (ms <= 0) return "ahora";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)} min`;
}

export function ExtendedVerificationSummary({ state, onCancel }: { state: ExtendedRun; onCancel: () => void }) {
  const { list } = useConnectionTestHistory(50);
  if (!state.run_id) return null;
  const runTests = (list.data ?? []).filter((t) => t.run_id === state.run_id);

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" /> Verificación extendida
          <Badge variant={state.active ? "secondary" : "outline"} className="text-xs">
            {state.active ? `Paso ${state.step + 1}/${state.intervals_min.length}` : "Finalizada"}
          </Badge>
          {state.active && (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-[auto_repeat(4,_1fr)] gap-1 text-xs">
          <div className="font-medium">Intervalo</div>
          {METRICS.map((m) => (
            <div key={m} className="font-medium text-center">{LABEL[m]}</div>
          ))}
          {state.intervals_min.map((mins, i) => {
            const t = runTests[i];
            const scheduled = !state.completed.includes(i) && state.active;
            const nextMs = i === state.step && state.next_at ? state.next_at - Date.now() : 0;
            return (
              <FragmentRow key={i} mins={mins} scheduled={scheduled} nextMs={nextMs} test={t} />
            );
          })}
        </div>
        {!state.active && state.run_id && (
          <div className="text-xs text-muted-foreground">
            Ya podés compartir el resumen desde el historial (PDF por cada prueba).
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FragmentRow({ mins, scheduled, nextMs, test }: {
  mins: number;
  scheduled: boolean;
  nextMs: number;
  test: any;
}) {
  return (
    <>
      <div className="text-xs py-1">
        {mins} min {scheduled && nextMs > 0 && <span className="text-muted-foreground">(en {fmtCountdown(nextMs)})</span>}
      </div>
      {METRICS.map((m) => {
        const metric = test?.metrics?.find((x: any) => x.metric === m);
        if (!test) return <div key={m} className="text-center text-muted-foreground">·</div>;
        if (!metric) return <div key={m} className="text-center text-muted-foreground">—</div>;
        const cls =
          metric.status === "ok"
            ? "text-emerald-600"
            : metric.status === "warn"
              ? "text-amber-600"
              : "text-destructive";
        return (
          <div key={m} className={`text-center text-xs ${cls}`}>
            {metric.status === "ok" ? `${metric.samples_count}` : metric.status === "warn" ? "0" : "×"}
          </div>
        );
      })}
    </>
  );
}