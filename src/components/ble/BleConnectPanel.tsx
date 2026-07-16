import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bluetooth, Camera, HeartPulse, Activity, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  useBleAvailability,
  useBleSession,
  useForgetBleDevice,
  useSavedBleDevices,
  useUnlinkBleDevice,
} from "@/hooks/useBleDevices";
import { Link } from "react-router-dom";

/**
 * Panel público en /perfil para conectar tensiómetros y oxímetros BLE.
 * Web Bluetooth requiere Chrome/Edge (Android/desktop). iOS Safari muestra fallback.
 */
export function BleConnectPanel() {
  const { available, iosSafari } = useBleAvailability();
  const saved = useSavedBleDevices();
  const forget = useForgetBleDevice();
  const session = useBleSession();
  const unlink = useUnlinkBleDevice();

  const handleConnect = async (service: "blood_pressure" | "pulse_oximeter") => {
    try {
      await session.start.mutateAsync(service);
      toast.success("Dispositivo conectado. Realiza una medición para sincronizar.");
    } catch (e: any) {
      if (e?.name !== "NotFoundError") {
        toast.error(e?.message ?? "No se pudo conectar");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bluetooth className="h-5 w-5 text-primary" />
          Dispositivos Bluetooth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!available && !iosSafari && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Bluetooth no disponible</AlertTitle>
            <AlertDescription>
              Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge en Android/Escritorio, o instala la app.
            </AlertDescription>
          </Alert>
        )}

        {iosSafari && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>iOS Safari no soporta Bluetooth Web</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Para conectar dispositivos desde iPhone necesitas la app instalada.</p>
              <Button asChild size="sm" variant="outline">
                <Link to="/expediente">
                  <Camera className="h-4 w-4 mr-1" /> Capturar con foto (OCR)
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {available && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => handleConnect("blood_pressure")}
              disabled={session.start.isPending}
            >
              <HeartPulse className="h-4 w-4 mr-2" /> Tensiómetro
            </Button>
            <Button
              variant="outline"
              onClick={() => handleConnect("pulse_oximeter")}
              disabled={session.start.isPending}
            >
              <Activity className="h-4 w-4 mr-2" /> Oxímetro
            </Button>
          </div>
        )}

        {session.connected && (
          <Alert>
            <Bluetooth className="h-4 w-4" />
            <AlertTitle>Conectado a {session.connected.name ?? "dispositivo"}</AlertTitle>
            <AlertDescription>
              Realiza una medición en el dispositivo. Los datos se guardan automáticamente.
              {session.lastReading && (
                <p className="mt-1 text-sm">
                  Última lectura: {session.lastReading.kind === "blood_pressure"
                    ? `${session.lastReading.systolic}/${session.lastReading.diastolic} mmHg`
                    : `SpO₂ ${session.lastReading.spo2}%`}
                </p>
              )}
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => session.disconnect()}>
                Desconectar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {session.error && (
          <Alert variant="destructive">
            <AlertDescription>{session.error}</AlertDescription>
          </Alert>
        )}

        <div>
          <p className="text-sm font-medium mb-2">Dispositivos guardados</p>
          {saved.data && saved.data.length > 0 ? (
            <ul className="space-y-2">
              {saved.data.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.name ?? "Sin nombre"}</span>
                      {d.is_whitelisted ? (
                        <Badge variant="secondary">Verificado</Badge>
                      ) : (
                        <Badge variant="outline">Genérico</Badge>
                      )}
                    </div>
                    {d.last_connected_at && (
                      <p className="text-xs text-muted-foreground">
                        Última conexión: {new Date(d.last_connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => forget.mutate(d.id)}
                    aria-label="Olvidar dispositivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={unlink.isPending}
                    onClick={() => {
                      if (!confirm("Se eliminarán TODAS las lecturas asociadas a este dispositivo. ¿Continuar?")) return;
                      unlink.mutate(
                        { id: d.id, deviceId: d.device_id },
                        {
                          onSuccess: () => toast.success("Dispositivo y lecturas eliminados"),
                          onError: (e: any) => toast.error(e?.message ?? "Error"),
                        },
                      );
                    }}
                  >
                    Desvincular y borrar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay dispositivos guardados.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}