import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlarmClock, RefreshCw, XCircle } from "lucide-react";
import type { AutoRetryState } from "@/hooks/useAutoRetrySync";
import { useEffect, useState } from "react";

function fmtCountdown(ms: number) {
  if (ms <= 0) return "ahora";
  const s = Math.round(ms / 1000);
  if (s < 60) return `en ${s}s`;
  const m = Math.round(s / 60);
  return `en ${m} min`;
}

type Props = {
  state: AutoRetryState;
  onRetryNow: () => void;
  onCancel: () => void;
};

export function AutoRetryStatusCard({ state, onRetryNow, onCancel }: Props) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!state.active || !state.nextAttemptAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.active, state.nextAttemptAt]);

  if (!state.active && state.attempt === 0 && !state.lastError) return null;

  const exhausted = !state.active && state.attempt >= state.maxAttempts;
  const remaining = state.nextAttemptAt ? state.nextAttemptAt - Date.now() : 0;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-amber-600" />
          Reintentos automáticos de importación
          <Badge variant={exhausted ? "destructive" : "secondary"} className="text-xs">
            {exhausted
              ? "Agotados"
              : state.active
                ? `Reintento ${state.attempt + 1}/${state.maxAttempts}`
                : "Detenidos"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {state.lastError && (
          <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs">
            <span className="font-medium">Motivo del último fallo:</span> {state.lastError}
          </div>
        )}
        {state.active && state.nextAttemptAt && (
          <div className="text-xs text-muted-foreground">
            Próximo intento {fmtCountdown(remaining)} ({new Date(state.nextAttemptAt).toLocaleTimeString("es-MX")})
          </div>
        )}
        {exhausted && (
          <div className="text-xs text-muted-foreground">
            Se agotaron los reintentos automáticos. Revisá el motivo y volvé a intentar manualmente.
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetryNow}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reintentar ya
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <XCircle className="h-4 w-4 mr-1" /> Cancelar reintentos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}