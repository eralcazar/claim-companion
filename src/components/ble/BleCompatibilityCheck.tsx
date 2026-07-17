import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { isWebBluetoothAvailable } from "@/lib/ble";

/** Servicios GATT estándar reconocidos por CareCentral. */
const STANDARD_SERVICES: Record<string, string> = {
  "0000180d-0000-1000-8000-00805f9b34fb": "Heart Rate (0x180D)",
  "00001810-0000-1000-8000-00805f9b34fb": "Blood Pressure (0x1810)",
  "00001822-0000-1000-8000-00805f9b34fb": "Pulse Oximeter (0x1822)",
  "00001809-0000-1000-8000-00805f9b34fb": "Health Thermometer (0x1809)",
  "00001808-0000-1000-8000-00805f9b34fb": "Glucose (0x1808)",
  "0000180f-0000-1000-8000-00805f9b34fb": "Battery (0x180F)",
};

type Result = {
  device_name: string;
  device_id: string;
  advertised: string[];
  matched: string[];
  status: "standard" | "proprietary" | "unknown";
};

export function BleCompatibilityCheck() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const available = isWebBluetoothAvailable();

  const run = async () => {
    if (!available) {
      toast.error("Web Bluetooth no disponible en este navegador. Usá Chrome/Edge en Android o desktop.");
      return;
    }
    setScanning(true);
    setResult(null);
    try {
      // @ts-expect-error - Web Bluetooth types not bundled
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: Object.keys(STANDARD_SERVICES),
      });

      const server = await device.gatt?.connect();
      let services: any[] = [];
      try {
        services = server ? await server.getPrimaryServices() : [];
      } catch {
        services = [];
      }
      const advertised = services.map((s: any) => (s.uuid as string).toLowerCase());
      const matched = advertised.filter((u) => STANDARD_SERVICES[u]);

      let status: Result["status"] = "unknown";
      if (matched.length > 0) status = "standard";
      else if (advertised.length > 0) status = "proprietary";

      try {
        await device.gatt?.disconnect();
      } catch { /* noop */ }

      setResult({
        device_name: device.name ?? "(sin nombre)",
        device_id: device.id,
        advertised,
        matched,
        status,
      });
    } catch (err: any) {
      if (err?.name === "NotFoundError") {
        toast.info("Escaneo cancelado");
      } else {
        toast.error(err?.message ?? "Error de conexión BLE");
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bluetooth className="h-4 w-4 text-primary" /> Verificar compatibilidad de dispositivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Escaneá un dispositivo BLE cercano para confirmar si expone servicios GATT estándar
          (compatible con CareCentral) o un protocolo propietario (requiere app del fabricante).
        </p>

        {!available && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <span>
              Web Bluetooth no está disponible en este navegador. En iPhone usá la app nativa; en
              PC/Android usá Chrome o Edge.
            </span>
          </div>
        )}

        <Button className="w-full" onClick={run} disabled={scanning || !available}>
          {scanning ? "Escaneando..." : "Escanear dispositivo cercano"}
        </Button>

        {result && (
          <div className="rounded-md border p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{result.device_name}</div>
                <div className="text-xs text-muted-foreground font-mono">{result.device_id}</div>
              </div>
              {result.status === "standard" && (
                <Badge className="gap-1 bg-success/15 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Compatible estándar
                </Badge>
              )}
              {result.status === "proprietary" && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Propietario
                </Badge>
              )}
              {result.status === "unknown" && (
                <Badge variant="secondary" className="gap-1">
                  <HelpCircle className="h-3 w-3" /> Desconocido
                </Badge>
              )}
            </div>

            {result.matched.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-1">Servicios estándar detectados:</div>
                <div className="flex flex-wrap gap-1">
                  {result.matched.map((u) => (
                    <Badge key={u} variant="outline" className="text-xs">
                      {STANDARD_SERVICES[u]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.status === "proprietary" && (
              <div className="text-xs text-muted-foreground">
                Este equipo expone {result.advertised.length} servicio(s) GATT no reconocidos. Sus
                lecturas solo se pueden obtener vía la app oficial del fabricante (Health Connect /
                HealthKit).
              </div>
            )}
            {result.status === "unknown" && (
              <div className="text-xs text-muted-foreground">
                No se pudieron leer los servicios (el dispositivo puede requerir emparejamiento
                primero o rechazó la conexión). Volvé a intentar tras emparejarlo desde ajustes.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}