import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, FileIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BodyAnnotation,
  Severity,
  BODY_PARTS_LABEL,
  SEVERITY_LABEL,
  useUpsertBodyAnnotation,
  useDeleteBodyAnnotation,
  useUploadAnnotationFile,
  useDeleteAnnotationFile,
  getSignedUrl,
  BodyAnnotationFile,
} from "@/hooks/useBodyAnnotations";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appointmentId?: string | null;
  patientId: string;
  view: "frontal" | "posterior";
  pick?: { body_part: string; marker_x: number; marker_y: number } | null;
  existing?: BodyAnnotation | null;
  canEdit: boolean;
}

export function BodyAnnotationDialog({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  view,
  pick,
  existing,
  canEdit,
}: Props) {
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState<Severity>("leve");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upsert = useUpsertBodyAnnotation();
  const del = useDeleteBodyAnnotation();
  const upload = useUploadAnnotationFile();
  const delFile = useDeleteAnnotationFile();

  useEffect(() => {
    if (existing) {
      setNote(existing.note ?? "");
      setSeverity(existing.severity);
    } else {
      setNote("");
      setSeverity("leve");
    }
  }, [existing, open]);

  const bodyPart = existing?.body_part ?? pick?.body_part;
  const markerX = existing?.marker_x ?? pick?.marker_x ?? 50;
  const markerY = existing?.marker_y ?? pick?.marker_y ?? 50;

  const save = async () => {
    const saved = await upsert.mutateAsync({
      id: existing?.id,
      appointment_id: appointmentId ?? null,
      patient_id: patientId,
      body_view: view,
      body_part: bodyPart!,
      marker_x: markerX,
      marker_y: markerY,
      note: note || null,
      severity,
    });
    if (!existing) {
      // close after creating; user can re-open to add files
      onOpenChange(false);
    }
    return saved;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !existing) return;
    for (const f of Array.from(files)) {
      await upload.mutateAsync({ annotationId: existing.id, file: f });
    }
  };

  const openFile = async (file: BodyAnnotationFile) => {
    const url = await getSignedUrl(file.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Editar anotación" : "Nueva anotación"}
            {bodyPart && (
              <Badge variant="secondary" className="ml-2">
                {BODY_PARTS_LABEL[bodyPart] ?? bodyPart}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Severidad</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["leve", "moderada", "grave"] as Severity[]).map((s) => (
                  <SelectItem key={s} value={s}>{SEVERITY_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nota / hallazgo</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe el hallazgo, dolor, lesión, etc."
              rows={4}
              disabled={!canEdit}
            />
          </div>

          {existing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Archivos adjuntos</Label>
                {canEdit && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => onFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={upload.isPending}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {upload.isPending ? "Subiendo..." : "Subir"}
                    </Button>
                  </>
                )}
              </div>
              {existing.files && existing.files.length > 0 ? (
                <div className="space-y-1">
                  {existing.files.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <button
                        type="button"
                        className="flex-1 text-left truncate hover:underline"
                        onClick={() => openFile(f)}
                      >
                        {f.file_name}
                      </button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => delFile.mutate(f)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin archivos.</p>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {existing && canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await del.mutateAsync(existing.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                Eliminar
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              {canEdit && (
                <Button size="sm" onClick={save} disabled={upsert.isPending}>
                  {upsert.isPending ? "Guardando..." : "Guardar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
