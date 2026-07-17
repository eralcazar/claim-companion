import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { maybeNotifyOutOfRange } from "./useHrAlerts";

export type HrContext = "reposo" | "ejercicio" | "post_cita" | "otro";

export type HrRow = {
  id: string;
  patient_id: string;
  bpm: number;
  measured_at: string;
  context: string | null;
  notes: string | null;
  source: string | null;
  device_name: string | null;
};

export type HrInsert = {
  bpm: number;
  measured_at: string;
  context?: HrContext | null;
  notes?: string | null;
  source?: string;
  device_name?: string | null;
};

export function classifyHR(bpm: number): { label: string; className: string } {
  if (bpm < 40) return { label: "Bradicardia severa", className: "bg-destructive text-destructive-foreground" };
  if (bpm < 60) return { label: "Bradicardia", className: "bg-warning text-warning-foreground" };
  if (bpm <= 100) return { label: "Normal", className: "bg-success/15 text-success" };
  if (bpm <= 120) return { label: "Elevada", className: "bg-warning text-warning-foreground" };
  return { label: "Taquicardia", className: "bg-destructive text-destructive-foreground" };
}

export function useHeartRateReadings(patientId?: string, limit = 200) {
  return useQuery({
    queryKey: ["heart_rate_readings", patientId, limit],
    enabled: !!patientId,
    queryFn: async (): Promise<HrRow[]> => {
      const { data, error } = await supabase
        .from("heart_rate_readings")
        .select("id, patient_id, bpm, measured_at, context, notes, source, device_name")
        .eq("patient_id", patientId!)
        .order("measured_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as HrRow[];
    },
  });
}

export function useCreateHeartRate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: HrInsert) => {
      if (!user?.id) throw new Error("No hay sesión");
      const { error } = await supabase.from("heart_rate_readings").insert({
        patient_id: user.id,
        bpm: row.bpm,
        measured_at: row.measured_at,
        context: row.context ?? null,
        notes: row.notes ?? null,
        source: row.source ?? "manual",
        device_name: row.device_name ?? null,
      });
      if (error) throw error;
      await maybeNotifyOutOfRange({
        userId: user.id,
        bpm: row.bpm,
        measured_at: row.measured_at,
        source: row.source ?? "manual",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["heart_rate_readings"] });
      qc.invalidateQueries({ queryKey: ["unified-readings"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useBulkInsertHeartRate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rows: HrInsert[]) => {
      if (!user?.id) throw new Error("No hay sesión");
      if (!rows.length) return { inserted: 0 };
      const batches: HrInsert[][] = [];
      for (let i = 0; i < rows.length; i += 100) batches.push(rows.slice(i, i + 100));
      let inserted = 0;
      for (const b of batches) {
        const { error, count } = await supabase
          .from("heart_rate_readings")
          .insert(
            b.map((r) => ({
              patient_id: user.id,
              bpm: r.bpm,
              measured_at: r.measured_at,
              context: r.context ?? null,
              notes: r.notes ?? null,
              source: r.source ?? "csv",
              device_name: r.device_name ?? null,
            })),
            { count: "exact" },
          );
        if (error) throw error;
        inserted += count ?? b.length;
      }
      return { inserted };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["heart_rate_readings"] });
      qc.invalidateQueries({ queryKey: ["unified-readings"] });
    },
  });
}