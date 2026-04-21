import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, Download, Pencil, Trash2, Ban } from "lucide-react";
import { useDeleteReceta, useUpdateReceta } from "@/hooks/useRecetas";
import { generateRecetaPDF } from "./recetaPdf";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FREQ_LABEL: Record<string, string> = {
  cada_4h: "c/4h", cada_6h: "c/6h", cada_8h: "c/8h", cada_12h: "c/12h",
  cada_24h: "c/24h", cada_48h: "c/48h", semanal: "Semanal", otro: "Personalizada",
};
const ESTADO_VARIANT: Record<string, any> = { activa: "default", completada: "secondary", cancelada: "destructive" };

interface Props {
  receta: any;
  onEdit?: (r: any) => void;
}

export function RecetaCard({ receta, onEdit }: Props) {
  const { user, roles } = useAuth();
  const del = useDeleteReceta();
  const upd = useUpdateReceta();
  const isAdmin = roles.includes("admin");
  const canEdit = isAdmin || receta.doctor_id === user?.id || receta.created_by === user?.id;

  const downloadPdf = async () => {
    try {
      const [{ data: pat }, { data: doc }, { data: med }] = await Promise.all([
        supabase.from("profiles").select("full_name, first_name, paternal_surname, email, telefono_celular").eq("user_id", receta.patient_id).maybeSingle(),
        supabase.from("profiles").select("full_name, first_name, paternal_surname, email, telefono_celular").eq("user_id", receta.doctor_id).maybeSingle(),
        supabase.from("medicos").select("cedula_general, telefono_consultorio, direccion_consultorio").eq("user_id", receta.doctor_id).maybeSingle(),
      ]);
      const nameOf = (p: any) => p?.full_name?.trim() || [p?.first_name, p?.paternal_surname].filter(Boolean).join(" ") || "—";
      generateRecetaPDF({
        receta,
        patient: { nombre: nameOf(pat), email: pat?.email, telefono: pat?.telefono_celular },
        doctor: {
          nombre: nameOf(doc),
          cedula: med?.cedula_general,
          telefono: med?.telefono_consultorio,
          direccion: med?.direccion_consultorio,
        },
      });
    } catch (e: any) {
      toast.error("Error al generar PDF: " + e.message);
    }
  };

  const cancelar = async () => {
    if (!confirm("¿Cancelar esta receta?")) return;
    await upd.mutateAsync({ id: receta.id, estado: "cancelada" });
  };

  const dosisStr = [receta.dosis, receta.unidad_dosis].filter(Boolean).join(" ");
  const freq = receta.frecuencia === "otro" && receta.frecuencia_horas
    ? `c/${receta.frecuencia_horas}h` : FREQ_LABEL[receta.frecuencia];

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">{receta.medicamento_nombre}</div>
              {receta.marca_comercial && <div className="text-xs text-muted-foreground">{receta.marca_comercial}</div>}
            </div>
          </div>
          <Badge variant={ESTADO_VARIANT[receta.estado] ?? "secondary"}>{receta.estado}</Badge>
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {dosisStr && <div>Dosis: {dosisStr} {receta.cantidad ? `× ${receta.cantidad}` : ""} {receta.via_administracion ?? ""}</div>}
          <div>Frecuencia: {freq}{receta.dias_a_tomar ? ` · ${receta.dias_a_tomar} días` : ""}</div>
          {receta.indicacion && <div className="line-clamp-2">{receta.indicacion}</div>}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={downloadPdf}><Download className="h-3.5 w-3.5 mr-1" />PDF</Button>
          {canEdit && onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(receta)}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
          )}
          {canEdit && receta.estado !== "cancelada" && (
            <Button size="sm" variant="ghost" onClick={cancelar}><Ban className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
          )}
          {(isAdmin || receta.created_by === user?.id) && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("¿Eliminar?")) del.mutate(receta.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
