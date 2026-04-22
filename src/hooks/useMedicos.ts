import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Medico = {
  id: string;
  user_id: string;
  cedula_general: string | null;
  telefono_consultorio: string | null;
  direccion_consultorio: string | null;
  nombre_consultorio?: string | null;
  email_consultorio?: string | null;
  horario_atencion?: string | null;
  consultorio_calle?: string | null;
  consultorio_numero?: string | null;
  consultorio_colonia?: string | null;
  consultorio_cp?: string | null;
  consultorio_municipio?: string | null;
  consultorio_estado?: string | null;
  foto_path?: string | null;
};

export type MedicoEspecialidad = {
  id: string;
  medico_id: string;
  especialidad_id: string;
  cedula_especialidad: string | null;
};

export type MedicoDocumento = {
  id: string;
  medico_id: string;
  tipo: "ine" | "cedula_general" | "cedula_especialidad" | string;
  especialidad_id: string | null;
  file_path: string;
  file_name: string;
  created_at: string;
};

export type MedicoUserRow = {
  user_id: string;
  full_name: string;
  email: string;
  medico: Medico | null;
};

/** Lists all users with role='medico' and joins their medicos row (admin view). */
export function useMedicoUsers() {
  return useQuery({
    queryKey: ["medico-users"],
    queryFn: async (): Promise<MedicoUserRow[]> => {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "medico");
      if (rErr) throw rErr;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles, error: pErr }, { data: medicos, error: mErr }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", ids),
          supabase.from("medicos").select("*").in("user_id", ids),
        ]);
      if (pErr) throw pErr;
      if (mErr) throw mErr;
      return ids.map((uid) => {
        const p = profiles?.find((x) => x.user_id === uid);
        const m = medicos?.find((x) => x.user_id === uid) ?? null;
        return {
          user_id: uid,
          full_name: p?.full_name ?? "(sin nombre)",
          email: p?.email ?? "",
          medico: (m as Medico) ?? null,
        };
      });
    },
  });
}

export function useMedicoByUser(userId: string | null) {
  return useQuery({
    queryKey: ["medico-by-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicos")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Medico | null;
    },
  });
}

export function useMedicoEspecialidades(medicoId: string | null) {
  return useQuery({
    queryKey: ["medico-especialidades", medicoId],
    enabled: !!medicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medico_especialidades")
        .select("*")
        .eq("medico_id", medicoId!);
      if (error) throw error;
      return data as MedicoEspecialidad[];
    },
  });
}

export function useMedicoDocumentos(medicoId: string | null) {
  return useQuery({
    queryKey: ["medico-documentos", medicoId],
    enabled: !!medicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medico_documentos")
        .select("*")
        .eq("medico_id", medicoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MedicoDocumento[];
    },
  });
}

export function useUpsertMedico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<Medico> & { user_id: string }) => {
      // upsert by user_id (one row per user)
      const existing = await supabase
        .from("medicos")
        .select("id")
        .eq("user_id", m.user_id)
        .maybeSingle();
      if (existing.data?.id) {
        const { error } = await supabase
          .from("medicos")
          .update(m)
          .eq("id", existing.data.id);
        if (error) throw error;
        return existing.data.id;
      }
      const { data, error } = await supabase
        .from("medicos")
        .insert(m as any)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicos"] });
      qc.invalidateQueries({ queryKey: ["medico-users"] });
      qc.invalidateQueries({ queryKey: ["medico-by-user"] });
      toast.success("Datos del médico guardados");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useAddMedicoEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      medico_id: string;
      especialidad_id: string;
      cedula_especialidad?: string | null;
    }) => {
      const { error } = await supabase.from("medico_especialidades").insert(row as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["medico-especialidades", vars.medico_id] });
      toast.success("Especialidad agregada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al agregar"),
  });
}

export function useUpdateMedicoEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      id: string;
      medico_id: string;
      cedula_especialidad: string | null;
    }) => {
      const { error } = await supabase
        .from("medico_especialidades")
        .update({ cedula_especialidad: row.cedula_especialidad })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["medico-especialidades", vars.medico_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useRemoveMedicoEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; medico_id: string }) => {
      const { error } = await supabase
        .from("medico_especialidades")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["medico-especialidades", vars.medico_id] });
      toast.success("Especialidad eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useUploadMedicoDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      medico_id: string;
      tipo: string;
      especialidad_id?: string | null;
      file: File;
    }) => {
      const ext = params.file.name.split(".").pop() ?? "pdf";
      const path = `${params.medico_id}/${params.tipo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("medicos")
        .upload(path, params.file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase.from("medico_documentos").insert({
        medico_id: params.medico_id,
        tipo: params.tipo,
        especialidad_id: params.especialidad_id ?? null,
        file_path: path,
        file_name: params.file.name,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["medico-documentos", vars.medico_id] });
      toast.success("Documento subido");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al subir"),
  });
}

export function useDeleteMedicoDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: MedicoDocumento) => {
      await supabase.storage.from("medicos").remove([doc.file_path]);
      const { error } = await supabase
        .from("medico_documentos")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: (_, doc) => {
      qc.invalidateQueries({ queryKey: ["medico-documentos", doc.medico_id] });
      toast.success("Documento eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export async function getMedicoDocSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("medicos")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}