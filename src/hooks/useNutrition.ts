import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NutritionMetric {
  id: string;
  patient_id: string;
  recorded_at: string;
  peso_kg: number | null;
  peso_seco_kg: number | null;
  talla_cm: number | null;
  imc: number | null;
  masa_muscular_kg: number | null;
  grasa_corporal_pct: number | null;
  agua_corporal_pct: number | null;
  cintura_cm: number | null;
  cadera_cm: number | null;
  notas: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FoodTrafficItem {
  id: string;
  patient_id: string | null;
  alimento: string;
  grupo: string | null;
  color: "verde" | "amarillo" | "rojo";
  notas: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IMCCategory {
  key: "bajo" | "normal" | "sobrepeso" | "obesidad1" | "obesidad2" | "obesidad3";
  label: string;
  className: string;
}

export function classifyIMC(imc: number | null | undefined): IMCCategory | null {
  if (imc == null || isNaN(imc as number)) return null;
  if (imc < 18.5) return { key: "bajo", label: "Bajo peso", className: "bg-warning/60 text-warning-foreground" };
  if (imc < 25) return { key: "normal", label: "Normal", className: "bg-success/15 text-success" };
  if (imc < 30) return { key: "sobrepeso", label: "Sobrepeso", className: "bg-warning text-warning-foreground" };
  if (imc < 35) return { key: "obesidad1", label: "Obesidad I", className: "bg-destructive/70 text-destructive-foreground" };
  if (imc < 40) return { key: "obesidad2", label: "Obesidad II", className: "bg-destructive/85 text-destructive-foreground" };
  return { key: "obesidad3", label: "Obesidad III", className: "bg-destructive text-destructive-foreground" };
}

// ---------- Métricas ----------

export function useNutritionMetrics(patientId: string | undefined) {
  return useQuery({
    queryKey: ["nutrition_metrics", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_metrics" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NutritionMetric[];
    },
  });
}

type NutritionMetricInput = Omit<
  NutritionMetric,
  "id" | "created_at" | "updated_at" | "created_by" | "imc"
> & { imc?: number | null };

export function useCreateNutritionMetric() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: NutritionMetricInput) => {
      if (!user) throw new Error("No autenticado");
      const payload = { ...input, created_by: user.id };
      const { data, error } = await supabase
        .from("nutrition_metrics" as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["nutrition_metrics", vars.patient_id] });
      toast.success("Medición registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al registrar"),
  });
}

export function useUpdateNutritionMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NutritionMetricInput> }) => {
      const { data, error } = await supabase
        .from("nutrition_metrics" as any)
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition_metrics"] });
      toast.success("Medición actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteNutritionMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_metrics" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition_metrics"] });
      toast.success("Medición eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

// ---------- Semáforo de alimentos ----------

export function useFoodTraffic(patientId?: string) {
  return useQuery({
    queryKey: ["food_traffic", patientId ?? "global"],
    queryFn: async () => {
      let q = supabase.from("nutrition_food_traffic" as any).select("*");
      if (patientId) {
        q = q.or(`patient_id.is.null,patient_id.eq.${patientId}`);
      } else {
        q = q.is("patient_id", null);
      }
      const { data, error } = await q.order("color").order("alimento");
      if (error) throw error;
      return (data ?? []) as unknown as FoodTrafficItem[];
    },
  });
}

type FoodTrafficInput = Omit<FoodTrafficItem, "id" | "created_at" | "updated_at" | "created_by">;

export function useCreateFoodTraffic() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: FoodTrafficInput) => {
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("nutrition_food_traffic" as any)
        .insert({ ...input, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food_traffic"] });
      toast.success("Alimento agregado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useUpdateFoodTraffic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FoodTrafficInput> }) => {
      const { data, error } = await supabase
        .from("nutrition_food_traffic" as any)
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food_traffic"] });
      toast.success("Alimento actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteFoodTraffic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_food_traffic" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food_traffic"] });
      toast.success("Alimento eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}