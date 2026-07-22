import { useState } from "react";
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
  FlaskConical,
  FileText,
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
import { MiFitnessBridgeGuide } from "./MiFitnessBridgeGuide";
import { RequestDeviceTestDialog } from "./RequestDeviceTestDialog";
import { useHealthDevices } from "@/hooks/useHealthDevices";
import { useCreateDeviceVerification } from "@/hooks/useDeviceVerifications";
import {
  STATUS_LABEL as DTR_STATUS_LABEL,
  STATUS_TONE as DTR_STATUS_TONE,
  getEvidenceSignedUrl,
  useMyDeviceTestRequest,
} from "@/hooks/useDeviceTestRequests";

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
  const [requestOpen, setRequestOpen] = useState(false);
  const myRequest = useMyDeviceTestRequest(device?.id);
  if (!device) return null;
  const tone = TONE_CLASS[STATUS_TONE[device.compatibilityStatus]];
  const isBle = device.connectionMethod === "ble_direct";
  const isIncompat = device.connectionMethod === "not_compatible";
  const isHc = device.connectionMethod === "health_connect";
  const isHk = device.connectionMethod === "healthkit";
  const isBridge = device.connectionMethod === "vendor_app_bridge";
  const canRequestTest =
    !isIncompat && device.compatibilityStatus !== "verified";
  const req = myRequest.data;

  const openEvidence = async (path: string) => {
    try {
      const url = await getEvidenceSignedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "No fue posible abrir la evidencia");
    }
  };

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
            device.readingReliability ? (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium mb-2">Métricas soportadas y confiabilidad</p>
                <ul className="space-y-2">
                  {device.readings.map((r) => {
                    const rel = device.readingReliability?.[r];
                    const level = rel?.level ?? "reference";
                    const meta = {
                      clinical: { label: "Clínica", cls: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-900" },
                      reference: { label: "Referencial", cls: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900" },
                      informational: { label: "Informativa", cls: "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" },
                    }[level];
                    return (
                      <li key={r} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{READING_LABELS[r]}</span>
                          <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                        </div>
                        {rel?.note && (
                          <p className="text-xs text-muted-foreground">{rel.note}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-muted-foreground mt-3">
                  La confiabilidad la define el equipo CareCentral según el protocolo de sincronización y validaciones internas.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Mediciones</p>
                <div className="flex flex-wrap gap-1">
                  {device.readings.map((r) => (
                    <Badge key={r} variant="outline">{READING_LABELS[r]}</Badge>
                  ))}
                </div>
              </div>
            )
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

          {device.syncSource.toLowerCase().includes("mi fitness") && (
            <MiFitnessBridgeGuide />
          )}

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

          {canRequestTest && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    Solicitar prueba oficial
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Este modelo tiene un estado <span className="font-medium">{STATUS_LABELS[device.compatibilityStatus].toLowerCase()}</span>. Pide al equipo CareCentral verificarlo y publicar la evidencia.
                  </p>
                </div>
                <Button size="sm" onClick={() => setRequestOpen(true)} disabled={!!req && req.status !== "rejected"}>
                  {req && req.status !== "rejected" ? "Solicitud enviada" : "Solicitar prueba"}
                </Button>
              </div>
              {req && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline" className={DTR_STATUS_TONE[req.status]}>
                    {DTR_STATUS_LABEL[req.status]}
                  </Badge>
                  {req.resolution_note && (
                    <span className="text-xs text-muted-foreground">{req.resolution_note}</span>
                  )}
                  {req.evidence_path && (
                    <Button size="sm" variant="ghost" className="gap-1 h-7" onClick={() => openEvidence(req.evidence_path!)}>
                      <FileText className="h-3.5 w-3.5" /> Ver evidencia
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!isIncompat && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium mb-3">Registrar mi verificación</p>
              <DeviceVerificationForm device={device} />
            </div>
          )}
        </div>
        <RequestDeviceTestDialog device={device} open={requestOpen} onOpenChange={setRequestOpen} />
      </SheetContent>
    </Sheet>
  );
}