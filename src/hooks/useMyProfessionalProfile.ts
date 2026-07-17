import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MyProfile = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  titulo: string | null;
  tipo: string;
  bio: string | null;
  foto_url: string | null;
  cedula_profesional: string | null;
  anos_experiencia: number | null;
  idiomas: string[] | null;
  seguros_aceptados: string[] | null;
  precio_consulta_centavos: number | null;
  acepta_video: boolean;
  acepta_domicilio: boolean;
  acepta_presencial: boolean;
  telefono_publico: string | null;
  whatsapp_publico: string | null;
  website: string | null;
  estado_publicacion: "borrador" | "pendiente" | "publicado" | "rechazado";
  motivo_rechazo: string | null;
  publicado: boolean;
  verificado: boolean;
  enviado_revision_at: string | null;
  revisado_at: string | null;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function useMyProfessionalProfile() {
  return useQuery({
    queryKey: ["my-professional-profile"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("professional_profiles")
        .select(
          `*,
           professional_specialties(specialty_id, es_principal, specialty:specialties(id, slug, nombre)),
           professional_locations(*)`
        )
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCreateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { display_name: string; tipo: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("No autenticado");
      const baseSlug = slugify(input.display_name) || `pro-${uid.slice(0, 6)}`;
      const slug = `${baseSlug}-${uid.slice(0, 4)}`;
      const { data, error } = await supabase
        .from("professional_profiles")
        .insert({
          user_id: uid,
          slug,
          display_name: input.display_name,
          tipo: input.tipo,
          estado_publicacion: "borrador",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Perfil creado en borrador");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MyProfile> }) => {
      const { error } = await supabase.from("professional_profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Guardado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("professional_profiles")
        .update({ estado_publicacion: "pendiente" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Enviado a revisión");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useWithdrawProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("professional_profiles")
        .update({ estado_publicacion: "borrador" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Perfil regresado a borrador");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// LOCATIONS
export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: any) => {
      if (loc.id) {
        const { id, ...patch } = loc;
        const { error } = await supabase.from("professional_locations").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professional_locations").insert(loc);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Ubicación guardada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professional_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Ubicación eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// SPECIALTIES
export function useSetSpecialties() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      professionalId,
      specialtyIds,
      principalId,
    }: {
      professionalId: string;
      specialtyIds: string[];
      principalId: string | null;
    }) => {
      await supabase.from("professional_specialties").delete().eq("professional_id", professionalId);
      if (specialtyIds.length === 0) return;
      const rows = specialtyIds.map((sid) => ({
        professional_id: professionalId,
        specialty_id: sid,
        es_principal: sid === principalId,
      }));
      const { error } = await supabase.from("professional_specialties").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-professional-profile"] });
      toast.success("Especialidades actualizadas");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ADMIN
export function usePendingMarketplaceProfiles() {
  return useQuery({
    queryKey: ["admin-marketplace-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select(
          `id, slug, display_name, tipo, titulo, bio, foto_url, cedula_profesional,
           estado_publicacion, motivo_rechazo, enviado_revision_at, revisado_at, verificado,
           professional_specialties(specialty:specialties(nombre)),
           professional_locations(ciudad, direccion)`
        )
        .in("estado_publicacion", ["pendiente", "publicado", "rechazado"])
        .order("enviado_revision_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReviewProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      motivo,
      verificado,
    }: {
      id: string;
      decision: "publicado" | "rechazado";
      motivo?: string;
      verificado?: boolean;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const patch: any = {
        estado_publicacion: decision,
        motivo_rechazo: decision === "rechazado" ? motivo ?? "Sin motivo" : null,
        revisado_por: userRes.user?.id ?? null,
      };
      if (typeof verificado === "boolean") patch.verificado = verificado;
      const { error } = await supabase.from("professional_profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace-pending"] });
      toast.success("Decisión guardada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}