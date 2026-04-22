import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, Download, Pencil, Trash2, Ban, BellRing, Square } from "lucide-react";
import { useDeleteReceta, useUpdateReceta } from "@/hooks/useRecetas";
import { generateRecetaPDF } from "./recetaPdf";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveSchedules, useStartTakingMedication, useStopTakingMedication } from "@/hooks/useMedicationSchedule";

const FREQ_LABEL: Record<string, string> = {
  cada_4h: "c/4h", cada_6h: "c/6h", cada_8h: "c/8h", cada_12h: "c/12h",
  cada_24h: "c/24h", cada_48h: "c/48h", semanal: "Semanal", otro: "Personalizada",
};
const ESTADO_VARIANT: Record<string, any> = { activa: "default", completada: "secondary", cancelada: "destructive" };

interface Props {
  receta: any;
  onEdit?: (r: any) => void;
}

function itemFrequency(it: any) {
  if (it.frecuencia === "otro" && it.frecuencia_horas) return `c/${it.frecuencia_horas}h`;
  return FREQ_LABEL[it.frecuencia] ?? it.frecuencia;
}

function getItems(receta: any): any[] {
  if (Array.isArray(receta.items) && receta.items.length > 0) return receta.items;
  // Fallback for legacy single-medication recetas
  if (receta.medicamento_nombre) {
    return [{
      medicamento_nombre: receta.medicamento_nombre,
      marca_comercial: receta.marca_comercial,
      dosis: receta.dosis,
      unidad_dosis: receta.unidad_dosis,
      cantidad: receta.cantidad,
      via_administracion: receta.via_administracion,
      frecuencia: receta.frecuencia,
      frecuencia_horas: receta.frecuencia_horas,
      dias_a_tomar: receta.dias_a_tomar,
      indicacion: receta.indicacion,
    }];
  }
  return [];
}

export function RecetaCard({ receta, onEdit }: Props) {
  const { user, roles } = useAuth();
  const del = useDeleteReceta();
  const upd = useUpdateReceta();
  const startTaking = useStartTakingMedication();
  const stopTaking = useStopTakingMedication();
  const isAdmin = roles.includes("admin");
  const canEdit = isAdmin || receta.doctor_id === user?.id || receta.created_by === user?.id;
  const items = getItems(receta);
  const visible = items.slice(0, 3);
  const extra = items.length - visible.length;
  const isPatient = user?.id === receta.patient_id;
  const canToggleTaking = isPatient || canEdit;
  const { data: schedules = [] } = useActiveSchedules(receta.patient_id);
  const scheduleByItem = new Map(schedules.filter((s) => s.receta_item_id).map((s) => [s.receta_item_id!, s]));

  const downloadPdf = async () => {
    try {
      const [{ data: pat }, { data: doc }, { data: med }] = await Promise.all([
        supabase.from("profiles").select("full_name, first_name, paternal_surname, email, telefono_celular").eq("user_id", receta.patient_id).maybeSingle(),
        supabase.from("profiles").select("full_name, first_name, paternal_surname, email, telefono_celular").eq("user_id", receta.doctor_id).maybeSingle(),
        supabase.from("medicos").select("cedula_general, telefono_consultorio, direccion_consultorio").eq("user_id", receta.doctor_id).maybeSingle(),
      ]);
      const nameOf = (p: any) => p?.full_name?.trim() || [p?.first_name, p?.paternal_surname].filter(Boolean).join(" ") || "—";
      generateRecetaPDF({
        receta: { ...receta, items },
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

  const fecha = new Date(receta.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Receta · {fecha}</div>
              <div className="text-xs text-muted-foreground">{items.length} medicamento{items.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <Badge variant={ESTADO_VARIANT[receta.estado] ?? "secondary"}>{receta.estado}</Badge>
        </div>
        <ul className="text-sm space-y-1">
          {visible.map((it, i) => {
            const dosis = [it.dosis, it.unidad_dosis].filter(Boolean).join(" ");
            const parts = [
              it.medicamento_nombre,
              dosis && `— ${dosis}`,
              it.cantidad ? `× ${it.cantidad}` : null,
              `· ${itemFrequency(it)}`,
              it.dias_a_tomar ? `· ${it.dias_a_tomar} días` : null,
            ].filter(Boolean).join(" ");
            const sched = it.id ? scheduleByItem.get(it.id) : undefined;
            const nextStr = sched
              ? new Date(sched.next_dose_at).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
              : null;
            return (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Pill className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{parts}</span>
                </div>
                {canToggleTaking && it.id && receta.estado === "activa" && (
                  <div className="pl-5 flex items-center gap-2">
                    {sched ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          disabled={stopTaking.isPending}
                          onClick={() => stopTaking.mutate(sched.id)}
                        >
                          <Square className="h-3 w-3 mr-1" /> Detener
                        </Button>
                        <span className="text-[11px] text-muted-foreground">🔔 Próxima: {nextStr}</span>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={startTaking.isPending}
                        onClick={() => startTaking.mutate({ item: it, receta })}
                      >
                        <BellRing className="h-3 w-3 mr-1" /> Tomando
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {extra > 0 && <li className="text-xs text-muted-foreground pl-5">y {extra} más…</li>}
          {items.length === 0 && <li className="text-xs text-muted-foreground">Sin medicamentos</li>}
        </ul>
        {receta.indicacion && <div className="text-xs text-muted-foreground line-clamp-2">{receta.indicacion}</div>}
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
