import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { BodyMapSVG } from "./BodyMapSVG";
import { BodyAnnotationDialog } from "./BodyAnnotationDialog";
import {
  useBodyAnnotations,
  BODY_PARTS_LABEL,
  SEVERITY_LABEL,
  BodyAnnotation,
} from "@/hooks/useBodyAnnotations";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  appointmentId?: string;
  patientId: string;
  canEdit?: boolean;
  title?: string;
}

const severityVariant: Record<string, "default" | "secondary" | "destructive"> = {
  leve: "secondary",
  moderada: "default",
  grave: "destructive",
};

export function BodyMapEditor({ appointmentId, patientId, canEdit = false, title }: Props) {
  const [view, setView] = useState<"frontal" | "posterior">("frontal");
  const [pick, setPick] = useState<{ body_part: string; marker_x: number; marker_y: number } | null>(null);
  const [editing, setEditing] = useState<BodyAnnotation | null>(null);
  const [open, setOpen] = useState(false);

  const { data: annotations = [], isLoading } = useBodyAnnotations({
    appointmentId,
    patientId: appointmentId ? undefined : patientId,
  });

  const visible = annotations.filter((a) => a.body_view === view);

  const handlePick = (info: { body_part: string; marker_x: number; marker_y: number }) => {
    if (!canEdit) return;
    setEditing(null);
    setPick(info);
    setOpen(true);
  };

  const handleMarkerClick = (id: string) => {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    setPick(null);
    setEditing(ann);
    setOpen(true);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {canEdit && (
          <p className="text-xs text-muted-foreground">
            Toca una zona del cuerpo para registrar un hallazgo. Toca un marcador para editarlo.
          </p>
        )}

        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="frontal">Frontal</TabsTrigger>
            <TabsTrigger value="posterior">Posterior</TabsTrigger>
          </TabsList>
          <TabsContent value={view} className="pt-4">
            <BodyMapSVG
              view={view}
              markers={visible.map((a) => ({
                id: a.id,
                body_part: a.body_part,
                marker_x: a.marker_x,
                marker_y: a.marker_y,
                severity: a.severity,
              }))}
              onPick={handlePick}
              onMarkerClick={handleMarkerClick}
              readOnly={!canEdit}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {isLoading ? "Cargando..." : `${visible.length} anotación(es) en vista ${view}`}
          </p>
          {visible.map((a) => (
            <button
              key={a.id}
              onClick={() => handleMarkerClick(a.id)}
              className="w-full text-left rounded border p-2 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={severityVariant[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
                  <span className="text-sm truncate">{BODY_PARTS_LABEL[a.body_part] ?? a.body_part}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(a.created_at), "dd MMM", { locale: es })}
                </span>
              </div>
              {a.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.note}</p>}
              {a.files && a.files.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  📎 {a.files.length} archivo(s)
                </p>
              )}
            </button>
          ))}
        </div>

        <BodyAnnotationDialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setPick(null);
              setEditing(null);
            }
          }}
          appointmentId={appointmentId}
          patientId={patientId}
          view={view}
          pick={pick}
          existing={editing}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  );
}
