import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useProcedureSessions(patientId?: string) {
  return useQuery({
    queryKey: ["proc_sessions", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_sessions" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useUpsertSession() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("procedure_sessions" as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("procedure_sessions" as any).insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proc_sessions"] });
      toast.success("Sesión guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

/** Materializa sesiones desde las recurrencias vigentes a las próximas N semanas. Idempotente. */
export async function materializeSessions(
  patientId: string,
  userId: string,
  recurrences: any[],
  expander: (rrule: string, start: Date, hora: string, from: Date, to: Date, end?: Date | null) => Date[],
  weeks = 4,
) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7 * weeks);

  const { data: existing } = await supabase
    .from("procedure_sessions" as any)
    .select("recurrence_id, scheduled_at")
    .eq("patient_id", patientId)
    .gte("scheduled_at", from.toISOString())
    .lte("scheduled_at", to.toISOString());
  const existingKey = new Set((existing ?? []).map((r: any) => `${r.recurrence_id}|${new Date(r.scheduled_at).toISOString()}`));

  const rows: any[] = [];
  for (const rec of recurrences) {
    if (!rec.vigente) continue;
    const startDate = new Date(rec.fecha_inicio);
    const endDate = rec.fecha_fin ? new Date(rec.fecha_fin) : null;
    const dates = expander(rec.rrule, startDate, rec.hora_inicio, from, to, endDate);
    for (const d of dates) {
      const key = `${rec.id}|${d.toISOString()}`;
      if (existingKey.has(key)) continue;
      rows.push({
        patient_id: patientId,
        recurrence_id: rec.id,
        scheduled_at: d.toISOString(),
        status: "programada",
        created_by: userId,
      });
    }
  }
  if (rows.length) {
    const { error } = await supabase.from("procedure_sessions" as any).insert(rows);
    if (error) throw error;
  }
  return rows.length;
}