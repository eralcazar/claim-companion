import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BloodPressureReading {
  id: string;
  patient_id: string;
  taken_at: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  position: string | null;
  arm: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BPCategory {
  key: "normal" | "elevada" | "hta1" | "hta2" | "crisis";
  label: string;
  /** Tailwind classes using semantic tokens */
  className: string;
}

/**
 * Clasificación basada en guía AHA 2017.
 */
export function classifyBP(systolic: number, diastolic: number): BPCategory {
  if (systolic >= 180 || diastolic >= 120) {
    return { key: "crisis", label: "Crisis", className: "bg-destructive text-destructive-foreground" };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { key: "hta2", label: "HTA-2", className: "bg-destructive/80 text-destructive-foreground" };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return { key: "hta1", label: "HTA-1", className: "bg-warning text-warning-foreground" };
  }
  if (systolic >= 120) {
    return { key: "elevada", label: "Elevada", className: "bg-warning/60 text-warning-foreground" };
  }
  return { key: "normal", label: "Normal", className: "bg-success/15 text-success" };
}

export function useBloodPressureReadings(patientId: string | undefined) {
  return useQuery({
    queryKey: ["blood_pressure_readings", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_pressure_readings" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BloodPressureReading[];
    },
  });
}

export interface BPInput {
  patient_id: string;
  taken_at: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  position?: string | null;
  arm?: string | null;
  notes?: string | null;
}

export function useCreateBloodPressure() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BPInput) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("blood_pressure_readings" as any).insert({
        ...input,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["blood_pressure_readings", vars.patient_id] });
      toast.success("Toma registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useUpdateBloodPressure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string } & Partial<BPInput>) => {
      const { id, patient_id, ...patch } = input;
      const { error } = await supabase
        .from("blood_pressure_readings" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["blood_pressure_readings", vars.patient_id] });
      toast.success("Toma actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteBloodPressure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string }) => {
      const { error } = await supabase
        .from("blood_pressure_readings" as any)
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["blood_pressure_readings", vars.patient_id] });
      toast.success("Toma eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}