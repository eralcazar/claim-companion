import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Pill, FileText, FlaskConical, TrendingUp, Activity, HeartPulse, FolderTree } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PatientExpedienteTabs } from "@/components/expediente/PatientExpedienteTabs";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { value: "resumen", label: "Resumen", icon: FolderOpen },
  { value: "medicamentos", label: "Medicamentos", icon: Pill },
  { value: "recetas", label: "Recetas", icon: FileText },
  { value: "estudios", label: "Estudios", icon: FlaskConical },
  { value: "tendencias", label: "Tendencias", icon: TrendingUp },
  { value: "presion", label: "Presión", icon: HeartPulse },
  { value: "oxigenacion", label: "Oxigenación", icon: Activity },
  { value: "registros", label: "Registros", icon: FolderTree },
];

export default function ExpedienteDigital() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "resumen";
  const { user } = useAuth();

  return (
    <div className="space-y-4 animate-fade-in pb-24 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-heading text-2xl font-bold">Expediente Digital</h1>
          <p className="text-sm text-muted-foreground">Tu información clínica unificada en un solo lugar.</p>
        </div>
      </div>

      {tab === "resumen" ? (
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="w-full">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex w-max">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <TabsContent value="resumen" className="mt-4">
            <ResumenExpediente />
          </TabsContent>
        </Tabs>
      ) : (
        user?.id && (
          <PatientExpedienteTabs
            patientId={user.id}
            defaultTab={tab}
          />
        )
      )}
    </div>
  );
}

function ResumenExpediente() {
  const cards = [
    { label: "Medicamentos activos", value: "—", icon: Pill, hint: "Ver pestaña Medicamentos" },
    { label: "Recetas vigentes", value: "—", icon: FileText, hint: "Ver pestaña Recetas" },
    { label: "Última presión arterial", value: "—", icon: HeartPulse, hint: "Ver pestaña Presión" },
    { label: "Última saturación SpO2", value: "—", icon: Activity, hint: "Ver pestaña Oxigenación" },
    { label: "Estudios recientes", value: "—", icon: FlaskConical, hint: "Ver pestaña Estudios" },
    { label: "Documentos guardados", value: "—", icon: FolderTree, hint: "Ver pestaña Registros" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}