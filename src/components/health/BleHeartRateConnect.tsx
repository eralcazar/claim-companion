import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bluetooth, HeartPulse, Loader2, Save, Signal } from "lucide-react";
import {
  BleConnection,
  BleParsed,
  BLE_SERVICE_UUIDS,
  isBleAvailable,
  isIOSSafari,
  requestBleDevice,
} from "@/lib/ble";
import { useCreateHeartRate, classifyHR } from "@/hooks/useHeartRate";
import { toast } from "sonner";

/**
 * Conecta con un monitor de frecuencia cardíaca BLE (perfil GATT estándar
 * 0x180D / 0x2A37) y guarda las lecturas en `heart_rate_readings` con
 * `source = "ble"`. Muestra el pulso en vivo antes de persistir.
 */
export function BleHeartRateConnect() {
  const create = useCreateHeartRate();
  const connRef = useRef<BleConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState<{ name: string | null } | null>(null);
  const [live, setLive] = useState<{ bpm: number; contact?: boolean; at: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<number>(0);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const lastAutoRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      connRef.current?.disconnect().catch(() => {});
    };
  }, []);

  const available = isBleAvailable();
  const ios = isIOSSafari();

  const start = async () => {
    setError(null);
    setConnecting(true);
    try {
      const conn = await requestBleDevice("heart_rate");
      connRef.current = conn;
      setConnected({ name: conn.device.name });
      conn.onMeasurement((m: BleParsed) => {
        if (m.kind !== "heart_rate") return;
        setSamples((n) => n + 1);
        setLive({ bpm: m.bpm, contact: m.contact, at: m.measured_at });
        if (autoSave) {
          const now = Date.now();
          // Auto-guardar 1 lectura cada 30s como máximo para evitar spam.
          if (now - lastAutoRef.current > 30_000) {
            lastAutoRef.current = now;
            create
              .mutateAsync({
                bpm: m.bpm,
                measured_at: m.measured_at,
                context: "otro",
                source: "ble",
                device_name: conn.device.name ?? "Monitor BLE",
              })
              .catch(() => {});
          }
        }
      });
    } catch (e: any) {
      setError(e?.message ?? "No se pudo conectar");
    } finally {
      setConnecting(false);
    }
  };

  const stop = async () => {
    await connRef.current?.disconnect().catch(() => {});
    connRef.current = null;
    setConnected(null);
    setLive(null);
    setSamples(0);
  };

  const saveOne = async () => {
    if (!live) return;
    setSaving(true);
    try {
      await create.mutateAsync({
        bpm: live.bpm,
        measured_at: live.at,
        context: "otro",
        source: "ble",
        device_name: connected?.name ?? "Monitor BLE",
      });
      toast.success(`Lectura guardada: ${live.bpm} bpm`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const cls = live ? classifyHR(live.bpm) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bluetooth className="h-4 w-4 text-primary" /> Monitor BLE (0x180D)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!available && (
          <Alert variant={ios ? "default" : "destructive"}>
            <AlertTitle>Bluetooth no disponible</AlertTitle>
            <AlertDescription className="text-xs">
              {ios
                ? "iOS Safari no permite Web Bluetooth. Instala la app nativa para usar el monitor BLE."
                : "Este navegador no soporta Web Bluetooth. Usa Chrome/Edge en Android o desktop, o la app nativa."}
            </AlertDescription>
          </Alert>
        )}

        {!connected && available && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Compatible con cualquier banda pectoral, pulsera o reloj que exponga el servicio
              estándar de Frecuencia Cardíaca BLE (Polar H10, Wahoo TICKR, Garmin HRM-Pro, etc.).
              UUID: <span className="font-mono">{BLE_SERVICE_UUIDS.heart_rate}</span>
            </p>
            <Button onClick={start} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bluetooth className="h-4 w-4 mr-1" />}
              Buscar y conectar
            </Button>
          </div>
        )}

        {connected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Signal className="h-3 w-3" /> {connected.name ?? "Monitor BLE"}
                </Badge>
                <span className="text-xs text-muted-foreground">{samples} muestras</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                  Auto-guardar (c/30 s)
                </label>
                <Button size="sm" variant="ghost" onClick={stop}>
                  Desconectar
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
                  <HeartPulse className="h-8 w-8 text-destructive animate-pulse" />
                  {live?.bpm ?? "—"}
                  <span className="text-base font-normal text-muted-foreground">bpm</span>
                </div>
                {cls && (
                  <Badge className={`mt-2 ${cls.className}`}>{cls.label}</Badge>
                )}
                {live?.contact === false && (
                  <p className="text-[11px] text-warning mt-2">
                    El sensor no detecta contacto con la piel. Ajusta la banda o el reloj.
                  </p>
                )}
                {live && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(live.at).toLocaleTimeString("es-MX")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveOne} disabled={!live || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar lectura actual
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}