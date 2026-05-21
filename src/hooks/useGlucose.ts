import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type GlucoseContext = "ayuno" | "pre_comida" | "postprandial" | "aleatoria";

export interface GlucoseReading {
  id: string;
  patient_id: string;
  taken_at: string;
  glucose_mgdl: number;
  measurement_context: GlucoseContext;
  hours_since_meal: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GlucCategory {
  key: "hipo" | "normal" | "prediabetes" | "diabetes";
  label: string;
  className: string;
}

export function classifyGlucose(value: number, context: GlucoseContext): GlucCategory {
  if (value < 70) return { key: "hipo", label: "Hipoglucemia", className: "bg-destructive text-destructive-foreground" };
  if (context === "postprandial") {
    if (value < 140) return { key: "normal", label: "Normal", className: "bg-success/15 text-success" };
    if (value < 200) return { key: "prediabetes", label: "Alterada", className: "bg-warning text-warning-foreground" };
    return { key: "diabetes", label: "Diabetes", className: "bg-destructive/80 text-destructive-foreground" };
  }
  // ayuno / pre_comida / aleatoria
  if (value < 100) return { key: "normal", label: "Normal", className: "bg-success/15 text-success" };
  if (value < 126) return { key: "prediabetes", label: "Prediabetes", className: "bg-warning text-warning-foreground" };
  return { key: "diabetes", label: "Diabetes", className: "bg-destructive/80 text-destructive-foreground" };
}

export function useGlucoseReadings(patientId: string | undefined) {
  return useQuery({
    queryKey: ["glucose_readings", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glucose_readings" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GlucoseReading[];
    },
  });
}

export interface GlucoseInput {
  patient_id: string;
  taken_at: string;
  glucose_mgdl: number;
  measurement_context: GlucoseContext;
  hours_since_meal?: number | null;
  notes?: string | null;
}

export function useCreateGlucose() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: GlucoseInput) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("glucose_readings" as any).insert({
        ...input,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["glucose_readings", vars.patient_id] });
      toast.success("Lectura registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useDeleteGlucose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string }) => {
      const { error } = await supabase.from("glucose_readings" as any).delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["glucose_readings", vars.patient_id] });
      toast.success("Lectura eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}