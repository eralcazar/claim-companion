import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpO2Form } from "@/components/oxygen-saturation/SpO2Form";
import { SpO2List } from "@/components/oxygen-saturation/SpO2List";
import { SpO2Chart } from "@/components/oxygen-saturation/SpO2Chart";
import { Activity } from "lucide-react";

const OxygenSaturation = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleReadingAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-blue-600" size={32} />
            <h1 className="text-4xl font-bold text-slate-900">Monitoreo de SpO2</h1>
          </div>
          <p className="text-slate-600">
            Registra y monitorea tus niveles de oxígeno en sangre
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="registrar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="registrar">Registrar</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          </TabsList>

          {/* Tab: Registrar */}
          <TabsContent value="registrar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nueva Medición de SpO2</CardTitle>
                <CardDescription>
                  Registra tu lectura de oxígeno en sangre
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpO2Form onSuccess={handleReadingAdded} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Historial */}
          <TabsContent value="historial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Mediciones</CardTitle>
                <CardDescription>
                  Todas tus lecturas de SpO2 registradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpO2List key={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Tendencias */}
          <TabsContent value="tendencias" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Tendencias</CardTitle>
                <CardDescription>
                  Visualiza tus patrones de SpO2 a lo largo del tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpO2Chart />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Alert */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">ℹ️ Información sobre SpO2</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>• <strong>Normal:</strong> 95-100% - Óptimo</p>
            <p>• <strong>Bajo:</strong> 90-94% - Requiere atención</p>
            <p>• <strong>Crítico:</strong> 85-89% - Contacta a tu médico</p>
            <p>• <strong>Emergencia:</strong> &lt;85% - Busca atención médica inmediata</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OxygenSaturation;
