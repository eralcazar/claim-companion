import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useMedicalAlerts(patientId?: string, onlyActive = true) {
  return useQuery({
    queryKey: ["medical_alerts", patientId, onlyActive],
    enabled: !!patientId,
    queryFn: async () => {
      let q = supabase.from("medical_alerts" as any).select("*").eq("patient_id", patientId!).order("created_at", { ascending: false });
      if (onlyActive) q = q.eq("activa", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("medical_alerts" as any).insert({ ...payload, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical_alerts"] });
      toast.success("Alerta creada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al crear alerta"),
  });
}

export function useToggleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, activa }: { id: string; activa: boolean }) => {
      const { error } = await supabase.from("medical_alerts" as any).update({ activa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medical_alerts"] }),
  });
}

export function useAuditLogs(patientId?: string, limit = 100) {
  return useQuery({
    queryKey: ["audit_logs", patientId, limit],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}