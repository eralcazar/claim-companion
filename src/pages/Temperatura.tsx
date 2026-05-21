import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";
import { TemperatureForm } from "@/components/temperature/TemperatureForm";
import { TemperatureList } from "@/components/temperature/TemperatureList";
import { TemperatureChart } from "@/components/temperature/TemperatureChart";

export default function Temperatura() {
  const { user } = useAuth();
  const patientId = useEffectiveUserId(user?.id);
  const [refresh, setRefresh] = useState(0);

  if (!patientId) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Thermometer className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Temperatura corporal</h1>
            <p className="text-muted-foreground text-sm">Registra y grafica las mediciones de temperatura</p>
          </div>
        </div>

        <Tabs defaultValue="registrar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="registrar">Registrar</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          </TabsList>

          <TabsContent value="registrar">
            <Card>
              <CardHeader>
                <CardTitle>Nueva medición</CardTitle>
                <CardDescription>Captura una nueva lectura de temperatura</CardDescription>
              </CardHeader>
              <CardContent>
                <TemperatureForm patientId={patientId} onSuccess={() => setRefresh((x) => x + 1)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle>Historial de mediciones</CardTitle>
              </CardHeader>
              <CardContent>
                <TemperatureList key={refresh} patientId={patientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tendencias">
            <Card>
              <CardHeader>
                <CardTitle>Gráfica de tendencia</CardTitle>
                <CardDescription>Evolución de la temperatura corporal en el tiempo</CardDescription>
              </CardHeader>
              <CardContent>
                <TemperatureChart patientId={patientId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 bg-muted/40">
          <CardHeader>
            <CardTitle className="text-base">Rangos de referencia</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>• <strong>Hipotermia:</strong> &lt; 35.0 °C</p>
            <p>• <strong>Normal:</strong> 35.0 – 37.4 °C</p>
            <p>• <strong>Febrícula:</strong> 37.5 – 37.9 °C</p>
            <p>• <strong>Fiebre:</strong> 38.0 – 39.4 °C</p>
            <p>• <strong>Fiebre alta:</strong> ≥ 39.5 °C — busca atención médica</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}