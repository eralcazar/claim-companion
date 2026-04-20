import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Especialidad = {
  id: string;
  nombre: string;
  activa: boolean;
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