import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Smartphone, Apple } from "lucide-react";
import { Link } from "react-router-dom";

const ANDROID_STEPS: string[] = [
  "Instala Mi Fitness (Xiaomi) desde Google Play e inicia sesión con tu Mi Account.",
  "En Mi Fitness ve a Perfil → Añadir dispositivo y empareja tu banda por Bluetooth.",
  "Instala Health Connect desde Google Play si tu teléfono no lo trae preinstalado.",
  "En Mi Fitness abre Perfil → Ajustes → Servicios de terceros → Health Connect y actívalo.",
  "Otorga permisos de escritura para: Frecuencia cardíaca, SpO₂, Pasos, Distancia y Sueño.",
  "Abre CareCentral y entra a Historial de salud → Sincronizar wearables → Health Connect.",
  "Autoriza a CareCentral a leer los mismos permisos concedidos a Mi Fitness.",
  "Pulsa Sincronizar ahora y verifica que las lecturas aparezcan en tu expediente.",
];

const IOS_STEPS: string[] = [
  "Aviso: Mi Fitness en iOS no escribe directamente en la app Salud. Necesitas una app puente.",
  "Instala Zepp Life (antes Mi Fit) o Notify & Fitness for Mi Band desde la App Store.",
  "En la app puente empareja tu banda por Bluetooth siguiendo el asistente.",
  "En la app puente activa la integración con Apple Salud y otorga permisos de escritura para Frecuencia cardíaca, SpO₂, Pasos y Sueño.",
  "Abre la app Salud de iOS y confirma que ves lecturas recientes de tu banda.",
  "Abre CareCentral (iOS) y entra a Historial de salud → Conectar HealthKit.",
  "Autoriza lectura de Frecuencia cardíaca, SpO₂, Actividad y Sueño.",
  "Pulsa Sincronizar ahora y verifica que las lecturas se importen.",
];

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 mt-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function MiFitnessBridgeGuide() {
  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="guide" className="border-0">
        <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
          Guía: Mi Fitness → Health Connect / Apple Salud
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">
          <Tabs defaultValue="android">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="android" className="gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Android (Health Connect)
              </TabsTrigger>
              <TabsTrigger value="ios" className="gap-1">
                <Apple className="h-3.5 w-3.5" /> iOS (Apple Salud)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="android">
              <StepList steps={ANDROID_STEPS} />
            </TabsContent>
            <TabsContent value="ios">
              <StepList steps={IOS_STEPS} />
            </TabsContent>
          </Tabs>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Cuando termines, registra el resultado de tu prueba en{" "}
              <Link
                to="/tensiometros-compatibilidad"
                className="underline font-medium"
              >
                Compatibilidad de dispositivos
              </Link>{" "}
              para ayudar a otros usuarios.
            </AlertDescription>
          </Alert>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}