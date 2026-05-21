import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TemperatureReading {
  id: string;
  patient_id: string;
  taken_at: string;
  temperature_c: number;
  method: string | null;
  context: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TempCategory {
  key: "hipotermia" | "normal" | "febricula" | "fiebre" | "fiebre_alta";
  label: string;
  className: string;
}

export function classifyTemperature(t: number): TempCategory {
  if (t < 35) return { key: "hipotermia", label: "Hipotermia", className: "bg-destructive text-destructive-foreground" };
  if (t < 37.5) return { key: "normal", label: "Normal", className: "bg-success/15 text-success" };
  if (t < 38) return { key: "febricula", label: "Febrícula", className: "bg-warning text-warning-foreground" };
  if (t < 39.5) return { key: "fiebre", label: "Fiebre", className: "bg-destructive/80 text-destructive-foreground" };
  return { key: "fiebre_alta", label: "Fiebre alta", className: "bg-destructive text-destructive-foreground" };
}

export function useTemperatureReadings(patientId: string | undefined) {
  return useQuery({
    queryKey: ["temperature_readings", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temperature_readings" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TemperatureReading[];
    },
  });
}

export interface TemperatureInput {
  patient_id: string;
  taken_at: string;
  temperature_c: number;
  method?: string | null;
  context?: string | null;
  notes?: string | null;
}

export function useCreateTemperature() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: TemperatureInput) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("temperature_readings" as any).insert({
        ...input,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["temperature_readings", vars.patient_id] });
      toast.success("Lectura registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useDeleteTemperature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patient_id: string }) => {
      const { error } = await supabase.from("temperature_readings" as any).delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["temperature_readings", vars.patient_id] });
      toast.success("Lectura eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}