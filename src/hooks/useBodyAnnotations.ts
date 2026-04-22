import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type BodyView = "frontal" | "posterior";
export type Severity = "leve" | "moderada" | "grave";
export type ModerationStatus = "pendiente" | "validada" | "observada" | "rechazada";

export interface BodyAnnotationFile {
  id: string;
  annotation_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface BodyAnnotation {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  created_by: string;
  body_view: BodyView;
  body_part: string;
  marker_x: number;
  marker_y: number;
  note: string | null;
  severity: Severity;
  created_at: string;
  updated_at: string;
  moderation_status: ModerationStatus;
  moderation_note: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  files?: BodyAnnotationFile[];
}

interface Params {
  appointmentId?: string;
  patientId?: string;
}

export function useBodyAnnotations({ appointmentId, patientId }: Params) {
  return useQuery({
    queryKey: ["body-annotations", appointmentId ?? null, patientId ?? null],
    enabled: !!(appointmentId || patientId),
    queryFn: async () => {
      let q = supabase
        .from("body_annotations" as any)
        .select("*, files:body_annotation_files(*)")
        .order("created_at", { ascending: false });
      if (appointmentId) q = q.eq("appointment_id", appointmentId);
      else if (patientId) q = q.eq("patient_id", patientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as BodyAnnotation[];
    },
  });
}

export function useUpsertBodyAnnotation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      appointment_id?: string | null;
      patient_id: string;
      body_view: BodyView;
      body_part: string;
      marker_x: number;
      marker_y: number;
      note?: string | null;
      severity: Severity;
    }) => {
      if (!user) throw new Error("No autenticado");
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("body_annotations" as any)
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as any;
      }
      const { data, error } = await supabase
        .from("body_annotations" as any)
        .insert({ ...input, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-annotations"] });
      toast.success("Anotación guardada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });
}

export function useDeleteBodyAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("body_annotations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-annotations"] });
      toast.success("Anotación eliminada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al eliminar"),
  });
}

export function useUploadAnnotationFile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ annotationId, file }: { annotationId: string; file: File }) => {
      if (!user) throw new Error("No autenticado");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${annotationId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("body-annotations").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from("body_annotation_files" as any).insert({
        annotation_id: annotationId,
        file_path: path,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        uploaded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-annotations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al subir archivo"),
  });
}

export function useDeleteAnnotationFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: BodyAnnotationFile) => {
      await supabase.storage.from("body-annotations").remove([file.file_path]);
      const { error } = await supabase.from("body_annotation_files" as any).delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-annotations"] }),
    onError: (e: any) => toast.error(e?.message ?? "Error al eliminar archivo"),
  });
}

export function useModerateBodyAnnotation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      moderation_status: ModerationStatus;
      moderation_note?: string | null;
    }) => {
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("body_annotations" as any)
        .update({
          moderation_status: input.moderation_status,
          moderation_note: input.moderation_note ?? null,
          moderated_by: user.id,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-annotations"] });
      toast.success("Moderación actualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al moderar"),
  });
}

export async function getSignedUrl(path: string) {
  const { data } = await supabase.storage.from("body-annotations").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

export const BODY_PARTS_LABEL: Record<string, string> = {
  cabeza: "Cabeza",
  cuello: "Cuello",
  torso: "Torso",
  abdomen: "Abdomen",
  pelvis: "Pelvis",
  "brazo-izq": "Brazo izquierdo",
  "brazo-der": "Brazo derecho",
  "antebrazo-izq": "Antebrazo izquierdo",
  "antebrazo-der": "Antebrazo derecho",
  "mano-izq": "Mano izquierda",
  "mano-der": "Mano derecha",
  "muslo-izq": "Muslo izquierdo",
  "muslo-der": "Muslo derecho",
  "pierna-izq": "Pierna izquierda",
  "pierna-der": "Pierna derecha",
  "pie-izq": "Pie izquierdo",
  "pie-der": "Pie derecho",
  "espalda-superior": "Espalda superior",
  "espalda-inferior": "Espalda inferior",
  gluteos: "Glúteos",
  otro: "Otra zona",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
};

export const MODERATION_LABEL: Record<ModerationStatus, string> = {
  pendiente: "Pendiente",
  validada: "Validada",
  observada: "En observación",
  rechazada: "Rechazada",
};
