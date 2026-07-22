import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert } from "lucide-react";

type Props = {
  errorCode?: string | null;
  errorMessage?: string | null;
  service?: "blood_pressure" | "pulse_oximeter" | "heart_rate" | string;
};

type Diagnosis = {
  title: string;
  cause: string;
  fixes: string[];
};

const DIAGNOSES: Record<string, Diagnosis> = {
  unavailable: {
    title: "Bluetooth no disponible",
    cause: "El navegador o sistema no expone la API de Bluetooth.",
    fixes: [
      "Usá Chrome o Edge en Android o desktop. En iPhone, usá la app nativa de CareCentral.",
      "Activá el Bluetooth del sistema.",
      "En Android, otorgá permiso 'Dispositivos cercanos' al navegador.",
    ],
  },
  unsupported: {
    title: "Web Bluetooth no soportado",
    cause: "El navegador actual no implementa Web Bluetooth (típico de Safari/iOS).",
    fixes: [
      "Descargá la app nativa de CareCentral para iOS/Android.",
      "En desktop, cambiá a Chrome o Edge.",
    ],
  },
  user_cancelled: {
    title: "Selección cancelada",
    cause: "Cerraste el diálogo del navegador sin elegir un dispositivo.",
    fixes: [
      "Volvé a pulsar 'Probar conexión' y seleccioná tu dispositivo del listado.",
      "Si no aparece, verificá que esté encendido y en modo emparejamiento.",
    ],
  },
  scan_failed: {
    title: "Falló el escaneo",
    cause: "El navegador no pudo iniciar el escaneo BLE.",
    fixes: [
      "Verificá que el Bluetooth esté activo.",
      "En Android, confirmá permisos de 'Ubicación' y 'Dispositivos cercanos'.",
      "Cerrá otras apps que puedan tener tomado el dispositivo (app del fabricante).",
      "Reiniciá el Bluetooth del teléfono y volvé a intentar.",
    ],
  },
  timeout: {
    title: "Timeout esperando lectura",
    cause: "El dispositivo se conectó pero no envió una medición dentro del tiempo esperado.",
    fixes: [
      "Realizá una medición nueva mientras aparece 'Leyendo…' (no antes).",
      "Acercá el dispositivo al teléfono/PC (menos de 1 metro).",
      "Cerrá la app oficial del fabricante — solo una app puede leer BLE a la vez.",
      "Verificá que el brazalete/oxímetro esté colocado correctamente y encendido.",
    ],
  },
  gatt_failed: {
    title: "Falló la conexión GATT",
    cause: "El dispositivo se emparejó pero rechazó la lectura del servicio.",
    fixes: [
      "Olvidá el dispositivo desde Ajustes → Bluetooth y volvé a emparejar.",
      "Actualizá el firmware desde la app oficial del fabricante.",
      "Reiniciá el dispositivo (mantené el botón 10 segundos).",
      "Cerrá completamente la app del fabricante antes de probar en CareCentral.",
      "Cambiá las pilas si es un tensiómetro que las use.",
    ],
  },
  unknown: {
    title: "Error no identificado",
    cause: "Ocurrió un error inesperado durante la conexión.",
    fixes: [
      "Reiniciá el Bluetooth del teléfono/PC.",
      "Cerrá otras apps que puedan estar usando el dispositivo.",
      "Reintentá en unos segundos. Si persiste, capturá el mensaje técnico de abajo y solicitá soporte.",
    ],
  },
};

export function BleFailureDiagnostic({ errorCode, errorMessage, service }: Props) {
  if (!errorCode && !errorMessage) return null;
  const dx = DIAGNOSES[errorCode ?? "unknown"] ?? DIAGNOSES.unknown;

  return (
    <Alert variant="destructive">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        {dx.title}
        {service && <Badge variant="outline" className="text-xs">{service}</Badge>}
        {errorCode && <Badge variant="outline" className="text-xs font-mono">{errorCode}</Badge>}
      </AlertTitle>
      <AlertDescription className="space-y-2 text-xs">
        <p><span className="font-medium">Causa probable:</span> {dx.cause}</p>
        <div>
          <p className="font-medium mb-1">Ajustes a revisar para que vuelva a funcionar:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {dx.fixes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
        {errorMessage && (
          <details className="mt-1 opacity-80">
            <summary className="cursor-pointer flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Detalle técnico
            </summary>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] p-2 rounded bg-background/50 border">{errorMessage}</pre>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}