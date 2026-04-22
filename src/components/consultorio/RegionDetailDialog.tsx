import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileIcon, Pencil, Trash2, ShieldCheck, ShieldAlert, ShieldX, Clock, Image as ImageIcon, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BodyAnnotation,
  BODY_PARTS_LABEL,
  SEVERITY_LABEL,
  MODERATION_LABEL,
  ModerationStatus,
  useDeleteBodyAnnotation,
  useModerateBodyAnnotation,
  getSignedUrl,
  BodyAnnotationFile,
} from "@/hooks/useBodyAnnotations";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bodyPart: string;
  bodyView: "frontal" | "posterior";
  annotations: BodyAnnotation[];
  canModerate: boolean;
  isCreator: (annotationId: string) => boolean;
  onEdit: (annotation: BodyAnnotation) => void;
}

const severityVariant: Record<string, "default" | "secondary" | "destructive"> = {
  leve: "secondary",
  moderada: "default",
  grave: "destructive",
};

const moderationVariant: Record<ModerationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "outline",
  validada: "default",
  observada: "secondary",
  rechazada: "destructive",
};

function ZoomedRegion({ markers, view }: { markers: BodyAnnotation[]; view: "frontal" | "posterior" }) {
  // Compute bounding box of all markers in this region with padding
  const xs = markers.map((m) => Number(m.marker_x));
  const ys = markers.map((m) => Number(m.marker_y));
  const minX = Math.max(0, Math.min(...xs) - 10);
  const maxX = Math.min(100, Math.max(...xs) + 10);
  const minY = Math.max(0, Math.min(...ys) - 10);
  const maxY = Math.min(100, Math.max(...ys) + 10);
  const w = Math.max(20, maxX - minX);
  const h = Math.max(20, maxY - minY);

  // Map % to viewBox 0..200 x 0..300 (matches BodyMapSVG canvas)
  const vbX = (minX / 100) * 200;
  const vbY = (minY / 100) * 300;
  const vbW = (w / 100) * 200;
  const vbH = (h / 100) * 300;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-muted/30">
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="w-full h-48"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* simple body silhouette outline scaled to viewbox */}
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="hsl(var(--muted))" opacity="0.4" />
        {markers.map((m, idx) => {
          const cx = (Number(m.marker_x) / 100) * 200;
          const cy = (Number(m.marker_y) / 100) * 300;
          const color =
            m.severity === "grave"
              ? "hsl(var(--destructive))"
              : m.severity === "moderada"
              ? "hsl(38 92% 50%)"
              : "hsl(var(--primary))";
          return (
            <g key={m.id}>
              <circle cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={0.6} />
              <text
                x={cx}
                y={cy - 4}
                fontSize={3}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
        <ZoomIn className="h-3 w-3" /> Vista ampliada
      </div>
    </div>
  );
}

function FileChip({ file }: { file: BodyAnnotationFile }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    getSignedUrl(file.file_path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [file.file_path]);

  const isImage = file.file_type.startsWith("image/");
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded border overflow-hidden hover:border-primary transition-colors"
    >
      {isImage && url ? (
        <img src={url} alt={file.file_name} className="h-20 w-20 object-cover" />
      ) : (
        <div className="h-20 w-20 flex items-center justify-center bg-muted">
          <FileIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-[10px] truncate px-1 py-0.5 max-w-[80px]">{file.file_name}</p>
    </a>
  );
}

export function RegionDetailDialog({
  open,
  onOpenChange,
  bodyPart,
  bodyView,
  annotations,
  canModerate,
  isCreator,
  onEdit,
}: Props) {
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState("");
  const moderate = useModerateBodyAnnotation();
  const del = useDeleteBodyAnnotation();

  const sorted = useMemo(
    () =>
      [...annotations].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [annotations]
  );

  const counts = useMemo(() => {
    const c = { pendiente: 0, validada: 0, observada: 0, rechazada: 0 };
    annotations.forEach((a) => { c[a.moderation_status] = (c[a.moderation_status] ?? 0) + 1; });
    return c;
  }, [annotations]);

  const applyModeration = async (id: string, status: ModerationStatus) => {
    await moderate.mutateAsync({
      id,
      moderation_status: status,
      moderation_note: moderationNote || null,
    });
    setModeratingId(null);
    setModerationNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{BODY_PARTS_LABEL[bodyPart] ?? bodyPart}</span>
            <Badge variant="outline" className="capitalize">{bodyView}</Badge>
            <Badge variant="secondary">{annotations.length} hallazgo(s)</Badge>
          </DialogTitle>
          <DialogDescription>
            Vista ampliada del área marcada con todo el historial de notas y archivos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <ZoomedRegion markers={annotations} view={bodyView} />
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-sm">Resumen de moderación</p>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline" className="justify-between">Pendientes <span className="ml-2 font-bold">{counts.pendiente}</span></Badge>
              <Badge variant="default" className="justify-between">Validadas <span className="ml-2 font-bold">{counts.validada}</span></Badge>
              <Badge variant="secondary" className="justify-between">Observación <span className="ml-2 font-bold">{counts.observada}</span></Badge>
              <Badge variant="destructive" className="justify-between">Rechazadas <span className="ml-2 font-bold">{counts.rechazada}</span></Badge>
            </div>
            {canModerate && (
              <p className="text-[11px] text-muted-foreground pt-1">
                Como médico puedes validar, marcar en observación o rechazar cada hallazgo.
              </p>
            )}
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-3">
            {sorted.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Sin hallazgos en esta zona.</p>
            )}
            {sorted.map((a, idx) => {
              const ownByMe = isCreator(a.id);
              const isModerating = moderatingId === a.id;
              return (
                <div key={a.id} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {sorted.length - idx}
                      </span>
                      <Badge variant={severityVariant[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
                      <Badge variant={moderationVariant[a.moderation_status]} className="gap-1">
                        {a.moderation_status === "validada" && <ShieldCheck className="h-3 w-3" />}
                        {a.moderation_status === "observada" && <ShieldAlert className="h-3 w-3" />}
                        {a.moderation_status === "rechazada" && <ShieldX className="h-3 w-3" />}
                        {a.moderation_status === "pendiente" && <Clock className="h-3 w-3" />}
                        {MODERATION_LABEL[a.moderation_status]}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(a.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>

                  {a.note ? (
                    <p className="text-sm whitespace-pre-wrap">{a.note}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin nota.</p>
                  )}

                  {a.files && a.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {a.files.map((f) => <FileChip key={f.id} file={f} />)}
                    </div>
                  )}

                  {a.moderation_note && (
                    <div className="rounded bg-muted/40 p-2 text-xs">
                      <p className="font-semibold flex items-center gap-1 mb-0.5">
                        <ShieldCheck className="h-3 w-3" /> Comentario del médico
                      </p>
                      <p className="whitespace-pre-wrap">{a.moderation_note}</p>
                      {a.moderated_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(a.moderated_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <div className="flex gap-1">
                      {ownByMe && (
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onEdit(a)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      )}
                      {ownByMe && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => del.mutate(a.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Borrar
                        </Button>
                      )}
                    </div>
                    {canModerate && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={a.moderation_status === "validada" ? "default" : "outline"}
                          className="h-7 px-2"
                          onClick={() => { setModeratingId(a.id); setModerationNote(a.moderation_note ?? ""); }}
                        >
                          Moderar
                        </Button>
                      </div>
                    )}
                  </div>

                  {isModerating && canModerate && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs">Comentario (opcional)</Label>
                      <Textarea
                        rows={2}
                        value={moderationNote}
                        onChange={(e) => setModerationNote(e.target.value)}
                        placeholder="Observaciones para el paciente o personal..."
                      />
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="default" className="h-7" disabled={moderate.isPending}
                          onClick={() => applyModeration(a.id, "validada")}>
                          <ShieldCheck className="h-3 w-3 mr-1" /> Validar
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7" disabled={moderate.isPending}
                          onClick={() => applyModeration(a.id, "observada")}>
                          <ShieldAlert className="h-3 w-3 mr-1" /> Observación
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7" disabled={moderate.isPending}
                          onClick={() => applyModeration(a.id, "rechazada")}>
                          <ShieldX className="h-3 w-3 mr-1" /> Rechazar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7"
                          onClick={() => { setModeratingId(null); setModerationNote(""); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
