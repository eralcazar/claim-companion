import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LifeBuoy } from "lucide-react";

/**
 * Guía in-app de solución de problemas para conexiones BLE.
 * Se muestra dentro del panel BLE cuando hay error o cuando el usuario la abre.
 */
export function BleTroubleshootingGuide({ lastError }: { lastError?: string | null }) {
  return (
    <div className="space-y-3">
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudo conectar</AlertTitle>
          <AlertDescription className="text-sm">{lastError}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <LifeBuoy className="h-4 w-4" />
        <AlertTitle>Guía rápida de solución de problemas</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          Sigue estos pasos en orden. La mayoría de los problemas se resuelven en menos de 1 minuto.
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="browser">
          <AccordionTrigger>1. Verifica tu navegador</AccordionTrigger>
          <AccordionContent className="text-sm space-y-1">
            <p>Web Bluetooth funciona en <b>Chrome</b> y <b>Edge</b> (Android y escritorio).</p>
            <p>❌ No funciona en Safari (iOS/Mac) ni en Firefox. Usa la app instalada en su lugar.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bluetooth-off">
          <AccordionTrigger>2. Bluetooth encendido</AccordionTrigger>
          <AccordionContent className="text-sm space-y-1">
            <p><b>Android:</b> Ajustes → Conexiones → Bluetooth → Activar.</p>
            <p><b>Windows:</b> Configuración → Bluetooth y dispositivos → Activar.</p>
            <p><b>macOS:</b> Menú Apple → Ajustes del Sistema → Bluetooth → Activar.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="permissions">
          <AccordionTrigger>3. Permisos del navegador</AccordionTrigger>
          <AccordionContent className="text-sm space-y-1">
            <p>Si rechazaste el permiso, cliquea el ícono de candado 🔒 en la barra de direcciones y habilita <b>Bluetooth</b>.</p>
            <p>En Android, la app del navegador también necesita permiso de ubicación (requerido por el sistema para escanear BLE).</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pairing-mode">
          <AccordionTrigger>4. El dispositivo no aparece</AccordionTrigger>
          <AccordionContent className="text-sm space-y-1">
            <p>• Enciende el dispositivo y ponlo en <b>modo emparejamiento</b> (revisa el manual: suele ser mantener presionado un botón).</p>
            <p>• Acércalo a menos de <b>1 metro</b> del teléfono/PC.</p>
            <p>• Verifica la <b>batería</b>; dispositivos con batería baja no anuncian por BLE.</p>
            <p>• <b>Cierra la app del fabricante</b> (Omron Connect, ViHealth, etc.): mantiene la conexión ocupada.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="gatt-error">
          <AccordionTrigger>5. Error GATT o timeout</AccordionTrigger>
          <AccordionContent className="text-sm space-y-1">
            <p>• Apaga y enciende el dispositivo.</p>
            <p>• "Olvida" el dispositivo en Ajustes de Bluetooth del sistema y vuelve a emparejar.</p>
            <p>• Recarga esta página (Ctrl/Cmd + R) y reintenta la prueba de conexión.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="incompatible">
          <AccordionTrigger>6. ¿Y si mi dispositivo no es compatible?</AccordionTrigger>
          <AccordionContent className="text-sm space-y-1">
            <p>CareCentral usa perfiles BLE estándar (BP 0x1810, PLX 0x1822, HTS 0x1809, HRS 0x180D).</p>
            <p>Dispositivos con protocolos propietarios (Xiaomi Mi Band, algunos Fitbit) no funcionan directamente. Revisa el catálogo de dispositivos compatibles.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}