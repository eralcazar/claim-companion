import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Pencil, Trash2, FileText, Ban, ChevronDown, ChevronUp } from "lucide-react";
import { useDeleteEstudio, useUpdateEstudio } from "@/hooks/useEstudios";
import { useAuth } from "@/contexts/AuthContext";
import { ResultadosManager } from "./ResultadosManager";

const ESTADO_VARIANT: Record<string, any> = { solicitado: "default", en_proceso: "secondary", completado: "outline", cancelado: "destructive" };
const PRIO_VARIANT: Record<string, any> = { baja: "secondary", normal: "outline", urgente: "destructive" };

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

  const cancelar = async () => {
    if (!confirm("¿Cancelar este estudio?")) return;
    await upd.mutateAsync({ id: estudio.id, estado: "cancelado" });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold capitalize">{estudio.tipo_estudio.replace(/_/g, " ")}</div>
              {estudio.descripcion && <div className="text-xs text-muted-foreground">{estudio.descripcion}</div>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={ESTADO_VARIANT[estudio.estado] ?? "secondary"}>{estudio.estado}</Badge>
            <Badge variant={PRIO_VARIANT[estudio.prioridad] ?? "outline"} className="text-xs">{estudio.prioridad}</Badge>
          </div>
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {estudio.ayuno_obligatorio && <div>⚠️ Ayuno {estudio.horas_ayuno ? `${estudio.horas_ayuno}h` : "obligatorio"}</div>}
          {estudio.preparacion && <div>Preparación: {estudio.preparacion}</div>}
          {estudio.laboratorio_sugerido && <div>Lab. sugerido: {estudio.laboratorio_sugerido}</div>}
          {estudio.indicacion && <div className="line-clamp-2">{estudio.indicacion}</div>}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
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
