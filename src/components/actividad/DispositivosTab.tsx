import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import { BleCompatibilityCheck } from "@/components/ble/BleCompatibilityCheck";
import { useMyDeviceVerifications } from "@/hooks/useDeviceVerifications";
import { useHealthDevices } from "@/hooks/useHealthDevices";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export function DispositivosTab() {
  const { data: verifs, isLoading } = useMyDeviceVerifications();
  const { sync, available } = useHealthDevices();

  const homologated = (verifs ?? []).filter((v) => v.status === "success");
  const partial = (verifs ?? []).filter((v) => v.status === "partial");

  const canSync = homologated.length > 0 && available;

  const handleSync = async () => {
    if (!canSync) {
      toast.error("Registrá al menos un dispositivo homologado (verificación exitosa) antes de sincronizar.");
      return;
    }
    try {
      const res = await sync.mutateAsync();
      toast.success(`Sincronizado: ${res.total} registros`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al sincronizar");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Mis dispositivos homologados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : homologated.length === 0 && partial.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenés dispositivos verificados. Escaneá abajo tu equipo y registrá la verificación
              antes de sincronizar mediciones a tu bitácora.
            </p>
          ) : (
            <ul className="space-y-2">
              {[...homologated, ...partial].map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium font-mono text-xs">{v.device_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(v.tested_at), "dd MMM yyyy", { locale: es })}
                      {v.firmware ? ` · fw ${v.firmware}` : ""}
                      {v.connection_method ? ` · ${v.connection_method}` : ""}
                    </div>
                  </div>
                  {v.status === "success" ? (
                    <Badge className="gap-1 bg-success/15 text-success">
                      <CheckCircle2 className="h-3 w-3" /> Homologado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldAlert className="h-3 w-3" /> Parcial
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Button onClick={handleSync} disabled={!canSync || sync.isPending} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />
            {sync.isPending ? "Sincronizando…" : "Sincronizar dispositivos homologados"}
          </Button>
          {!canSync && (
            <p className="text-xs text-muted-foreground">
              La sincronización se habilita cuando tenés al menos un dispositivo con verificación
              exitosa y estás en la app móvil (Apple Health / Health Connect).
            </p>
          )}
        </CardContent>
      </Card>

      <BleCompatibilityCheck />
    </div>
  );
}