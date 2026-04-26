import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SpO2Reading {
  id: string;
  patient_id: string;
  taken_at: string;
  spo2: number;
  pulse: number | null;
  context: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SpO2Category {
  key: "normal" | "bajo" | "critico" | "emergencia";
  label: string;
  /** Tailwind classes using semantic tokens */
  className: string;
}

/**
 * Clasificación clínica básica de saturación de oxígeno (SpO2).
 */
export function classifySpO2(spo2: number): SpO2Category {
  if (spo2 < 85) {
    return { key: "emergencia", label: "Emergencia", className: "bg-destructive text-destructive-foreground" };
  }
  if (spo2 < 90) {
    return { key: "critico", label: "Crítico", className: "bg-destructive/80 text-destructive-foreground" };
  }
  if (spo2 < 95) {
    return { key: "bajo", label: "Bajo", className: "bg-warning text-warning-foreground" };
  }
  return { key: "normal", label: "Normal", className: "bg-success/15 text-success" };
}

export function useSpO2Readings(patientId: string | undefined) {
  return useQuery({
    queryKey: ["spo2_readings", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spo2_readings" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SpO2Reading[];
    },
  });
}

export interface SpO2Input {
  patient_id: string;
  taken_at: string;
  spo2: number;
  pulse?: number | null;
  context?: string | null;
  notes?: string | null;
}

export function useCreateSpO2() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: SpO2Input) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("spo2_readings" as any).insert({
        ...input,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["spo2_readings", vars.patient_id] });
      toast.success("Lectura registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useUpdateSpO2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string } & Partial<SpO2Input>) => {
      const { id, patient_id, ...patch } = input;
      const { error } = await supabase
        .from("spo2_readings" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["spo2_readings", vars.patient_id] });
      toast.success("Lectura actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteSpO2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string }) => {
      const { error } = await supabase
        .from("spo2_readings" as any)
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["spo2_readings", vars.patient_id] });
      toast.success("Lectura eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}