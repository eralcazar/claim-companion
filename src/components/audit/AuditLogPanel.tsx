import { useAuditLogs } from "@/hooks/useMedicalAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const TABLE_LABEL: Record<string, string> = {
  body_annotations: "Mapa corporal",
  recetas: "Receta",
  receta_items: "Medicamento (receta)",
  estudios: "Estudio",
  blood_pressure_readings: "Presión arterial",
  oxygen_saturation_readings: "Oxigenación",
  temperature_readings: "Temperatura",
  glucose_readings: "Glucosa",
  medical_alerts: "Alerta médica",
  surgeries: "Cirugía",
  procedures_log: "Procedimiento",
  mh_conditions: "Condición médica",
  mh_allergies: "Alergia",
  mh_family: "Antecedente familiar",
  mh_lifestyle: "Estilo de vida",
  medications: "Medicamento",
};
const ACTION_VARIANT: Record<string, any> = { INSERT: "default", UPDATE: "secondary", DELETE: "destructive" };
const ACTION_LABEL: Record<string, string> = { INSERT: "Creado", UPDATE: "Editado", DELETE: "Eliminado" };

interface Props { patientId: string }

export function AuditLogPanel({ patientId }: Props) {
  const { data = [], isLoading } = useAuditLogs(patientId, 200);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Historial de cambios</h2>
        <p className="text-xs text-muted-foreground">Auditoría de cambios sobre el expediente.</p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Sin cambios registrados.</p>
      ) : (
        <div className="space-y-2">
          {data.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-3 text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={ACTION_VARIANT[l.action]}>{ACTION_LABEL[l.action] ?? l.action}</Badge>
                  <span className="font-medium">{TABLE_LABEL[l.table_name] ?? l.table_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{(l.record_id ?? "").slice(0, 8)}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.at).toLocaleString("es-MX")}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}