import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Especialidad = {
  id: string;
  nombre: string;
  activa: boolean;
  area?: string | null;
  sector?: string | null;
  pais?: string | null;
};

export function useEspecialidades() {
  return useQuery({
    queryKey: ["especialidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidades")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data as Especialidad[];
    },
  });
}

export function useUpsertEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<Especialidad>) => {
      const { error } = await supabase.from("especialidades").upsert(e as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["especialidades"] });
      toast.success("Especialidad guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useDeleteEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("especialidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["especialidades"] });
      toast.success("Especialidad eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useEspecialidadFavoritos() {
  return useQuery({
    queryKey: ["especialidad-favoritos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidad_favoritos")
        .select("especialidad_id");
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.especialidad_id as string));
    },
  });
}

export function useToggleEspecialidadFavorito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, favorito }: { id: string; favorito: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sin sesión");
      if (favorito) {
        const { error } = await supabase
          .from("especialidad_favoritos")
          .delete()
          .eq("user_id", uid)
          .eq("especialidad_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("especialidad_favoritos")
          .insert({ user_id: uid, especialidad_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["especialidad-favoritos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}