import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HeartPulse, Activity, Bluetooth, CheckCircle2, Loader2, XCircle, ArrowRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useBleConnectionTest } from "@/hooks/useBleConnectionTest";
import type { BleService } from "@/lib/ble";
import { useUpsertBlePairing } from "@/hooks/useBlePairings";

type Step = 1 | 2 | 3 | 4;

/**
 * Asistente paso a paso para emparejar un dispositivo BLE:
 * 1) tipo → 2) preparar → 3) escanear + prueba → 4) confirmar y guardar.
 */
export function BlePairingWizard({ trigger, patientId }: { trigger?: React.ReactNode; patientId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<BleService | null>(null);
  const [nickname, setNickname] = useState("");
  const effectivePatient = patientId ?? user?.id ?? null;
  const { status, result, test, reset } = useBleConnectionTest({ patientId: effectivePatient });
  const upsertPairing = useUpsertBlePairing();

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setStep(1);
      setService(null);
      setNickname("");
      reset();
    }, 200);
  };

  const goToTest = async (svc: BleService) => {
    setService(svc);
    setStep(3);
    await test(svc);
  };

  const save = async () => {
    if (!user?.id || !result?.deviceId || !service) return;
    try {
      const { error } = await supabase.from("user_ble_devices" as any).upsert(
        {
          user_id: user.id,
          device_id: result.deviceId,
          name: nickname || result.deviceName,
          service_uuid: service === "blood_pressure"
            ? "00001810-0000-1000-8000-00805f9b34fb"
            : "00001822-0000-1000-8000-00805f9b34fb",
          is_whitelisted: false,
          last_connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,device_id" },
      );
      if (error) throw error;
      if (effectivePatient) {
        try {
          await upsertPairing.mutateAsync({
            patient_id: effectivePatient,
            external_uuid: result.deviceId,
            device_name: nickname || result.deviceName || null,
            service_type: service,
            last_status: "ok",
          });
        } catch { /* noop */ }
      }
      qc.invalidateQueries({ queryKey: ["user_ble_devices"] });
      toast.success("Dispositivo emparejado y guardado");
      close();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el dispositivo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" className="gap-2">
            <Wand2 className="h-4 w-4" /> Asistente de emparejamiento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5 text-primary" />
            Emparejar dispositivo · Paso {step} de 4
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige el tipo de dispositivo que vas a conectar.</p>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start" onClick={() => { setService("blood_pressure"); setStep(2); }}>
                <HeartPulse className="h-4 w-4 mr-2" /> Tensiómetro (presión arterial)
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setService("pulse_oximeter"); setStep(2); }}>
                <Activity className="h-4 w-4 mr-2" /> Oxímetro (SpO₂)
              </Button>
            </div>
          </div>
        )}

        {step === 2 && service && (
          <div className="space-y-3">
            <Alert>
              <AlertTitle>Prepara el dispositivo</AlertTitle>
              <AlertDescription className="text-sm space-y-1">
                <p>1. Enciende el dispositivo y verifica que tenga batería.</p>
                <p>2. Actívalo en <b>modo emparejamiento</b> (consulta su manual — normalmente mantener presionado el botón principal).</p>
                <p>3. Acércalo a menos de 1 metro del teléfono/PC.</p>
                <p>4. Cierra la app del fabricante si la tienes abierta.</p>
              </AlertDescription>
            </Alert>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={() => goToTest(service)} className="gap-2">
                Escanear y probar <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && service && (
          <div className="space-y-3">
            {(status === "scanning" || status === "reading") && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>{status === "scanning" ? "Escaneando…" : "Leyendo muestra…"}</AlertTitle>
                <AlertDescription>Selecciona tu dispositivo en el diálogo del navegador.</AlertDescription>
              </Alert>
            )}
            {status === "success" && result && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertTitle>Conexión exitosa</AlertTitle>
                <AlertDescription className="text-sm">
                  <p><b>{result.deviceName ?? "Dispositivo"}</b></p>
                  <p className="text-muted-foreground">Muestra recibida: {result.sample}</p>
                </AlertDescription>
              </Alert>
            )}
            {status === "error" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error de conexión</AlertTitle>
                <AlertDescription className="text-sm">{result?.error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Atrás</Button>
              {status === "error" && <Button onClick={() => test(service)}>Reintentar</Button>}
              {status === "success" && (
                <Button onClick={() => setStep(4)} className="gap-2">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle>Confirmar y guardar</AlertTitle>
              <AlertDescription className="text-sm space-y-1">
                <p>Dispositivo: <b>{result.deviceName ?? "Sin nombre"}</b></p>
                <p>Muestra de prueba: {result.sample}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Conexión confirmada</Badge>
                </div>
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="nickname">Nombre para identificarlo (opcional)</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={result.deviceName ?? "Mi tensiómetro"}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={close}>Cancelar</Button>
              <Button onClick={save}>Guardar dispositivo</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}