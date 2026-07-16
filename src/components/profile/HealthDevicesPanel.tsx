import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHealthDevices } from "@/hooks/useHealthDevices";
import { Activity, RefreshCw, Smartphone, Unlink } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function HealthDevicesPanel() {
  const { platform, available, lastSyncedAt, requestPerms, sync, disconnect } = useHealthDevices();

  const isWeb = platform === "web";

  const handleConnect = async () => {
    const ok = await requestPerms.mutateAsync();
    if (ok) toast.success("Permisos otorgados");
    else toast.error("No se pudieron obtener los permisos");
  };

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      toast.success(`Sincronizado: ${res.total} registros`);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al sincronizar");
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await disconnect.mutateAsync();
      toast.success(`Desvinculado. Se eliminaron ${res.deleted} lecturas.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al desvincular");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> Dispositivos de salud
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Smartphone className="h-3.5 w-3.5" />
            {platform === "ios"
              ? "Apple Health"
              : platform === "android"
                ? "Health Connect"
                : "Web (no disponible)"}
          </span>
          <Badge variant={available ? "default" : "secondary"}>
            {available ? "Disponible" : "No disponible"}
          </Badge>
        </div>

        {isWeb ? (
          <p className="text-xs text-muted-foreground">
            Instalá la app móvil de CareCentral para sincronizar tu smartwatch (Apple Watch, Fitbit,
            Garmin, Xiaomi, Wear OS, etc.) vía Apple Health o Health Connect.
          </p>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleConnect}
              disabled={requestPerms.isPending}
            >
              {requestPerms.isPending ? "Solicitando..." : "Conectar / permisos"}
            </Button>
            <Button className="w-full" onClick={handleSync} disabled={sync.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />
              {sync.isPending ? "Sincronizando..." : "Sincronizar ahora"}
            </Button>
            {lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Última sincronización: {new Date(lastSyncedAt).toLocaleString("es-MX")}
              </p>
            )}

            {lastSyncedAt && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-destructive"
                    disabled={disconnect.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    {disconnect.isPending ? "Eliminando..." : "Desvincular y borrar datos"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desvincular dispositivo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán todas las lecturas sincronizadas desde Apple Health o Health
                      Connect (frecuencia cardíaca, SpO₂, presión, temperatura, glucosa y
                      actividad). Tus mediciones ingresadas manualmente no se verán afectadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>Desvincular</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}