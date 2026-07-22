import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useHomeVisits(opts: { patientId?: string; doctorId?: string; soloPendientes?: boolean } = {}) {
  return useQuery({
    queryKey: ["home_visits", opts],
    queryFn: async () => {
      let q = supabase.from("home_visit_requests" as any).select("*").order("created_at", { ascending: false });
      if (opts.patientId) q = q.eq("patient_id", opts.patientId);
      if (opts.doctorId) q = q.eq("doctor_id", opts.doctorId);
      if (opts.soloPendientes) q = q.eq("estado", "pendiente");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateHomeVisit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("home_visit_requests" as any).insert({
        ...payload,
        requested_by: user!.id,
        patient_id: payload.patient_id ?? user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home_visits"] });
      toast.success("Solicitud enviada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useUpdateHomeVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await supabase.from("home_visit_requests" as any).update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home_visits"] });
      toast.success("Actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useAcceptHomeVisit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("home_visit_requests" as any)
        .update({ estado: "aceptada", doctor_id: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home_visits"] });
      toast.success("Solicitud aceptada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useRejectHomeVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("home_visit_requests" as any)
        .update({ estado: "rechazada", motivo_rechazo: motivo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home_visits"] });
      toast.success("Solicitud rechazada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useSetHomeVisitState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase
        .from("home_visit_requests" as any)
        .update({ estado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_visits"] }),
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export type HomeVisitEvent = {
  id: string;
  visit_id: string;
  actor_id: string | null;
  event: string;
  metadata: Record<string, any>;
  created_at: string;
};

export function useVisitEvents(visitId: string | null | undefined) {
  return useQuery({
    queryKey: ["home_visit_events", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_visit_events" as any)
        .select("*")
        .eq("visit_id", visitId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HomeVisitEvent[];
    },
  });
}