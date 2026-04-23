import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type BpReminderMode = "interval" | "daily_times" | "weekly";

export interface BpReminder {
  id: string;
  patient_id: string;
  created_by: string;
  mode: BpReminderMode;
  interval_hours: number | null;
  daily_times: string[] | null;
  weekdays: number[] | null;
  timezone: string;
  label: string | null;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  next_run_at: string;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BpReminderInput {
  patient_id: string;
  mode: BpReminderMode;
  interval_hours?: number | null;
  daily_times?: string[];
  weekdays?: number[];
  timezone?: string;
  label?: string | null;
  active?: boolean;
  starts_at?: string;
  ends_at?: string | null;
}

export const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
export const WEEKDAY_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City";
  } catch {
    return "America/Mexico_City";
  }
}

/** Calcula próxima ejecución cliente-side (mismo algoritmo que la edge function, simplificado). */
function computeNextRun(input: BpReminderInput, from = new Date()): Date {
  const tz = input.timezone || defaultTimezone();
  if (input.mode === "interval") {
    const ms = (input.interval_hours ?? 1) * 3600_000;
    const start = input.starts_at ? new Date(input.starts_at).getTime() : from.getTime();
    if (start > from.getTime()) return new Date(start);
    const elapsed = from.getTime() - start;
    const steps = Math.floor(elapsed / ms) + 1;
    return new Date(start + steps * ms);
  }
  const times = (input.daily_times ?? [])
    .map((t) => t.split(":").map(Number))
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
  if (times.length === 0) return new Date(from.getTime() + 86400_000);

  const weekdays =
    input.mode === "weekly" && input.weekdays && input.weekdays.length > 0
      ? new Set(input.weekdays)
      : null;

  for (let off = 0; off < 14; off++) {
    const base = new Date(from);
    base.setDate(base.getDate() + off);
    if (weekdays && !weekdays.has(base.getDay())) continue;
    for (const [h, m] of times) {
      const cand = new Date(base);
      cand.setHours(h, m, 0, 0);
      if (cand.getTime() > from.getTime()) {
        // ignoramos TZ explícita en cliente: se recalcula servidor
        return cand;
      }
    }
  }
  void tz;
  return new Date(from.getTime() + 86400_000);
}

export function useBpReminders(patientId: string | undefined) {
  return useQuery({
    queryKey: ["bp_reminder_schedules", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bp_reminder_schedules" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BpReminder[];
    },
  });
}

export function useCreateBpReminder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BpReminderInput) => {
      if (!user) throw new Error("No autenticado");
      const tz = input.timezone || defaultTimezone();
      const next = computeNextRun({ ...input, timezone: tz });
      const { error } = await supabase.from("bp_reminder_schedules" as any).insert({
        patient_id: input.patient_id,
        created_by: user.id,
        mode: input.mode,
        interval_hours: input.mode === "interval" ? input.interval_hours ?? null : null,
        daily_times: input.mode === "interval" ? [] : input.daily_times ?? [],
        weekdays: input.mode === "weekly" ? input.weekdays ?? [] : [],
        timezone: tz,
        label: input.label ?? null,
        active: input.active ?? true,
        starts_at: input.starts_at ?? new Date().toISOString(),
        ends_at: input.ends_at ?? null,
        next_run_at: next.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["bp_reminder_schedules", vars.patient_id] });
      toast.success("Recordatorio creado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al crear recordatorio"),
  });
}

export function useUpdateBpReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string } & Partial<BpReminderInput>) => {
      const { id, patient_id, ...patch } = input;
      const update: Record<string, unknown> = { ...patch };
      // Si cambia configuración relevante, recalcular next_run_at
      if (
        patch.mode !== undefined ||
        patch.interval_hours !== undefined ||
        patch.daily_times !== undefined ||
        patch.weekdays !== undefined ||
        patch.starts_at !== undefined ||
        patch.timezone !== undefined
      ) {
        // Necesitamos el snapshot actual; lo obtenemos:
        const { data: current } = await supabase
          .from("bp_reminder_schedules" as any)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        const merged: BpReminderInput = {
          patient_id,
          mode: (patch.mode ?? (current as any)?.mode) as BpReminderMode,
          interval_hours: patch.interval_hours ?? (current as any)?.interval_hours ?? null,
          daily_times: patch.daily_times ?? (current as any)?.daily_times ?? [],
          weekdays: patch.weekdays ?? (current as any)?.weekdays ?? [],
          timezone: patch.timezone ?? (current as any)?.timezone,
          starts_at: patch.starts_at ?? (current as any)?.starts_at,
        };
        update.next_run_at = computeNextRun(merged).toISOString();
      }
      const { error } = await supabase
        .from("bp_reminder_schedules" as any)
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["bp_reminder_schedules", vars.patient_id] });
      toast.success("Recordatorio actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteBpReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string }) => {
      const { error } = await supabase
        .from("bp_reminder_schedules" as any)
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["bp_reminder_schedules", vars.patient_id] });
      toast.success("Recordatorio eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export { defaultTimezone };
