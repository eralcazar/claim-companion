import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";
import { GlucoseForm } from "@/components/glucose/GlucoseForm";
import { GlucoseList } from "@/components/glucose/GlucoseList";
import { GlucoseChart } from "@/components/glucose/GlucoseChart";

export default function Glucosa() {
  const { user } = useAuth();
  const patientId = useEffectiveUserId(user?.id);
  const [refresh, setRefresh] = useState(0);

  if (!patientId) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Droplet className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Glucosa capilar</h1>
            <p className="text-muted-foreground text-sm">Registra y grafica las mediciones de glucosa en sangre</p>
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
                <CardDescription>Captura una nueva lectura de glucosa</CardDescription>
              </CardHeader>
              <CardContent>
                <GlucoseForm patientId={patientId} onSuccess={() => setRefresh((x) => x + 1)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle>Historial de mediciones</CardTitle>
              </CardHeader>
              <CardContent>
                <GlucoseList key={refresh} patientId={patientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tendencias">
            <Card>
              <CardHeader>
                <CardTitle>Gráfica de tendencia</CardTitle>
                <CardDescription>Evolución de la glucosa en el tiempo</CardDescription>
              </CardHeader>
              <CardContent>
                <GlucoseChart patientId={patientId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 bg-muted/40">
          <CardHeader>
            <CardTitle className="text-base">Rangos de referencia (mg/dL)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>• <strong>Hipoglucemia:</strong> &lt; 70</p>
            <p>• <strong>Ayuno normal:</strong> 70 – 99</p>
            <p>• <strong>Prediabetes (ayuno):</strong> 100 – 125</p>
            <p>• <strong>Diabetes (ayuno):</strong> ≥ 126</p>
            <p>• <strong>Postprandial normal:</strong> &lt; 140 · Alterada 140–199 · Diabetes ≥ 200</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}