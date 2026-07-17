import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Bluetooth,
  Smartphone,
  Apple,
  Ban,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  type CompatibleDevice,
  CONNECTION_LABELS,
  DEVICE_TYPE_LABELS,
  READING_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/lib/ble/compatibleDevices";
import { DeviceVerificationForm } from "./DeviceVerificationForm";
import { useHealthDevices } from "@/hooks/useHealthDevices";
import { useCreateDeviceVerification } from "@/hooks/useDeviceVerifications";

const TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  info: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

function ConnIcon({ method }: { method: CompatibleDevice["connectionMethod"] }) {
  if (method === "ble_direct") return <Bluetooth className="h-4 w-4" />;
  if (method === "health_connect") return <Smartphone className="h-4 w-4" />;
  if (method === "healthkit") return <Apple className="h-4 w-4" />;
  if (method === "vendor_app_bridge") return <Zap className="h-4 w-4" />;
  return <Ban className="h-4 w-4" />;
}

export function DeviceDetailSheet({
  device,
  open,
  onOpenChange,
}: {
  device: CompatibleDevice | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { sync, available, requestPerms, platform } = useHealthDevices();
  const logVerification = useCreateDeviceVerification();
  if (!device) return null;
  const tone = TONE_CLASS[STATUS_TONE[device.compatibilityStatus]];
  const isBle = device.connectionMethod === "ble_direct";
  const isIncompat = device.connectionMethod === "not_compatible";
  const isHc = device.connectionMethod === "health_connect";
  const isHk = device.connectionMethod === "healthkit";
  const isBridge = device.connectionMethod === "vendor_app_bridge";

  const handleSyncNow = async () => {
    if (isBle) {
      // Web Bluetooth: just log the attempt and route to the test UI
      try {
        await logVerification.mutateAsync({
          device_id: device.id,
          status: "partial",
          connection_method: "ble_direct",
          notes: "Intento de sincronización iniciado desde la ficha",
        });
      } catch {
        /* ignore */
      }
      toast.info("Abriendo herramienta de conexión BLE…");
      onOpenChange(false);
      navigate("/dispositivos-ble#probar");
      return;
    }
    if (isHc || isHk || isBridge) {
      if (!available) {
        toast.error("Health Connect / HealthKit no disponible en este dispositivo");
        return;
      }
      try {
        await requestPerms.mutateAsync();
      } catch {
        /* permission dialog handled by native layer */
      }
      try {
        const res = await sync.mutateAsync();
        toast.success(
          `Sincronización completada: ${res.total} lecturas importadas.`,
        );
        try {
          await logVerification.mutateAsync({
            device_id: device.id,
            status: res.total > 0 ? "success" : "partial",
            connection_method: isHc ? "health_connect" : isHk ? "healthkit" : "vendor_app_bridge",
            notes: `Sync manual (${platform}) · ${res.total} registros`,
          });
        } catch {
          /* ignore */
        }
      } catch (e: any) {
        toast.error(e?.message ?? "No fue posible sincronizar");
        try {
          await logVerification.mutateAsync({
            device_id: device.id,
            status: "failed",
            connection_method: isHc ? "health_connect" : isHk ? "healthkit" : "vendor_app_bridge",
            notes: `Error de sync: ${e?.message ?? "desconocido"}`,
          });
        } catch {
          /* ignore */
        }
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{device.name}</SheetTitle>
          <SheetDescription className="text-left">{device.brand}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={tone}>
              {STATUS_LABELS[device.compatibilityStatus]}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ConnIcon method={device.connectionMethod} />
              {CONNECTION_LABELS[device.connectionMethod]}
            </Badge>
            <Badge variant="secondary">{DEVICE_TYPE_LABELS[device.deviceType]}</Badge>
            <Badge variant="outline" className="capitalize">
              {device.priceTier}
              {device.priceUsd ? ` · ${device.priceUsd}` : ""}
            </Badge>
          </div>

          {device.readings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Mediciones</p>
              <div className="flex flex-wrap gap-1">
                {device.readings.map((r) => (
                  <Badge key={r} variant="outline">{READING_LABELS[r]}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Fuente recomendada</p>
            <p>{device.syncSource}</p>
            {device.gattService && (
              <p className="text-xs text-muted-foreground mt-1">GATT: {device.gattService}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Instrucciones de emparejamiento</p>
            <ol className="space-y-2">
              {device.pairingSteps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {device.firmwareNote && (
            <p className="text-xs text-muted-foreground">Nota firmware: {device.firmwareNote}</p>
          )}
          <p className="text-sm text-muted-foreground">{device.notes}</p>

          <div className="flex flex-wrap gap-2">
            {!isIncompat && isBle && (
              <Button asChild size="sm">
                <Link to="/dispositivos-ble#probar">Probar conexión BLE</Link>
              </Button>
            )}
            {!isIncompat && !isBle && (
              <Button asChild size="sm">
                <Link to="/perfil#wearables">Sincronizar wearables</Link>
              </Button>
            )}
            {!isIncompat && (
              <Button
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={handleSyncNow}
                disabled={sync.isPending || requestPerms.isPending}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`}
                />
                Sincronizar ahora
              </Button>
            )}
            {device.url && (
              <Button asChild size="sm" variant="outline" className="gap-1">
                <a href={device.url} target="_blank" rel="noreferrer">
                  Más info <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>

          {!isIncompat && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium mb-3">Registrar mi verificación</p>
              <DeviceVerificationForm device={device} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}