import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useSurgeries(patientId?: string) {
  return useQuery({
    queryKey: ["surgeries", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surgeries" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useUpsertSurgery() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("surgeries" as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("surgeries" as any).insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surgeries"] });
      toast.success("Cirugía guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useDeleteSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surgeries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surgeries"] });
      toast.success("Cirugía eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}