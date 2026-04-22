import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize2, History } from "lucide-react";
import { useState, useMemo } from "react";
import { BodyMapSVG } from "./BodyMapSVG";
import { BodyAnnotationDialog } from "./BodyAnnotationDialog";
import { RegionDetailDialog } from "./RegionDetailDialog";
import {
  useBodyAnnotations,
  BODY_PARTS_LABEL,
  SEVERITY_LABEL,
  BodyAnnotation,
} from "@/hooks/useBodyAnnotations";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  appointmentId?: string;
  patientId: string;
  canEdit?: boolean;
  title?: string;
  showQuickRegionAccess?: boolean;
}

const severityVariant: Record<string, "default" | "secondary" | "destructive"> = {
  leve: "secondary",
  moderada: "default",
  grave: "destructive",
};

export function BodyMapEditor({ appointmentId, patientId, canEdit = false, title, showQuickRegionAccess = false }: Props) {
  const [view, setView] = useState<"frontal" | "posterior">("frontal");
  const [pick, setPick] = useState<{ body_part: string; marker_x: number; marker_y: number } | null>(null);
  const [editing, setEditing] = useState<BodyAnnotation | null>(null);
  const [open, setOpen] = useState(false);
  const [regionPart, setRegionPart] = useState<string | null>(null);
  const { user, roles } = useAuth();
  const canModerate = canEdit && (roles.includes("medico") || roles.includes("admin"));

  const { data: annotations = [], isLoading } = useBodyAnnotations({
    appointmentId,
    patientId: appointmentId ? undefined : patientId,
  });

  const visible = annotations.filter((a) => a.body_view === view);

  // Group by body_part
  const grouped = visible.reduce<Record<string, BodyAnnotation[]>>((acc, a) => {
    (acc[a.body_part] ||= []).push(a);
    return acc;
  }, {});

  // Total annotations per body_part across both views (for quick access selector)
  const countsByPart = useMemo(() => {
    return annotations.reduce<Record<string, number>>((acc, a) => {
      acc[a.body_part] = (acc[a.body_part] ?? 0) + 1;
      return acc;
    }, {});
  }, [annotations]);

  const sortedParts = useMemo(
    () =>
      Object.entries(BODY_PARTS_LABEL).sort(([, a], [, b]) =>
        String(a).localeCompare(String(b), "es"),
      ),
    [],
  );

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

        {showQuickRegionAccess && (
          <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/30">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-primary" />
              Ir al historial de una zona
            </p>
            <Select
              value=""
              onValueChange={(part) => {
                if (part) setRegionPart(part);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona una zona del cuerpo..." />
              </SelectTrigger>
              <SelectContent>
                {sortedParts.map(([key, label]) => {
                  const count = countsByPart[key] ?? 0;
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        <span>{label}</span>
                        <Badge
                          variant={count > 0 ? "secondary" : "outline"}
                          className="text-[10px] h-4 px-1.5"
                        >
                          {count}
                        </Badge>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Abre el historial completo y la moderación de la zona seleccionada.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {isLoading ? "Cargando..." : `${visible.length} anotación(es) en vista ${view}`}
          </p>
          {Object.entries(grouped).map(([part, items]) => (
            <div key={part} className="rounded border p-2 space-y-1.5 bg-card">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate">
                    {BODY_PARTS_LABEL[part] ?? part}
                  </span>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => setRegionPart(part)}
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Ver zona
                </Button>
              </div>
              {items.slice(0, 2).map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleMarkerClick(a.id)}
                  className="w-full text-left rounded border p-2 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={severityVariant[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
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
              {items.length > 2 && (
                <button
                  onClick={() => setRegionPart(part)}
                  className="text-xs text-primary hover:underline w-full text-left"
                >
                  + {items.length - 2} más en esta zona
                </button>
              )}
            </div>
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

        {regionPart && (
          <RegionDetailDialog
            open={!!regionPart}
            onOpenChange={(o) => { if (!o) setRegionPart(null); }}
            bodyPart={regionPart}
            bodyView={view}
            annotations={grouped[regionPart] ?? []}
            canModerate={canModerate}
            isCreator={(id) => {
              const a = annotations.find((x) => x.id === id);
              return !!a && !!user && a.created_by === user.id;
            }}
            onEdit={(a) => {
              setRegionPart(null);
              setEditing(a);
              setPick(null);
              setOpen(true);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
