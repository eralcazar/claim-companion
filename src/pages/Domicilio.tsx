import { useAuth } from "@/contexts/AuthContext";
import { HomeVisitsPanel } from "@/components/domicilio/HomeVisitsPanel";

export default function Domicilio() {
  const { user, roles } = useAuth();
  if (!user) return null;
  const isMedico = roles.includes("medico" as any) || roles.includes("admin" as any);
  return (
    <div className="container py-6 max-w-4xl">
      <HomeVisitsPanel mode={isMedico ? "medico" : "paciente"} userId={user.id} />
    </div>
  );
}