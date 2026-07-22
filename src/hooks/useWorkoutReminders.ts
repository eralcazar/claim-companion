import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type WorkoutReminder = {
  id: string;
  plan_id: string;
  patient_id: string;
  weekday: number;
  hour: number;
  minute: number;
  minutes_before: number;
  channels: { in_app?: boolean; push?: boolean; gcal?: boolean };
  active: boolean;
};

export type ScheduledSession = {
  id: string;
  plan_id: string | null;
  patient_id: string;
  scheduled_at: string;
  target_type: string;
  target_reference: any;
  status: "pending" | "done" | "skipped" | "adjusted";
  session_log_id: string | null;
  reminder_sent_at: string | null;
  gcal_event_id: string | null;
  notes: string | null;
};

export function useReminders(planId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workout_reminders", user?.id, planId],
    enabled: !!user && !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plan_reminders" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .eq("plan_id", planId!)
        .order("weekday");
      if (error) throw error;
      return (data ?? []) as unknown as WorkoutReminder[];
    },
  });
}

export function useUpsertReminder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Partial<WorkoutReminder> & { plan_id: string }) => {
      if (!user) throw new Error("Sin sesión");
      const payload = { ...r, patient_id: user.id };
      const { error } = await supabase.from("workout_plan_reminders" as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recordatorio guardado");
      qc.invalidateQueries({ queryKey: ["workout_reminders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plan_reminders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout_reminders"] }),
  });
}

export function useScheduledSessions(days = 60) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workout_scheduled", user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const from = new Date(); from.setDate(from.getDate() - 7);
      const to = new Date(); to.setDate(to.getDate() + days);
      const { data, error } = await supabase
        .from("workout_sessions_scheduled" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .gte("scheduled_at", from.toISOString())
        .lte("scheduled_at", to.toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return (data ?? []) as unknown as ScheduledSession[];
    },
  });
}

export function useMaterializePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plan_id: string; weeks?: number }) => {
      const { data, error } = await supabase.functions.invoke("workout-plan-materialize", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.created ?? 0} sesiones programadas`);
      qc.invalidateQueries({ queryKey: ["workout_scheduled"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo programar"),
  });
}

export function useApplyAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; accept: boolean; original_notes?: string; new_notes?: string }) => {
      const { error } = await supabase
        .from("workout_sessions_scheduled" as any)
        .update({
          status: input.accept ? "adjusted" : "pending",
          notes: input.accept ? input.new_notes ?? null : input.original_notes ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout_scheduled"] }),
  });
}