import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { OdontogramaPanel } from "@/components/odontologia/OdontogramaPanel";

export default function Odontograma() {
  const { user, roles } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  if (!patientId) return null;
  const canEdit = roles.includes("odontologo" as any) || roles.includes("medico" as any) || roles.includes("admin" as any);
  return (
    <div className="container py-6 max-w-5xl">
      <h1 className="text-2xl font-heading font-bold mb-4">Odontograma</h1>
      <OdontogramaPanel patientId={patientId} canEdit={canEdit} />
    </div>
  );
}