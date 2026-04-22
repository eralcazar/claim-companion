import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Pencil, Trash2, FileText, Ban, ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react";
import { useDeleteEstudio, useUpdateEstudio } from "@/hooks/useEstudios";
import { useAuth } from "@/contexts/AuthContext";
import { ResultadosManager } from "./ResultadosManager";
import { supabase } from "@/integrations/supabase/client";
import { generateEstudioPDF } from "./estudioPdf";
import { toast } from "sonner";

const ESTADO_VARIANT: Record<string, any> = { solicitado: "default", en_proceso: "secondary", completado: "outline", cancelado: "destructive" };
const PRIO_VARIANT: Record<string, any> = { baja: "secondary", normal: "outline", urgente: "destructive" };
const PRIO_RANK: Record<string, number> = { baja: 1, normal: 2, urgente: 3 };

function getItems(estudio: any): any[] {
  if (Array.isArray(estudio.items) && estudio.items.length > 0) return estudio.items;
  if (estudio.tipo_estudio) {
    return [{
      tipo_estudio: estudio.tipo_estudio,
      descripcion: estudio.descripcion,
      cantidad: estudio.cantidad ?? 1,
      prioridad: estudio.prioridad ?? "normal",
      indicacion: estudio.indicacion,
    }];
  }
  return [];
}

interface Props {
  estudio: any;
  onEdit?: (e: any) => void;
}

export function EstudioCard({ estudio, onEdit }: Props) {
  const { user, roles } = useAuth();
  const del = useDeleteEstudio();
  const upd = useUpdateEstudio();
  const isAdmin = roles.includes("admin");
  const canEdit = isAdmin || estudio.doctor_id === user?.id || estudio.created_by === user?.id;
  const [open, setOpen] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const items = getItems(estudio);
  const visible = items.slice(0, 3);
  const more = items.length - visible.length;
  const maxPrio = items.reduce((acc, it) => (PRIO_RANK[it.prioridad] ?? 0) > (PRIO_RANK[acc] ?? 0) ? it.prioridad : acc, "baja");
  const fechaStr = new Date(estudio.created_at || Date.now()).toLocaleDateString("es-MX");

  const cancelar = async () => {
    if (!confirm("¿Cancelar este estudio?")) return;
    await upd.mutateAsync({ id: estudio.id, estado: "cancelado" });
  };

  const downloadPdf = async () => {
    setLoadingPdf(true);
    try {
      const [{ data: pProfile }, { data: dProfile }, { data: medico }] = await Promise.all([
        supabase.from("profiles").select("first_name, paternal_surname, maternal_surname, full_name, email, phone, telefono_celular, date_of_birth").eq("user_id", estudio.patient_id).maybeSingle(),
        supabase.from("profiles").select("first_name, paternal_surname, maternal_surname, full_name").eq("user_id", estudio.doctor_id).maybeSingle(),
        supabase.from("medicos").select("cedula_general, telefono_consultorio, direccion_consultorio").eq("user_id", estudio.doctor_id).maybeSingle(),
      ]);

      const nameOf = (p: any) =>
        p?.full_name?.trim() ||
        [p?.first_name, p?.paternal_surname, p?.maternal_surname].filter(Boolean).join(" ").trim() ||
        "—";

      generateEstudioPDF({
        estudio,
        patient: {
          nombre: nameOf(pProfile),
          email: pProfile?.email ?? undefined,
          telefono: pProfile?.telefono_celular ?? pProfile?.phone ?? undefined,
          date_of_birth: pProfile?.date_of_birth ?? null,
        },
        doctor: {
          nombre: nameOf(dProfile),
          cedula: medico?.cedula_general ?? undefined,
          telefono: medico?.telefono_consultorio ?? undefined,
          direccion: medico?.direccion_consultorio ?? undefined,
        },
      });
    } catch (e: any) {
      toast.error("No se pudo generar el PDF: " + (e?.message ?? "error"));
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Solicitud · {fechaStr}</div>
              <div className="text-xs text-muted-foreground">{items.length} estudio{items.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={ESTADO_VARIANT[estudio.estado] ?? "secondary"}>{estudio.estado}</Badge>
            <Badge variant={PRIO_VARIANT[maxPrio] ?? "outline"} className="text-xs">{maxPrio}</Badge>
          </div>
        </div>
        <ul className="text-sm space-y-0.5 pl-1">
          {visible.map((it, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-primary">•</span>
              <span className="capitalize">
                {(it.tipo_estudio ?? "").replace(/_/g, " ")}
                {it.descripcion ? ` — ${it.descripcion}` : ""}
                {it.cantidad && it.cantidad > 1 ? ` ×${it.cantidad}` : ""}
                <span className="text-xs text-muted-foreground"> · {it.prioridad}</span>
              </span>
            </li>
          ))}
          {more > 0 && <li className="text-xs text-muted-foreground pl-3">y {more} más…</li>}
        </ul>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {estudio.ayuno_obligatorio && <div>⚠️ Ayuno {estudio.horas_ayuno ? `${estudio.horas_ayuno}h` : "obligatorio"}</div>}
          {estudio.preparacion && <div>Preparación: {estudio.preparacion}</div>}
          {estudio.laboratorio_sugerido && <div>Lab. sugerido: {estudio.laboratorio_sugerido}</div>}
          {estudio.indicacion && <div className="line-clamp-2">{estudio.indicacion}</div>}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={downloadPdf} disabled={loadingPdf}>
            {loadingPdf ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            <FileText className="h-3.5 w-3.5 mr-1" />Resultados
            {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
          {canEdit && onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(estudio)}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
          )}
          {canEdit && estudio.estado !== "cancelado" && (
            <Button size="sm" variant="ghost" onClick={cancelar}><Ban className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
          )}
          {(isAdmin || estudio.created_by === user?.id) && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("¿Eliminar?")) del.mutate(estudio.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {open && (
          <div className="pt-3 border-t">
            <ResultadosManager estudio={estudio} canManage={canEdit} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
