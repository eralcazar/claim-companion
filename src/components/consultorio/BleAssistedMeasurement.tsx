import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, HeartPulse, Activity, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useBleAvailability, useBleSession } from "@/hooks/useBleDevices";

/**
 * Panel embebido en /consultorio para que el médico mida al paciente activo con BLE.
 * Las lecturas se asocian directamente al `patientId` del contexto de la consulta.
 */
export function BleAssistedMeasurement({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const { available, iosSafari } = useBleAvailability();
  const session = useBleSession({ targetPatientId: patientId });

  const handleConnect = async (service: "blood_pressure" | "pulse_oximeter") => {
    try {
      await session.start.mutateAsync(service);
      toast.success(`Listo. Mide a ${patientName ?? "el paciente"} desde el dispositivo.`);
    } catch (e: any) {
      if (e?.name !== "NotFoundError") toast.error(e?.message ?? "No se pudo conectar");
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bluetooth className="h-4 w-4 text-primary" /> Medición asistida por Bluetooth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!available && !iosSafari && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Bluetooth no disponible en este navegador. Usa Chrome/Edge en Android o Escritorio.
            </AlertDescription>
          </Alert>
        )}
        {iosSafari && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">iOS Safari no soporta BLE web. Usa la app.</AlertDescription>
          </Alert>
        )}
        {available && (
          <div className="grid gap-2 grid-cols-2">
            <Button size="sm" variant="outline" onClick={() => handleConnect("blood_pressure")} disabled={session.start.isPending}>
              <HeartPulse className="h-3 w-3 mr-1" /> Presión
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleConnect("pulse_oximeter")} disabled={session.start.isPending}>
              <Activity className="h-3 w-3 mr-1" /> SpO₂
            </Button>
          </div>
        )}
        {session.connected && (
          <div className="rounded-md bg-muted p-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {session.connected.service === "blood_pressure"
                  ? "Tensiómetro"
                  : session.connected.service === "heart_rate"
                    ? "Monitor cardíaco"
                    : "Oxímetro"}
              </Badge>
              <span className="truncate">{session.connected.name ?? "dispositivo"}</span>
            </div>
            {session.lastReading && (
              <p className="mt-1">
                {session.lastReading.kind === "blood_pressure"
                  ? `${session.lastReading.systolic}/${session.lastReading.diastolic} mmHg${session.lastReading.pulse ? ` · ${session.lastReading.pulse} bpm` : ""} — pendiente de revisión`
                  : session.lastReading.kind === "spo2"
                    ? `SpO₂ ${session.lastReading.spo2}%${session.lastReading.pulse ? ` · ${session.lastReading.pulse} bpm` : ""}`
                    : `${session.lastReading.bpm} bpm`}
              </p>
            )}
            <Button size="sm" variant="ghost" className="mt-1 h-7 px-2" onClick={() => session.disconnect()}>
              Terminar
            </Button>
          </div>
        )}
        {session.error && (
          <Alert variant="destructive"><AlertDescription className="text-xs">{session.error}</AlertDescription></Alert>
        )}
      </CardContent>
    </Card>
  );
}