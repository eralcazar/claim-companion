import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MedicoEditor } from "@/components/medicos/MedicoEditor";

export default function DoctorProfile() {
  const { user, roles } = useAuth();

  if (!roles.includes("medico") && !roles.includes("admin"))
    return <Navigate to="/" replace />;
  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Mi Perfil Médico</h1>
        <p className="text-sm text-muted-foreground">
          Captura tu información profesional, especialidades y documentos.
        </p>
      </div>
      <MedicoEditor userId={user.id} />
    </div>
  );
}