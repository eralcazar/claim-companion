import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MonitorThreshold = {
  id: string;
  patient_id: string;
  monitor_type: string;
  min_val: number | null;
  max_val: number | null;
  outlier_z: number | null;
  min_readings_per_day: number | null;
  date_from: string | null;
  date_to: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const MONITOR_TYPES = [
  { key: "heart_rate", label: "Frecuencia cardíaca", unit: "bpm", defMin: 40, defMax: 180 },
  { key: "sleep", label: "Sueño", unit: "h", defMin: 5, defMax: 10 },
  { key: "steps", label: "Pasos", unit: "pasos", defMin: 1000, defMax: 30000 },
  { key: "spo2", label: "SpO₂", unit: "%", defMin: 90, defMax: 100 },
  { key: "systolic", label: "Presión sistólica", unit: "mmHg", defMin: 90, defMax: 160 },
  { key: "diastolic", label: "Presión diastólica", unit: "mmHg", defMin: 55, defMax: 100 },
  { key: "glucose", label: "Glucosa", unit: "mg/dL", defMin: 70, defMax: 180 },
  { key: "temperature", label: "Temperatura", unit: "°C", defMin: 35.5, defMax: 38 },
] as const;

export function useMyThresholds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient_monitor_thresholds", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_monitor_thresholds" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MonitorThreshold[];
    },
  });
}

/**
 * Resolve the active threshold for a monitor type at "today".
 * Returns first matching row whose optional date range contains today, else defaults.
 */
export function useResolvedThreshold(monitorType: string) {
  const { data: all = [] } = useMyThresholds();
  const today = new Date().toISOString().slice(0, 10);
  const def = MONITOR_TYPES.find((m) => m.key === monitorType);
  const active = all.find(
    (t) =>
      t.active &&
      t.monitor_type === monitorType &&
      (!t.date_from || t.date_from <= today) &&
      (!t.date_to || t.date_to >= today),
  );
  return {
    hardLow: active?.min_val ?? def?.defMin ?? null,
    hardHigh: active?.max_val ?? def?.defMax ?? null,
    outlierZ: active?.outlier_z ?? 2.5,
    minReadingsPerDay: active?.min_readings_per_day ?? 1,
    isCustom: !!active,
    row: active ?? null,
  };
}

export function useUpsertThreshold() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<MonitorThreshold>) => {
      const payload = { ...row, patient_id: user!.id };
      const q = row.id
        ? supabase.from("patient_monitor_thresholds" as any).update(payload).eq("id", row.id)
        : supabase.from("patient_monitor_thresholds" as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient_monitor_thresholds"] });
      toast.success("Umbral guardado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useDeleteThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_monitor_thresholds" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient_monitor_thresholds"] });
      toast.success("Eliminado");
    },
  });
}