import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Bluetooth, Shield, RefreshCw, HelpCircle, CheckCircle2 } from "lucide-react";
import { getPlatform } from "@/lib/health";

type Issue = "permissions_denied" | "no_ble_services" | "not_found" | "sync_empty" | "unknown";

const ISSUES: { id: Issue; label: string }[] = [
  { id: "permissions_denied", label: "No otorgué permisos (Health Connect / HealthKit)" },
  { id: "no_ble_services", label: "El escaneo BLE no encuentra servicios compatibles" },
  { id: "not_found", label: "Mi dispositivo no aparece en la lista de emparejamiento" },
  { id: "sync_empty", label: "Sincronicé pero no importó lecturas" },
  { id: "unknown", label: "Otro problema" },
];

export function PermissionsTroubleshooter() {
  const platform = getPlatform();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const runQuickCheck = async () => {
    const notes: string[] = [];
    notes.push(`Plataforma detectada: ${platform}`);
    notes.push(`Origen seguro (HTTPS): ${window.isSecureContext ? "sí" : "no"}`);
    notes.push(`Web Bluetooth disponible: ${"bluetooth" in navigator ? "sí" : "no"}`);
    if ((navigator as any).permissions) {
      try {
        const p = await (navigator as any).permissions.query({ name: "bluetooth" });
        notes.push(`Permiso Bluetooth: ${p.state}`);
      } catch {
        notes.push("Permiso Bluetooth: no se puede consultar en este navegador");
      }
    }
    setCheckResult(notes.join(" · "));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" /> Solución de problemas de importación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ISSUES.map((i) => (
            <Button
              key={i.id}
              size="sm"
              variant={issue === i.id ? "default" : "outline"}
              onClick={() => setIssue(i.id)}
            >
              {i.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={runQuickCheck} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Ejecutar diagnóstico rápido
          </Button>
          {checkResult && <Badge variant="outline" className="text-[10px]">{checkResult}</Badge>}
        </div>

        {issue && (
          <Accordion type="single" collapsible defaultValue={issue}>
            <AccordionItem value="permissions_denied">
              <AccordionTrigger className="text-sm">
                <Shield className="h-4 w-4 mr-2" /> Restablecer permisos de Health Connect / HealthKit
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  Si rechazaste los permisos, la app queda bloqueada hasta que los reautorices desde el sistema.
                </p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Android: <b>Ajustes → Apps → Health Connect → Permisos y datos → CareCentral</b> y activá lectura de FC, SpO₂, pasos, sueño y temperatura.</li>
                  <li>iOS: <b>Ajustes → Salud → Acceso a datos y dispositivos → CareCentral</b> y activá todas las categorías necesarias.</li>
                  <li>Volvé a la app y pulsá <b>Sincronizar ahora</b> desde la ficha del dispositivo.</li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Si Health Connect no está instalado, descargalo desde Play Store y volvé a intentar.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="no_ble_services">
              <AccordionTrigger className="text-sm">
                <Bluetooth className="h-4 w-4 mr-2" /> El escaneo no encuentra servicios GATT compatibles
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <ul className="list-disc ml-5 space-y-1">
                  <li>Usá Chrome o Edge en <b>desktop</b> con HTTPS (Web Bluetooth no funciona en Safari ni Firefox).</li>
                  <li>Poné el dispositivo en modo emparejamiento (led parpadeante) antes de escanear.</li>
                  <li>Muchos smartwatches (Xiaomi, Amazfit, Samsung) usan BLE cifrado propietario: no exponen GATT estándar. Usá el <b>Asistente Health Connect</b>.</li>
                  <li>Si tu equipo mide sólo pulso/pasos/sueño, no aparecerá el servicio 0x1810 (presión) ni 0x1822 (SpO₂), es normal.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="not_found">
              <AccordionTrigger className="text-sm">
                <AlertTriangle className="h-4 w-4 mr-2" /> Mi dispositivo no aparece al buscar
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <ul className="list-disc ml-5 space-y-1">
                  <li>Verificá que el Bluetooth del teléfono/PC esté activo y que no esté conectado a otra app (cerrala primero).</li>
                  <li>Reiniciá el dispositivo (quitá la batería o mantené el botón 10s).</li>
                  <li>Acercalo a menos de 1 metro durante el emparejamiento inicial.</li>
                  <li>Si nunca fue emparejado, hacelo primero desde la app oficial del fabricante y luego reintentá desde CareCentral.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sync_empty">
              <AccordionTrigger className="text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Sincronizó pero no importó lecturas
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <ul className="list-disc ml-5 space-y-1">
                  <li>Abrí la app del fabricante y forzá una sincronización manual del reloj/banda; luego reintentá en CareCentral.</li>
                  <li>Revisá el rango de fechas: por defecto se importan los últimos 30 días desde la última sync exitosa.</li>
                  <li>Comprobá el <b>Historial de importaciones</b> para ver si hubo errores registrados.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="unknown">
              <AccordionTrigger className="text-sm">Otro problema</AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <p>Ejecutá el diagnóstico rápido y usá <b>Solicitar prueba oficial</b> desde la ficha del dispositivo para que el equipo CareCentral revise tu caso con la evidencia.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}