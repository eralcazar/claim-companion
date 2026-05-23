import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useProcedureRecurrences(patientId?: string) {
  return useQuery({
    queryKey: ["proc_recurrences", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_recurrences" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useUpsertRecurrence() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("procedure_recurrences" as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("procedure_recurrences" as any).insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proc_recurrences"] });
      qc.invalidateQueries({ queryKey: ["proc_sessions"] });
      toast.success("Recurrencia guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useDeleteRecurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("procedure_recurrences" as any).update({ vigente: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proc_recurrences"] });
      toast.success("Recurrencia desactivada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}