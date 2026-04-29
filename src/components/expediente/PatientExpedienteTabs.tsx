import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, FileText, FlaskConical, TrendingUp, Activity, HeartPulse, FolderTree, Map } from "lucide-react";
import Medications from "@/pages/Medications";
import Recetas from "@/pages/Recetas";
import Estudios from "@/pages/Estudios";
import Tendencias from "@/pages/Tendencias";
import PresionArterial from "@/pages/PresionArterial";
import OxygenSaturation from "@/pages/OxygenSaturation";
import MedicalRecords from "@/pages/MedicalRecords";
import { BodyMapEditor } from "@/components/consultorio/BodyMapEditor";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";

const TABS_ROW_1 = [
  { value: "mapa", label: "Mapa corporal", icon: Map },
  { value: "medicamentos", label: "Medicamentos", icon: Pill },
  { value: "recetas", label: "Recetas", icon: FileText },
  { value: "estudios", label: "Estudios", icon: FlaskConical },
];
const TABS_ROW_2 = [
  { value: "tendencias", label: "Tendencias", icon: TrendingUp },
  { value: "presion", label: "Presión", icon: HeartPulse },
  { value: "oxigenacion", label: "Oxigenación", icon: Activity },
  { value: "registros", label: "Registros", icon: FolderTree },
];

interface Props {
  patientId: string;
  patientName?: string;
  defaultTab?: string;
  /** When true, automatically activate impersonation context for this patient. */
  impersonate?: boolean;
  /** Permite al médico editar el mapa corporal. */
  canEditBodyMap?: boolean;
}

/**
 * Tabs unificadas del expediente clínico (Medicamentos, Recetas, Estudios,
 * Tendencias, Presión, Oxigenación, Registros). Reutilizable tanto desde
 * la vista del paciente (Expediente Digital) como desde el Consultorio del médico.
 *
 * Cuando `impersonate=true` y el patientId no es el usuario actual, se activa el
 * contexto de impersonación temporalmente para que las páginas hijas (que usan
 * useEffectiveUserId) consulten/escriban contra el paciente seleccionado.
 */
export function PatientExpedienteTabs({ patientId, patientName, defaultTab = "mapa", impersonate = false, canEditBodyMap = false }: Props) {
  const { user } = useAuth();
  const { actingAsPatientId, setActingAs, clearActingAs } = useImpersonation();

  useEffect(() => {
    if (!impersonate) return;
    if (!user || !patientId) return;
    if (patientId === user.id) return;
    setActingAs(patientId, patientName || "Paciente");
    return () => {
      // Solo limpiamos si seguimos siendo nosotros quien fijó la impersonación
      clearActingAs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impersonate, patientId, user?.id]);

  // Si pidieron impersonar pero aún no se aplicó, esperamos un tick
  const ready = !impersonate || !user || patientId === user.id || actingAsPatientId === patientId;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <div className="space-y-2">
        <TabsList className="grid grid-cols-4 w-full h-auto gap-1">
          {TABS_ROW_1.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 flex-col sm:flex-row py-2 text-xs sm:text-sm">
                <Icon className="h-4 w-4" />
                <span className="truncate">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsList className="grid grid-cols-4 w-full h-auto gap-1">
          {TABS_ROW_2.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 flex-col sm:flex-row py-2 text-xs sm:text-sm">
                <Icon className="h-4 w-4" />
                <span className="truncate">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {!ready ? (
        <div className="flex justify-center p-6">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <TabsContent value="mapa" className="mt-4">
            <BodyMapEditor
              patientId={patientId}
              canEdit={canEditBodyMap}
              title="Mapa corporal del paciente"
              showQuickRegionAccess
            />
          </TabsContent>
          <TabsContent value="medicamentos" className="mt-4"><Medications /></TabsContent>
          <TabsContent value="recetas" className="mt-4"><Recetas /></TabsContent>
          <TabsContent value="estudios" className="mt-4"><Estudios /></TabsContent>
          <TabsContent value="tendencias" className="mt-4"><Tendencias /></TabsContent>
          <TabsContent value="presion" className="mt-4"><PresionArterial /></TabsContent>
          <TabsContent value="oxigenacion" className="mt-4"><OxygenSaturation /></TabsContent>
          <TabsContent value="registros" className="mt-4"><MedicalRecords /></TabsContent>
        </>
      )}
    </Tabs>
  );
}