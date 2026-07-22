import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Bluetooth,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { isNative, isWebBluetoothAvailable, isIOSSafari } from "@/lib/ble";
import { toast } from "sonner";

type CheckStatus = "ok" | "fail" | "warn" | "info";

type EnvCheck = {
  label: string;
  status: CheckStatus;
  detail: string;
};

/** Servicios GATT que CareCentral sabe leer directamente. */
const PARSERS: Record<
  string,
  { name: string; where: string; ok: true } | { name: string; ok: false }
> = {
  "0000180d-0000-1000-8000-00805f9b34fb": {
    name: "Heart Rate (0x180D)",
    where: "Frecuencia cardíaca → Dispositivo BLE",
    ok: true,
  },
  "00001810-0000-1000-8000-00805f9b34fb": {
    name: "Blood Pressure (0x1810)",
    where: "Presión arterial → Conectar dispositivo",
    ok: true,
  },
  "00001822-0000-1000-8000-00805f9b34fb": {
    name: "Pulse Oximeter (0x1822)",
    where: "Oximetría → Conectar dispositivo",
    ok: true,
  },
  "00001809-0000-1000-8000-00805f9b34fb": {
    name: "Health Thermometer (0x1809)",
    ok: false,
  },
  "00001808-0000-1000-8000-00805f9b34fb": {
    name: "Glucose (0x1808)",
    ok: false,
  },
};

function computeEnvChecks(): EnvCheck[] {
  const checks: EnvCheck[] = [];
  const hasNav = typeof navigator !== "undefined";
  const secure = typeof window !== "undefined" && (window.isSecureContext || location.hostname === "localhost");

  checks.push({
    label: "API Web Bluetooth disponible",
    status: isWebBluetoothAvailable() || isNative() ? "ok" : "fail",
    detail: isNative()
      ? "Detectado entorno nativo (Capacitor). BLE disponible vía plugin."
      : isWebBluetoothAvailable()
        ? "navigator.bluetooth está presente."
        : "Este navegador no expone navigator.bluetooth.",
  });

  checks.push({
    label: "Contexto seguro (HTTPS o localhost)",
    status: secure ? "ok" : "fail",
    detail: secure
      ? "La página se sirve por HTTPS o localhost."
      : "Web Bluetooth requiere HTTPS. Abre la app desde su URL segura.",
  });

  let plat: CheckStatus = "warn";
  let platDetail = "Plataforma no reconocida.";
  if (hasNav) {
    const ua = navigator.userAgent;
    if (isIOSSafari()) {
      plat = "fail";
      platDetail = "iOS Safari no soporta Web Bluetooth. Usa la app nativa o Android/desktop.";
    } else if (/Chrome|Chromium|Edg|OPR|Samsung/.test(ua)) {
      plat = "ok";
      platDetail = "Navegador basado en Chromium — BLE soportado.";
    } else if (/Firefox/.test(ua)) {
      plat = "fail";
      platDetail = "Firefox aún no implementa Web Bluetooth. Usa Chrome/Edge.";
    } else {
      plat = "warn";
      platDetail = `UA: ${ua.slice(0, 80)}…`;
    }
  }
  checks.push({ label: "Navegador compatible", status: plat, detail: platDetail });

  return checks;
}

type ScanResult = {
  name: string;
  id: string;
  services: string[];
  matches: string[];
  unmatched: string[];
};

export function DirectBleChecker() {
  const [envChecks, setEnvChecks] = useState<EnvCheck[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const available = isWebBluetoothAvailable() || isNative();

  useEffect(() => {
    setEnvChecks(computeEnvChecks());
  }, []);

  const runScan = async () => {
    if (!isWebBluetoothAvailable()) {
      toast.error("Web Bluetooth no disponible en este navegador.");
      return;
    }
    setScanning(true);
    setScan(null);
    try {
      // @ts-expect-error Web Bluetooth types no bundleados
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: Object.keys(PARSERS),
      });
      const server = await device.gatt?.connect();
      let services: any[] = [];
      try {
        services = server ? await server.getPrimaryServices() : [];
      } catch {
        services = [];
      }
      const uuids = services.map((s: any) => String(s.uuid).toLowerCase());
      const matches = uuids.filter((u) => PARSERS[u]);
      const unmatched = uuids.filter((u) => !PARSERS[u]);
      try {
        await device.gatt?.disconnect();
      } catch {
        /* noop */
      }
      setScan({
        name: device.name ?? "(sin nombre)",
        id: device.id,
        services: uuids,
        matches,
        unmatched,
      });
    } catch (err: any) {
      if (err?.name !== "NotFoundError") toast.error(err?.message ?? "Error BLE");
    } finally {
      setScanning(false);
    }
  };

  const statusIcon = (s: CheckStatus) =>
    s === "ok" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    ) : s === "fail" ? (
      <XCircle className="h-4 w-4 text-rose-600" />
    ) : s === "warn" ? (
      <HelpCircle className="h-4 w-4 text-amber-600" />
    ) : (
      <Info className="h-4 w-4 text-sky-600" />
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bluetooth className="h-4 w-4 text-primary" /> Entorno para BLE directo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {envChecks.map((c) => (
            <div key={c.label} className="flex items-start gap-2 rounded border p-2">
              <div className="mt-0.5">{statusIcon(c.status)}</div>
              <div className="text-sm">
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Servicios GATT que CareCentral sabe interpretar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(PARSERS).map(([uuid, p]) => (
            <div
              key={uuid}
              className="flex items-center justify-between rounded border p-2 text-sm"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{uuid}</div>
              </div>
              {p.ok ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1" variant="outline">
                  <CheckCircle2 className="h-3 w-3" /> Parser disponible
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  Pendiente
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Escanear un dispositivo cercano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            El navegador abrirá el selector nativo de Bluetooth y reportaremos si CareCentral puede
            leerlo directamente.
          </p>
          <Button onClick={runScan} disabled={!available || scanning} className="w-full">
            {scanning ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Escaneando…
              </span>
            ) : (
              "Escanear dispositivo cercano"
            )}
          </Button>

          {scan && (
            <div className="rounded border p-3 space-y-3 text-sm">
              <div>
                <div className="font-medium">{scan.name}</div>
                <div className="text-xs font-mono text-muted-foreground">{scan.id}</div>
              </div>

              {scan.matches.length > 0 ? (
                <div className="space-y-1">
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1" variant="outline">
                    <CheckCircle2 className="h-3 w-3" /> Compatible con CareCentral
                  </Badge>
                  {scan.matches.map((uuid) => {
                    const p = PARSERS[uuid] as any;
                    return (
                      <div key={uuid} className="text-xs">
                        • <strong>{p.name}</strong> → {p.where ?? "parser interno"}
                      </div>
                    );
                  })}
                </div>
              ) : scan.services.length > 0 ? (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Protocolo propietario</AlertTitle>
                  <AlertDescription className="text-xs">
                    El dispositivo expone {scan.services.length} servicio(s) GATT que no
                    reconocemos. Usa el asistente de Health Connect (para smartwatches Xiaomi /
                    Samsung) o Apple Health en iOS.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertTitle>No fue posible leer servicios</AlertTitle>
                  <AlertDescription className="text-xs">
                    El dispositivo pudo rechazar la conexión o requiere emparejamiento previo desde
                    los ajustes del sistema.
                  </AlertDescription>
                </Alert>
              )}

              {scan.unmatched.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Ver {scan.unmatched.length} servicio(s) sin parser
                  </summary>
                  <ul className="mt-1 space-y-0.5 font-mono">
                    {scan.unmatched.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}