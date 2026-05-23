import { useAuth } from "@/contexts/AuthContext";
import { InvoicesPanel } from "@/components/facturacion/InvoicesPanel";

export default function Facturacion() {
  const { user, roles } = useAuth();
  if (!user) return null;
  const isMedico = roles.includes("medico" as any) || roles.includes("odontologo" as any) || roles.includes("admin" as any);
  return (
    <div className="container py-6 max-w-4xl">
      <InvoicesPanel mode={isMedico ? "medico" : "paciente"} userId={user.id} />
    </div>
  );
}