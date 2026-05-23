import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { RecurrencesPanel } from "@/components/procedimientos/RecurrencesPanel";

export default function Procedimientos() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;
  if (!patientId) return null;
  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-heading font-bold mb-4">Procedimientos</h1>
      <RecurrencesPanel patientId={patientId} />
    </div>
  );
}