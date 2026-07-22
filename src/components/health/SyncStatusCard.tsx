import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, RefreshCw, WifiOff } from "lucide-react";
import { useHealthDevices } from "@/hooks/useHealthDevices";
import { toast } from "sonner";
import { useAutoRetrySync } from "@/hooks/useAutoRetrySync";
import { AutoRetryStatusCard } from "@/components/health/AutoRetryStatusCard";

type Props = {
  totalReadingsInRange: number;
};

/** Estado consolidado de la última sincronización con Apple Health / Health Connect. */
export function SyncStatusCard({ totalReadingsInRange }: Props) {
  const { platform, available, lastSyncedAt, sync } = useHealthDevices();
  const retry = useAutoRetrySync(async () => {
    await sync.mutateAsync();
  });

  const status: "ok" | "error" | "pending" | "never" | "unavailable" =
    !available && platform === "web"
      ? "unavailable"
      : sync.isPending
        ? "pending"
        : sync.isError
          ? "error"
          : lastSyncedAt
            ? "ok"
            : "never";

  const label: Record<typeof status, string> = {
    ok: "Sincronizado",
    error: "Con errores",
    pending: "Sincronizando…",
    never: "Sin sincronizar",
    unavailable: "No disponible",
  };

  const variant: Record<typeof status, "default" | "secondary" | "destructive" | "outline"> = {
    ok: "default",
    error: "destructive",
    pending: "secondary",
    never: "outline",
    unavailable: "secondary",
  };

  const handleRetry = async () => {
    try {
      const res = await sync.mutateAsync();
      toast.success(`Sincronizado: ${res.total} registros`);
      retry.cancel();
    } catch (err: any) {
      const msg = err?.message ?? "Error al sincronizar";
      toast.error(msg);
      retry.start(msg);
    }
  };

  const canRetry = available && platform !== "web";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {status === "ok" ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : status === "error" ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : status === "unavailable" ? (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <RefreshCw className="h-4 w-4 text-primary" />
          )}
          Estado de importación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Estado</span>
          <Badge variant={variant[status]}>{label[status]}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Última sincronización</span>
          <span className="font-medium">
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("es-MX") : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Registros en rango</span>
          <span className="font-medium">{totalReadingsInRange}</span>
        </div>

        {sync.isError && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {(sync.error as any)?.message ?? "Error desconocido al sincronizar."}
          </div>
        )}

        {status === "unavailable" ? (
          <p className="text-xs text-muted-foreground">
            Abrí la app móvil para importar desde Apple Health o Health Connect.
          </p>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleRetry}
            disabled={!canRetry || sync.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />
            {sync.isPending ? "Sincronizando…" : sync.isError ? "Reintentar" : "Sincronizar ahora"}
          </Button>
        )}
      </CardContent>
      {(retry.state.active || retry.state.lastError) && (
        <div className="px-6 pb-4">
          <AutoRetryStatusCard
            state={retry.state}
            onRetryNow={retry.retryNow}
            onCancel={retry.cancel}
          />
        </div>
      )}
    </Card>
  );
}