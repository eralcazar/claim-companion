import { Link } from "react-router-dom";
import { useAssignedPatients } from "@/hooks/usePatientPersonnel";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ChevronRight, Sparkles } from "lucide-react";

export default function PharmacyPanel() {
  const { data: patients = [], isLoading } = useAssignedPatients("farmacia");

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Store className="h-6 w-6 text-primary" />
        Panel Farmacia
      </h1>
      <p className="text-sm text-muted-foreground">Recetas activas de pacientes con acceso otorgado.</p>

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Venta en línea de medicamentos — próximamente (Fase 2 con Stripe).
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : patients.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin pacientes asignados.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => (
            <Link key={p.id} to={`/personal/paciente/${p.patient_id}`}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{p.patient_email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}